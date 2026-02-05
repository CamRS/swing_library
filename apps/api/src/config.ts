const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 4000);
const publicBaseUrl =
  process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  host,
  port,
  publicBaseUrl,
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    accessKeyId: requireEnv("S3_ACCESS_KEY"),
    secretAccessKey: requireEnv("S3_SECRET_KEY"),
    bucket: requireEnv("S3_BUCKET")
  }
};
