import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health";
import { registerSwingRoutes } from "./swings";
import { registerAuthRoutes } from "./auth";

export async function registerRoutes(app: FastifyInstance) {
  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerSwingRoutes(app);
}
