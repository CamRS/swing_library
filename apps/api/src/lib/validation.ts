import type {
  PPosition,
  RequestSwingAnalysisRequest,
  UploadSwingRequest,
  UpsertSwingFrameTagsRequest,
  Visibility,
  VideoAngle
} from "@swing/shared";

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
const allowedPPositions = new Set<PPosition>([
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
  "P7",
  "P8",
  "P9",
  "P10"
]);
const allowedTagSetBy = new Set(["user", "ai"]);

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

export function validateFrameTagsRequest(
  body: UpsertSwingFrameTagsRequest | undefined
) {
  const details: Record<string, string> = {};
  const tags = body?.tags;

  if (!Array.isArray(tags) || tags.length === 0) {
    details.tags = "min_1";
    return details;
  }

  if (tags.length > 10) {
    details.tags = "max_10";
  }

  const seenPositions = new Set<string>();

  tags.forEach((tag, index) => {
    const basePath = `tags[${index}]`;

    if (!allowedPPositions.has(tag.position)) {
      details[`${basePath}.position`] = "invalid";
    } else if (seenPositions.has(tag.position)) {
      details[`${basePath}.position`] = "duplicate";
    } else {
      seenPositions.add(tag.position);
    }

    if (!Number.isInteger(tag.frameIndex) || tag.frameIndex < 0) {
      details[`${basePath}.frameIndex`] = "invalid";
    }

    if (!Number.isInteger(tag.timestampMs) || tag.timestampMs < 0) {
      details[`${basePath}.timestampMs`] = "invalid";
    }

    if (!allowedTagSetBy.has(tag.setBy)) {
      details[`${basePath}.setBy`] = "invalid";
    }

    if (
      tag.confidence != null &&
      (!Number.isFinite(tag.confidence) ||
        tag.confidence < 0 ||
        tag.confidence > 1)
    ) {
      details[`${basePath}.confidence`] = "invalid";
    }
  });

  return details;
}

export function validateAnalysisRequest(
  body: RequestSwingAnalysisRequest | undefined
) {
  const details: Record<string, string> = {};

  if (body == null) {
    return details;
  }

  if (body.goalId != null) {
    if (typeof body.goalId !== "string" || body.goalId.trim().length === 0) {
      details.goalId = "invalid";
    }
  }

  if (body.notes != null) {
    if (typeof body.notes !== "string") {
      details.notes = "invalid";
    } else if (body.notes.trim().length === 0) {
      details.notes = "min_1";
    } else if (body.notes.length > 1000) {
      details.notes = "max_1000";
    }
  }

  return details;
}
