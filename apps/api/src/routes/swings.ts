import type { FastifyInstance, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import type {
  ApiError,
  CreateSwingRequest,
  CreateSwingResponse,
  ListSwingAnalysesQuery,
  ListSwingAnalysesResponse,
  ListSwingFrameTagsResponse,
  ListSharedSwingsQuery,
  ListSharedSwingsResponse,
  ListSwingsQuery,
  ListSwingsResponse,
  RequestSwingAnalysisRequest,
  RequestSwingAnalysisResponse,
  SwingAnalysisStatus,
  UploadSwingRequest,
  UploadSwingResponse,
  UpsertSwingFrameTagsRequest,
  UpsertSwingFrameTagsResponse
} from "@swing/shared";
import { prisma } from "../db";
import {
  isValidVisibility,
  validateAnalysisRequest,
  validateFrameTagsRequest,
  validateUploadRequest
} from "../lib/validation";
import { assertObjectExists, createDownloadUrl, createUploadUrl } from "../lib/storage";
import {
  serializeSwing,
  serializeSwingAnalysis,
  serializeSwingFrameTag
} from "../lib/serialize";

function badRequest(
  reply: FastifyReply,
  message: string,
  details?: Record<string, string>
) {
  const error: ApiError = {
    code: "bad_request",
    message
  };
  if (details) {
    error.details = details;
  }
  return reply.code(400).send(error);
}

const DEFAULT_VISIBILITY = "private";
const INITIAL_ANALYSIS_VERSION = "initial-v1";
const INITIAL_ANALYSIS_MODEL_ID = "initial-analysis-stub-v1";
const ANALYSIS_QUEUE_WINDOW_MS = 1200;
const ANALYSIS_PROCESSING_WINDOW_MS = 4500;

function getAnalysisStatus(createdAt: Date): SwingAnalysisStatus {
  const elapsedMs = Date.now() - createdAt.getTime();
  if (elapsedMs < ANALYSIS_QUEUE_WINDOW_MS) {
    return "queued";
  }

  if (elapsedMs < ANALYSIS_PROCESSING_WINDOW_MS) {
    return "processing";
  }

  return "completed";
}

function buildInitialAnalysisSummary(tagCount: number) {
  if (tagCount === 0) {
    return "Initial analysis job queued with no frame tags yet.";
  }

  return `Captured ${tagCount} tagged position${tagCount === 1 ? "" : "s"} for initial analysis.`;
}

function buildInitialAnalysisRecommendations(tagCount: number) {
  if (tagCount === 0) {
    return [
      "Tag at least P1, P4, and P7 to improve analysis quality.",
      "Re-run analysis after tagging key positions."
    ];
  }

  if (tagCount < 5) {
    return [
      "Add more checkpoints (P2, P3, P5, and P6) for better coverage.",
      "Keep camera angle and framing consistent between swings."
    ];
  }

  return [
    "Good frame-tag coverage. Next phase will use pose estimation for deeper feedback.",
    "Use this baseline to compare your next upload."
  ];
}

function createInitialAnalysisMetrics(tagCount: number, durationMs: number) {
  return {
    taggedPositions: tagCount,
    tagCoverage: Number((tagCount / 10).toFixed(3)),
    durationMs
  };
}

export async function registerSwingRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get<{ Querystring: ListSwingsQuery }>(
    "/v1/swings",
    auth,
    async (request) => {
      const requestedLimit = Number(request.query.limit ?? 20);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 50)
        : 20;
      const cursor = request.query.cursor;
      const swings = await prisma.swing.findMany({
        where: { ownerId: request.user.sub },
        include: { videoAsset: true },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1
            }
          : {})
      });

      const hasNext = swings.length > limit;
      const items = hasNext ? swings.slice(0, limit) : swings;
      const responseItems = await Promise.all(
        items.map(async (swing) => ({
          ...serializeSwing(swing),
          previewUrl: await createDownloadUrl({
            key: swing.videoAsset.storageKey
          }),
          frameRate: Number(swing.videoAsset.frameRate),
          durationMs: swing.videoAsset.durationMs,
          width: swing.videoAsset.width,
          height: swing.videoAsset.height
        }))
      );

      const response: ListSwingsResponse = {
        items: responseItems,
        nextCursor: hasNext ? items[items.length - 1]?.id : undefined
      };

      return response;
    }
  );

  app.get<{ Querystring: ListSharedSwingsQuery }>(
    "/v1/swings/shared",
    auth,
    async (request) => {
      const requestedLimit = Number(request.query.limit ?? 20);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 50)
        : 20;
      const cursor = request.query.cursor;
      const ownerId = request.query.ownerId;
      const swings = await prisma.swing.findMany({
        where: {
          visibility: "shared",
          ...(ownerId
            ? { ownerId }
            : { ownerId: { not: request.user.sub } })
        },
        include: { videoAsset: true },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1
            }
          : {})
      });

      const hasNext = swings.length > limit;
      const items = hasNext ? swings.slice(0, limit) : swings;
      const responseItems = await Promise.all(
        items.map(async (swing) => ({
          ...serializeSwing(swing),
          previewUrl: await createDownloadUrl({
            key: swing.videoAsset.storageKey
          }),
          frameRate: Number(swing.videoAsset.frameRate),
          durationMs: swing.videoAsset.durationMs,
          width: swing.videoAsset.width,
          height: swing.videoAsset.height
        }))
      );

      const response: ListSharedSwingsResponse = {
        items: responseItems,
        nextCursor: hasNext ? items[items.length - 1]?.id : undefined
      };

      return response;
    }
  );

  app.post<{ Body: UploadSwingRequest }>(
    "/v1/swings/uploads",
    auth,
    async (request, reply) => {
      const details = validateUploadRequest(request.body);
      if (Object.keys(details).length > 0) {
        return badRequest(reply, "Invalid upload request", details);
      }

      const userId = request.user.sub;
      const storageKey = `uploads/${userId}/${randomUUID()}`;

      const videoAsset = await prisma.videoAsset.create({
        data: {
          ownerId: userId,
          storageKey,
          durationMs: request.body.durationMs,
          frameRate: request.body.frameRate.toString(),
          width: request.body.width,
          height: request.body.height,
          angle: request.body.angle
        }
      });

      const serializedVideoAsset = {
        ...videoAsset,
        frameRate: Number(videoAsset.frameRate),
        createdAt: videoAsset.createdAt.toISOString()
      };

      const uploadUrl = await createUploadUrl({
        key: storageKey,
        contentType: request.body.contentType
      });
      const response: UploadSwingResponse = {
        videoAsset: serializedVideoAsset,
        uploadUrl,
        requiredHeaders: {
          "content-type": request.body.contentType
        }
      };

      return reply.code(200).send(response);
    }
  );

  app.post<{ Body: CreateSwingRequest }>(
    "/v1/swings",
    auth,
    async (request, reply) => {
      if (!request.body?.videoAssetId) {
        return badRequest(reply, "Missing videoAssetId", {
          videoAssetId: "required"
        });
      }

      const visibility = request.body.visibility ?? DEFAULT_VISIBILITY;
      if (!isValidVisibility(visibility)) {
        return badRequest(reply, "Invalid visibility", {
          visibility: "invalid"
        });
      }

      const asset = await prisma.videoAsset.findFirst({
        where: { id: request.body.videoAssetId, ownerId: request.user.sub }
      });

      if (!asset) {
        return reply.code(404).send({
          code: "not_found",
          message: "Video asset not found"
        });
      }

      try {
        await assertObjectExists(asset.storageKey);
      } catch (err) {
        return reply.code(400).send({
          code: "upload_missing",
          message: "Uploaded video not found in storage"
        });
      }

      const swing = await prisma.swing.create({
        data: {
          ownerId: request.user.sub,
          videoAssetId: request.body.videoAssetId,
          visibility,
          notes: request.body.notes
        }
      });

      const response: CreateSwingResponse = {
        swing: serializeSwing(swing)
      };
      return reply.code(201).send(response);
    }
  );

  app.post<{ Params: { id: string }; Body: RequestSwingAnalysisRequest }>(
    "/v1/swings/:id/analysis",
    auth,
    async (request, reply) => {
      const details = validateAnalysisRequest(request.body);
      if (Object.keys(details).length > 0) {
        return badRequest(reply, "Invalid analysis request", details);
      }

      const swing = await prisma.swing.findFirst({
        where: {
          id: request.params.id,
          ownerId: request.user.sub
        },
        include: {
          videoAsset: true
        }
      });

      if (!swing) {
        return reply.code(404).send({
          code: "not_found",
          message: "Swing not found"
        });
      }

      const frameTags = await prisma.swingFrameTag.findMany({
        where: { swingId: swing.id },
        orderBy: { position: "asc" }
      });
      const tagCount = frameTags.length;

      const requestContext: Record<string, string> = {};
      if (request.body?.goalId) {
        requestContext.goalId = request.body.goalId;
      }
      if (request.body?.notes) {
        requestContext.notes = request.body.notes;
      }

      const analysis = await prisma.swingAnalysis.create({
        data: {
          swingId: swing.id,
          version: INITIAL_ANALYSIS_VERSION,
          summary: buildInitialAnalysisSummary(tagCount),
          recommendations: buildInitialAnalysisRecommendations(tagCount),
          metrics: createInitialAnalysisMetrics(
            tagCount,
            swing.videoAsset.durationMs
          ),
          confidence: Math.min(0.9, 0.35 + tagCount * 0.04),
          inputs: {
            frameTagIds: frameTags.map((tag) => tag.id),
            modelId: INITIAL_ANALYSIS_MODEL_ID,
            ...(Object.keys(requestContext).length > 0
              ? {
                  request: requestContext
                }
              : {})
          }
        }
      });

      const response: RequestSwingAnalysisResponse = {
        analysisId: analysis.id,
        status: "queued"
      };

      return reply.code(202).send(response);
    }
  );

  app.get<{ Params: { id: string }; Querystring: ListSwingAnalysesQuery }>(
    "/v1/swings/:id/analysis",
    auth,
    async (request, reply) => {
      const swing = await prisma.swing.findFirst({
        where: {
          id: request.params.id,
          ownerId: request.user.sub
        }
      });

      if (!swing) {
        return reply.code(404).send({
          code: "not_found",
          message: "Swing not found"
        });
      }

      const requestedLimit = Number(request.query.limit ?? 20);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(requestedLimit, 50)
        : 20;
      const cursor = request.query.cursor;

      const analyses = await prisma.swingAnalysis.findMany({
        where: { swingId: swing.id },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1
            }
          : {})
      });

      const hasNext = analyses.length > limit;
      const items = hasNext ? analyses.slice(0, limit) : analyses;
      const response: ListSwingAnalysesResponse = {
        items: items.map((analysis) => ({
          ...serializeSwingAnalysis(analysis),
          status: getAnalysisStatus(analysis.createdAt)
        }))
      };
      if (hasNext && items.length > 0) {
        response.nextCursor = items[items.length - 1].id;
      }

      return response;
    }
  );

  app.put<{ Params: { id: string }; Body: UpsertSwingFrameTagsRequest }>(
    "/v1/swings/:id/frame-tags",
    auth,
    async (request, reply) => {
      const details = validateFrameTagsRequest(request.body);
      if (Object.keys(details).length > 0) {
        return badRequest(reply, "Invalid frame tags request", details);
      }

      const swing = await prisma.swing.findFirst({
        where: {
          id: request.params.id,
          ownerId: request.user.sub
        }
      });

      if (!swing) {
        return reply.code(404).send({
          code: "not_found",
          message: "Swing not found"
        });
      }

      await prisma.$transaction(
        request.body.tags.map((tag) =>
          prisma.swingFrameTag.upsert({
            where: {
              swingId_position: {
                swingId: swing.id,
                position: tag.position
              }
            },
            update: {
              frameIndex: tag.frameIndex,
              timestampMs: tag.timestampMs,
              setBy: tag.setBy,
              confidence: tag.confidence ?? null
            },
            create: {
              swingId: swing.id,
              position: tag.position,
              frameIndex: tag.frameIndex,
              timestampMs: tag.timestampMs,
              setBy: tag.setBy,
              confidence: tag.confidence ?? null
            }
          })
        )
      );

      const tags = await prisma.swingFrameTag.findMany({
        where: { swingId: swing.id },
        orderBy: { position: "asc" }
      });

      const response: UpsertSwingFrameTagsResponse = {
        tags: tags.map((tag) => serializeSwingFrameTag(tag))
      };

      return response;
    }
  );

  app.get<{ Params: { id: string } }>(
    "/v1/swings/:id/frame-tags",
    auth,
    async (request, reply) => {
      const swing = await prisma.swing.findFirst({
        where: {
          id: request.params.id,
          ownerId: request.user.sub
        }
      });

      if (!swing) {
        return reply.code(404).send({
          code: "not_found",
          message: "Swing not found"
        });
      }

      const tags = await prisma.swingFrameTag.findMany({
        where: { swingId: swing.id },
        orderBy: { position: "asc" }
      });

      const response: ListSwingFrameTagsResponse = {
        tags: tags.map((tag) => serializeSwingFrameTag(tag))
      };

      return response;
    }
  );
}
