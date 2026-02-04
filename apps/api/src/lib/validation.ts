import type { UploadSwingRequest, Visibility, VideoAngle } from "@swing/shared";

const allowedAngles = new Set<VideoAngle>([
  "down_the_line",
  "face_on",
  "other"
]);
const allowedVisibility = new Set<Visibility>([
  "private",
  "unlisted",
  "shared"
]);

export function validateUploadRequest(body: UploadSwingRequest) {
  const details: Record<string, string> = {};

  if (!body?.fileName) details.fileName = "required";
  if (!body?.contentType) details.contentType = "required";
  if (!body?.sizeBytes || body.sizeBytes <= 0) details.sizeBytes = "invalid";
  if (!body?.durationMs || body.durationMs <= 0) details.durationMs = "invalid";
  if (!body?.frameRate || body.frameRate <= 0) details.frameRate = "invalid";
  if (!body?.width || body.width <= 0) details.width = "invalid";
  if (!body?.height || body.height <= 0) details.height = "invalid";
  if (!body?.angle || !allowedAngles.has(body.angle)) details.angle = "invalid";

  return details;
}

export function isValidVisibility(value: string): value is Visibility {
  return allowedVisibility.has(value as Visibility);
}
