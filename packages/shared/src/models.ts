export type UUID = string;
export type ISODateString = string;

export type Visibility = "private" | "unlisted" | "shared";
export type Handedness = "right" | "left";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "coach";

export type VideoAngle = "down_the_line" | "face_on" | "other";

export type PPosition =
  | "P1"
  | "P2"
  | "P3"
  | "P4"
  | "P5"
  | "P6"
  | "P7"
  | "P8"
  | "P9"
  | "P10";

export interface User {
  id: UUID;
  email: string;
  createdAt: ISODateString;
}

export interface Profile {
  userId: UUID;
  displayName: string;
  bio?: string;
  handedness?: Handedness;
  skillLevel?: SkillLevel;
  avatarUrl?: string;
}

export interface VideoAsset {
  id: UUID;
  ownerId: UUID;
  storageKey: string;
  durationMs: number;
  frameRate: number;
  width: number;
  height: number;
  angle?: VideoAngle;
  createdAt: ISODateString;
}

export interface Swing {
  id: UUID;
  ownerId: UUID;
  videoAssetId: UUID;
  visibility: Visibility;
  createdAt: ISODateString;
  notes?: string;
}

export interface SwingFrameTag {
  id: UUID;
  swingId: UUID;
  position: PPosition;
  frameIndex: number;
  timestampMs: number;
  setBy: "user" | "ai";
  confidence?: number;
  createdAt: ISODateString;
}

export type SwingAnalysisStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface SwingAnalysis {
  id: UUID;
  swingId: UUID;
  version: string;
  status: SwingAnalysisStatus;
  summary: string;
  recommendations: string[];
  metrics: Record<string, number>;
  confidence: number;
  createdAt: ISODateString;
  inputs: {
    frameTagIds: UUID[];
    modelId?: string;
  };
}

export interface GoalTarget {
  position: PPosition;
  notes?: string;
  targetMetrics?: Record<string, number>;
}

export interface Goal {
  id: UUID;
  ownerId: UUID;
  title: string;
  status: "active" | "paused" | "completed" | "archived";
  createdAt: ISODateString;
  dueDate?: ISODateString;
  targets: GoalTarget[];
}

export interface ProgressSnapshot {
  id: UUID;
  ownerId: UUID;
  swingId: UUID;
  recordedAt: ISODateString;
  score?: number;
  notes?: string;
  deltas?: Record<string, number>;
}

export interface JourneyMemory {
  id: UUID;
  ownerId: UUID;
  markdown: string;
  summary?: string;
  createdAt: ISODateString;
}
