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

let container: StartedPostgreSqlContainer;
let minioContainer: StartedTestContainer;
let s3Client: S3Client;
let request: supertest.SuperTest<supertest.Test>;
let app: Awaited<ReturnType<typeof import("../../src/app").buildApp>>;
let prisma: typeof import("../../src/db").prisma;
const bucketName = "swing-library";
let authToken: string;

describe("swing uploads", () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:15-alpine").start();

    minioContainer = await new GenericContainer("minio/minio")
      .withEnv("MINIO_ROOT_USER", "minio")
      .withEnv("MINIO_ROOT_PASSWORD", "minio123")
      .withCommand(["server", "/data", "--console-address", ":9001"])
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forListeningPort())
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

    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: uploadRes.body.videoAsset.storageKey
      })
    );

    expect(head.ContentLength).toBeGreaterThan(0);
  });
});
