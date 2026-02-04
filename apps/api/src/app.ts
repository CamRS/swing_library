import Fastify, { type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { registerRoutes } from "./routes";
import { config } from "./config";

export async function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: 200 * 1024 * 1024
  });

  app.addContentTypeParser(
    /^video\/.*/,
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body)
  );
  app.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body)
  );

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });

  await app.register(jwt, {
    secret: config.jwtSecret
  });

  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply
        .code(401)
        .send({ code: "unauthorized", message: "Invalid token" });
    }
  });

  await registerRoutes(app);

  return app;
}
