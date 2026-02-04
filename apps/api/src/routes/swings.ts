import type { FastifyInstance, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import type {
  ApiError,
  CreateSwingRequest,
  CreateSwingResponse,
  ListSwingsQuery,
  ListSwingsResponse,
  UploadSwingRequest,
  UploadSwingResponse
} from "@swing/shared";
import { prisma } from "../db";
import { isValidVisibility, validateUploadRequest } from "../lib/validation";
import { assertObjectExists, createUploadUrl } from "../lib/storage";
import { serializeSwing } from "../lib/serialize";

function badRequest(
  reply: FastifyReply,
  message: string,
  details?: Record<string, string>
) {
  const error: ApiError = {
    code: "bad_request",
    message,
    details
  };
  return reply.code(400).send(error);
}

const DEFAULT_VISIBILITY = "private";

export async function registerSwingRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get<{ Querystring: ListSwingsQuery }>(
    "/v1/swings",
    async (request) => {
      const requestedLimit = Number(request.query.limit ?? 20);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(requestedLimit, 50)
        : 20;
      const cursor = request.query.cursor;
      const swings = await prisma.swing.findMany({
        where: { ownerId: request.user.sub },
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
      const response: ListSwingsResponse = {
        items: items.map(serializeSwing),
        nextCursor: hasNext ? items[items.length - 1]?.id : undefined
      };

      return response;
    }
  );

  app.post<{ Body: UploadSwingRequest }>(
    "/v1/swings/uploads",
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
}
