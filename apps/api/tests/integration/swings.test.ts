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
});
