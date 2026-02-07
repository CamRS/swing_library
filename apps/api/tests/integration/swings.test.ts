import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer
} from "@testcontainers/postgresql";
import {
  GenericContainer,
  StartedTestContainer,
  Wait
} from "testcontainers";
import {
  CreateBucketCommand,
  HeadObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import supertest from "supertest";
import path from "node:path";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

let container: StartedPostgreSqlContainer;
let minioContainer: StartedTestContainer;
let s3Client: S3Client;
let request: supertest.SuperTest<supertest.Test>;
let app: Awaited<ReturnType<typeof import("../../src/app").buildApp>>;
let prisma: typeof import("../../src/db").prisma;
const bucketName = "swing-library";
let authToken: string;
let userId: string;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function createSwingForUser(
  ownerId: string,
  visibility: "private" | "unlisted" | "shared" = "private"
) {
  const asset = await prisma.videoAsset.create({
    data: {
      ownerId,
      storageKey: `uploads/${ownerId}/${randomUUID()}`,
      durationMs: 3200,
      frameRate: "60",
      width: 1080,
      height: 1920,
      angle: "down_the_line"
    }
  });

  return prisma.swing.create({
    data: {
      ownerId,
      videoAssetId: asset.id,
      visibility
    }
  });
}

describe("swing uploads", () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:15-alpine").start();

    minioContainer = await new GenericContainer("minio/minio")
      .withEnvironment({
        MINIO_ROOT_USER: "minio",
        MINIO_ROOT_PASSWORD: "minio123"
      })
      .withCommand(["server", "/data", "--console-address", ":9001"])
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    const minioEndpoint = `http://${minioContainer.getHost()}:${minioContainer.getMappedPort(
      9000
    )}`;

    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.PUBLIC_BASE_URL = "http://localhost:4000";
    process.env.S3_ENDPOINT = minioEndpoint;
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY = "minio";
    process.env.S3_SECRET_KEY = "minio123";
    process.env.S3_BUCKET = bucketName;

    s3Client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: minioEndpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY
      }
    });

    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));

    const prismaBin = path.resolve(
      __dirname,
      "..",
      "..",
      "node_modules",
      ".bin",
      "prisma"
    );

    execSync(`${prismaBin} db push --accept-data-loss`, {
      cwd: path.resolve(__dirname, "..", ".."),
      stdio: "inherit",
      env: process.env
    });

    const appModule = await import("../../src/app");
    const dbModule = await import("../../src/db");

    app = await appModule.buildApp({ logger: false });
    await app.ready();
    prisma = dbModule.prisma;
    request = supertest(app.server);

    const registerRes = await request
      .post("/v1/auth/register")
      .send({
        email: "test@swing.local",
        password: "strongpassword"
      })
      .expect(201);

    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
    await minioContainer?.stop();
  });

  it("creates a swing after upload", async () => {
    const uploadRes = await request
      .post("/v1/swings/uploads")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        fileName: "swing.mp4",
        contentType: "video/mp4",
        sizeBytes: 2048,
        durationMs: 3500,
        frameRate: 60,
        width: 1080,
        height: 1920,
        angle: "down_the_line"
      })
      .expect(200);

    expect(uploadRes.body.videoAsset.id).toBeTruthy();

    const uploadResult = await fetch(uploadRes.body.uploadUrl, {
      method: "PUT",
      headers: {
        "content-type": "video/mp4"
      },
      body: Buffer.from("test")
    });

    expect(uploadResult.ok).toBe(true);

    const createRes = await request
      .post("/v1/swings")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        videoAssetId: uploadRes.body.videoAsset.id,
        visibility: "private"
      })
      .expect(201);

    expect(createRes.body.swing.id).toBeTruthy();

    const swings = await prisma.swing.findMany();
    expect(swings.length).toBe(1);

    const listRes = await request
      .get("/v1/swings")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(listRes.body.items.length).toBe(1);
    expect(listRes.body.items[0].previewUrl).toBeTruthy();
    expect(listRes.body.items[0].durationMs).toBe(3500);
    expect(listRes.body.items[0].frameRate).toBeCloseTo(60);
    expect(listRes.body.items[0].width).toBe(1080);
    expect(listRes.body.items[0].height).toBe(1920);

    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: uploadRes.body.videoAsset.storageKey
      })
    );

    expect(head.ContentLength).toBeGreaterThan(0);
  });

  it("lists shared swings from other users by default", async () => {
    const otherRegisterRes = await request
      .post("/v1/auth/register")
      .send({
        email: "other@swing.local",
        password: "strongpassword"
      })
      .expect(201);

    const otherUserId = otherRegisterRes.body.user.id;

    const myAsset = await prisma.videoAsset.create({
      data: {
        ownerId: userId,
        storageKey: `uploads/${userId}/${randomUUID()}`,
        durationMs: 3200,
        frameRate: "60",
        width: 1080,
        height: 1920,
        angle: "down_the_line"
      }
    });

    const otherSharedAsset = await prisma.videoAsset.create({
      data: {
        ownerId: otherUserId,
        storageKey: `uploads/${otherUserId}/${randomUUID()}`,
        durationMs: 3200,
        frameRate: "60",
        width: 1080,
        height: 1920,
        angle: "face_on"
      }
    });

    const otherUnlistedAsset = await prisma.videoAsset.create({
      data: {
        ownerId: otherUserId,
        storageKey: `uploads/${otherUserId}/${randomUUID()}`,
        durationMs: 3200,
        frameRate: "60",
        width: 1080,
        height: 1920,
        angle: "face_on"
      }
    });

    const mySharedSwing = await prisma.swing.create({
      data: {
        ownerId: userId,
        videoAssetId: myAsset.id,
        visibility: "shared"
      }
    });

    const otherSharedSwing = await prisma.swing.create({
      data: {
        ownerId: otherUserId,
        videoAssetId: otherSharedAsset.id,
        visibility: "shared"
      }
    });

    const otherUnlistedSwing = await prisma.swing.create({
      data: {
        ownerId: otherUserId,
        videoAssetId: otherUnlistedAsset.id,
        visibility: "unlisted"
      }
    });

    const listRes = await request
      .get("/v1/swings/shared")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    const ids = listRes.body.items.map((item: { id: string }) => item.id);
    expect(ids).toContain(otherSharedSwing.id);
    expect(ids).not.toContain(otherUnlistedSwing.id);
    expect(ids).not.toContain(mySharedSwing.id);
    expect(
      listRes.body.items.every((item: { previewUrl: string }) => item.previewUrl)
    ).toBe(true);
    expect(
      listRes.body.items.every(
        (item: {
          durationMs: number;
          frameRate: number;
          width: number;
          height: number;
        }) =>
          Number.isFinite(item.durationMs) &&
          Number.isFinite(item.frameRate) &&
          Number.isFinite(item.width) &&
          Number.isFinite(item.height)
      )
    ).toBe(true);
    expect(
      listRes.body.items.every(
        (item: { visibility: string }) => item.visibility === "shared"
      )
    ).toBe(true);
    expect(
      listRes.body.items.every(
        (item: { ownerId: string }) => item.ownerId !== userId
      )
    ).toBe(true);
  });

  it("upserts and lists frame tags for the owner", async () => {
    const swing = await createSwingForUser(userId);

    const firstUpsert = await request
      .put(`/v1/swings/${swing.id}/frame-tags`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        tags: [
          {
            position: "P1",
            frameIndex: 10,
            timestampMs: 167,
            setBy: "user"
          },
          {
            position: "P4",
            frameIndex: 42,
            timestampMs: 700,
            setBy: "ai",
            confidence: 0.91
          }
        ]
      })
      .expect(200);

    expect(firstUpsert.body.tags.length).toBe(2);

    const secondUpsert = await request
      .put(`/v1/swings/${swing.id}/frame-tags`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        tags: [
          {
            position: "P1",
            frameIndex: 14,
            timestampMs: 233,
            setBy: "user"
          },
          {
            position: "P7",
            frameIndex: 64,
            timestampMs: 1067,
            setBy: "user"
          }
        ]
      })
      .expect(200);

    expect(secondUpsert.body.tags.length).toBe(3);
    const p1FromUpsert = secondUpsert.body.tags.find(
      (tag: { position: string }) => tag.position === "P1"
    );
    const p4FromUpsert = secondUpsert.body.tags.find(
      (tag: { position: string }) => tag.position === "P4"
    );
    const p7FromUpsert = secondUpsert.body.tags.find(
      (tag: { position: string }) => tag.position === "P7"
    );

    expect(p1FromUpsert?.frameIndex).toBe(14);
    expect(p1FromUpsert?.timestampMs).toBe(233);
    expect(p4FromUpsert?.confidence).toBeCloseTo(0.91);
    expect(p7FromUpsert?.frameIndex).toBe(64);

    const listRes = await request
      .get(`/v1/swings/${swing.id}/frame-tags`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(listRes.body.tags.length).toBe(3);
    const p4FromList = listRes.body.tags.find(
      (tag: { position: string }) => tag.position === "P4"
    );
    expect(p4FromList?.frameIndex).toBe(42);
    expect(p4FromList?.setBy).toBe("ai");
    expect(p4FromList?.confidence).toBeCloseTo(0.91);
  });

  it("requests analysis and polls until completion", async () => {
    const swing = await createSwingForUser(userId);
    await prisma.swingFrameTag.create({
      data: {
        swingId: swing.id,
        position: "P1",
        frameIndex: 18,
        timestampMs: 300,
        setBy: "user"
      }
    });

    const requestRes = await request
      .post(`/v1/swings/${swing.id}/analysis`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        notes: "Initial analysis request from integration test."
      })
      .expect(202);

    expect(requestRes.body.analysisId).toBeTruthy();
    expect(requestRes.body.status).toBe("queued");

    let completedAnalysis:
      | {
          status: string;
          summary: string;
          recommendations: string[];
          metrics: Record<string, number>;
        }
      | undefined;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const listRes = await request
        .get(`/v1/swings/${swing.id}/analysis`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const current = listRes.body.items.find(
        (item: { id: string }) => item.id === requestRes.body.analysisId
      );
      if (!current) {
        throw new Error("Expected analysis to exist in list response.");
      }
      expect(["queued", "processing", "completed"]).toContain(current.status);

      if (current.status === "completed") {
        completedAnalysis = current;
        break;
      }

      await sleep(250);
    }

    expect(completedAnalysis).toBeTruthy();
    expect(completedAnalysis?.summary).toContain("Captured");
    expect(completedAnalysis?.recommendations.length).toBeGreaterThan(0);
    expect(completedAnalysis?.metrics.taggedPositions).toBe(1);
  });

  it("returns not_found for non-owner analysis access", async () => {
    const otherRegisterRes = await request
      .post("/v1/auth/register")
      .send({
        email: `analysis-${randomUUID()}@swing.local`,
        password: "strongpassword"
      })
      .expect(201);

    const otherSwing = await createSwingForUser(otherRegisterRes.body.user.id);

    await request
      .get(`/v1/swings/${otherSwing.id}/analysis`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);

    await request
      .post(`/v1/swings/${otherSwing.id}/analysis`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({})
      .expect(404);
  });

  it("returns not_found for non-owner frame tag access", async () => {
    const otherRegisterRes = await request
      .post("/v1/auth/register")
      .send({
        email: `frame-tags-${randomUUID()}@swing.local`,
        password: "strongpassword"
      })
      .expect(201);

    const otherUserId = otherRegisterRes.body.user.id;
    const otherSwing = await createSwingForUser(otherUserId);

    await request
      .get(`/v1/swings/${otherSwing.id}/frame-tags`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);

    await request
      .put(`/v1/swings/${otherSwing.id}/frame-tags`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        tags: [
          {
            position: "P1",
            frameIndex: 12,
            timestampMs: 200,
            setBy: "user"
          }
        ]
      })
      .expect(404);
  });
});
