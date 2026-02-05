import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config";

const internalClient = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: Boolean(config.s3.endpoint),
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  }
});

const publicClient = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.publicEndpoint ?? config.s3.endpoint,
  forcePathStyle: Boolean(config.s3.publicEndpoint ?? config.s3.endpoint),
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  }
});

export async function createUploadUrl(options: {
  key: string;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: options.key,
    ContentType: options.contentType
  });

  return getSignedUrl(publicClient, command, { expiresIn: 900 });
}

export async function createDownloadUrl(options: {
  key: string;
  expiresIn?: number;
}) {
  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: options.key
  });

  return getSignedUrl(publicClient, command, {
    expiresIn: options.expiresIn ?? 900
  });
}

export async function assertObjectExists(key: string) {
  await internalClient.send(
    new HeadObjectCommand({
      Bucket: config.s3.bucket,
      Key: key
    })
  );
}
