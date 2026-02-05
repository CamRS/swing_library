-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('private', 'unlisted', 'shared');

-- CreateEnum
CREATE TYPE "public"."Handedness" AS ENUM ('right', 'left');

-- CreateEnum
CREATE TYPE "public"."SkillLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'coach');

-- CreateEnum
CREATE TYPE "public"."VideoAngle" AS ENUM ('down_the_line', 'face_on', 'other');

-- CreateEnum
CREATE TYPE "public"."PPosition" AS ENUM ('P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "handedness" "public"."Handedness",
    "skill_level" "public"."SkillLevel",
    "avatar_url" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."VideoAsset" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "frame_rate" DECIMAL(6,2) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "angle" "public"."VideoAngle",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Swing" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "video_asset_id" UUID NOT NULL,
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'private',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Swing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SwingFrameTag" (
    "id" UUID NOT NULL,
    "swing_id" UUID NOT NULL,
    "position" "public"."PPosition" NOT NULL,
    "frame_index" INTEGER NOT NULL,
    "timestamp_ms" INTEGER NOT NULL,
    "set_by" TEXT NOT NULL,
    "confidence" DECIMAL(4,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwingFrameTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SwingAnalysis" (
    "id" UUID NOT NULL,
    "swing_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "confidence" DECIMAL(4,3) NOT NULL,
    "inputs" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwingAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Goal" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GoalTarget" (
    "id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "position" "public"."PPosition" NOT NULL,
    "notes" TEXT,
    "target_metrics" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "GoalTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProgressSnapshot" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "swing_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DECIMAL(5,2),
    "notes" TEXT,
    "deltas" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ProgressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JourneyMemory" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "markdown" TEXT NOT NULL,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAsset_storage_key_key" ON "public"."VideoAsset"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "SwingFrameTag_swing_id_position_key" ON "public"."SwingFrameTag"("swing_id", "position");

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VideoAsset" ADD CONSTRAINT "VideoAsset_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Swing" ADD CONSTRAINT "Swing_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Swing" ADD CONSTRAINT "Swing_video_asset_id_fkey" FOREIGN KEY ("video_asset_id") REFERENCES "public"."VideoAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SwingFrameTag" ADD CONSTRAINT "SwingFrameTag_swing_id_fkey" FOREIGN KEY ("swing_id") REFERENCES "public"."Swing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SwingAnalysis" ADD CONSTRAINT "SwingAnalysis_swing_id_fkey" FOREIGN KEY ("swing_id") REFERENCES "public"."Swing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoalTarget" ADD CONSTRAINT "GoalTarget_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_swing_id_fkey" FOREIGN KEY ("swing_id") REFERENCES "public"."Swing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JourneyMemory" ADD CONSTRAINT "JourneyMemory_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
