import type {
  Goal,
  JourneyMemory,
  Profile,
  ProgressSnapshot,
  Swing,
  SwingAnalysis,
  SwingFrameTag,
  User,
  VideoAsset,
  Visibility,
  VideoAngle,
  PPosition
} from "./models";

export type Cursor = string;

export interface Paginated<T> {
  items: T[];
  nextCursor?: Cursor;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadSwingRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  durationMs: number;
  frameRate: number;
  width: number;
  height: number;
  angle: VideoAngle;
}

export interface UploadSwingResponse {
  videoAsset: VideoAsset;
  uploadUrl: string;
  requiredHeaders?: Record<string, string>;
}

export interface CreateSwingRequest {
  videoAssetId: string;
  visibility: Visibility;
  notes?: string;
}

export interface CreateSwingResponse {
  swing: Swing;
}

export interface ListSwingsQuery {
  ownerId?: string;
  visibility?: Visibility;
  cursor?: Cursor;
  limit?: number;
}

export interface SwingListItem extends Swing {
  previewUrl: string;
  frameRate: number;
  durationMs: number;
  width: number;
  height: number;
}

export interface ListSwingsResponse extends Paginated<SwingListItem> {}

export interface ListSharedSwingsQuery {
  ownerId?: string;
  cursor?: Cursor;
  limit?: number;
}

export interface ListSharedSwingsResponse extends Paginated<SwingListItem> {}

export interface FrameTagInput {
  position: PPosition;
  frameIndex: number;
  timestampMs: number;
  setBy: "user" | "ai";
  confidence?: number;
}

export interface UpsertSwingFrameTagsRequest {
  tags: FrameTagInput[];
}

export interface UpsertSwingFrameTagsResponse {
  tags: SwingFrameTag[];
}

export interface RequestSwingAnalysisRequest {
  swingId: string;
  goalId?: string;
  notes?: string;
}

export interface RequestSwingAnalysisResponse {
  analysisId: string;
  status: "queued" | "processing" | "completed" | "failed";
}

export interface ListSwingAnalysesResponse extends Paginated<SwingAnalysis> {}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateProfileResponse {
  profile: Profile;
}

export interface CreateGoalRequest {
  title: string;
  dueDate?: string;
  targets: Goal["targets"];
}

export interface CreateGoalResponse {
  goal: Goal;
}

export interface ListGoalsResponse extends Paginated<Goal> {}

export interface UpdateGoalRequest {
  title?: string;
  status?: Goal["status"];
  dueDate?: string;
  targets?: Goal["targets"];
}

export interface UpdateGoalResponse {
  goal: Goal;
}

export interface CreateProgressSnapshotRequest {
  swingId: string;
  score?: number;
  notes?: string;
  deltas?: Record<string, number>;
}

export interface CreateProgressSnapshotResponse {
  snapshot: ProgressSnapshot;
}

export interface ListProgressSnapshotsResponse extends Paginated<ProgressSnapshot> {}

export interface UpdateJourneyMemoryRequest {
  markdown: string;
  summary?: string;
}

export interface UpdateJourneyMemoryResponse {
  memory: JourneyMemory;
}

export interface PublicProfile {
  user: User;
  profile: Profile;
}

export interface GetPublicProfileResponse {
  profile: PublicProfile;
}

export interface GetMeResponse {
  user: User;
}
