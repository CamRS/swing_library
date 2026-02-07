import type {
  PPosition,
  SwingAnalysis,
  Swing,
  SwingFrameTag,
  User,
  Visibility
} from "@swing/shared";

export function serializeUser(user: {
  id: string;
  email: string;
  createdAt: Date;
}): User {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString()
  };
}

export function serializeSwing(swing: {
  id: string;
  ownerId: string;
  videoAssetId: string;
  visibility: Visibility;
  notes: string | null;
  createdAt: Date;
}): Swing {
  const serialized: Swing = {
    id: swing.id,
    ownerId: swing.ownerId,
    videoAssetId: swing.videoAssetId,
    visibility: swing.visibility,
    createdAt: swing.createdAt.toISOString()
  };

  if (swing.notes != null) {
    serialized.notes = swing.notes;
  }

  return serialized;
}

export function serializeSwingFrameTag(tag: {
  id: string;
  swingId: string;
  position: PPosition;
  frameIndex: number;
  timestampMs: number;
  setBy: string;
  confidence: number | { toString(): string } | null;
  createdAt: Date;
}): SwingFrameTag {
  const serialized: SwingFrameTag = {
    id: tag.id,
    swingId: tag.swingId,
    position: tag.position,
    frameIndex: tag.frameIndex,
    timestampMs: tag.timestampMs,
    setBy: tag.setBy === "ai" ? "ai" : "user",
    createdAt: tag.createdAt.toISOString()
  };

  if (tag.confidence != null) {
    serialized.confidence = Number(tag.confidence);
  }

  return serialized;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function toNumberRecord(value: unknown): Record<string, number> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const pairs = Object.entries(value).flatMap(([key, entry]) => {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      return [];
    }

    return [[key, entry] as const];
  });

  return Object.fromEntries(pairs);
}

function toAnalysisInputs(value: unknown): SwingAnalysis["inputs"] {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {
      frameTagIds: []
    };
  }

  const object = value as Record<string, unknown>;
  const frameTagIds = Array.isArray(object.frameTagIds)
    ? object.frameTagIds.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];
  const modelId =
    typeof object.modelId === "string" ? object.modelId : undefined;
  const inputs: SwingAnalysis["inputs"] = {
    frameTagIds
  };

  if (modelId) {
    inputs.modelId = modelId;
  }

  return inputs;
}

export function serializeSwingAnalysis(analysis: {
  id: string;
  swingId: string;
  version: string;
  summary: string;
  recommendations: unknown;
  metrics: unknown;
  confidence: number | { toString(): string };
  inputs: unknown;
  createdAt: Date;
}): SwingAnalysis {
  return {
    id: analysis.id,
    swingId: analysis.swingId,
    version: analysis.version,
    status: "completed",
    summary: analysis.summary,
    recommendations: toStringArray(analysis.recommendations),
    metrics: toNumberRecord(analysis.metrics),
    confidence: Number(analysis.confidence),
    createdAt: analysis.createdAt.toISOString(),
    inputs: toAnalysisInputs(analysis.inputs)
  };
}
