import type { Swing, User, Visibility } from "@swing/shared";

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
  return {
    id: swing.id,
    ownerId: swing.ownerId,
    videoAssetId: swing.videoAssetId,
    visibility: swing.visibility,
    notes: swing.notes ?? undefined,
    createdAt: swing.createdAt.toISOString()
  };
}
