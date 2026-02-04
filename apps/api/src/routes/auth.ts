import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiError, AuthResponse, LoginRequest, RegisterRequest } from "@swing/shared";
import { prisma } from "../db";
import { serializeUser } from "../lib/serialize";
import { compare, hash } from "bcryptjs";

const SALT_ROUNDS = 10;

function badRequest(reply: FastifyReply, message: string, details?: Record<string, string>) {
  const error: ApiError = { code: "bad_request", message, details };
  return reply.code(400).send(error);
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterRequest }>("/v1/auth/register", async (request, reply) => {
    const { email, password } = request.body ?? {};
    const details: Record<string, string> = {};

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) details.email = "required";
    if (!password || password.length < 8) details.password = "min_8_chars";

    if (Object.keys(details).length > 0) {
      return badRequest(reply, "Invalid registration request", details);
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return reply.code(409).send({ code: "conflict", message: "Email already in use" });
    }

    const passwordHash = await hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash
      }
    });

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    const response: AuthResponse = {
      token,
      user: serializeUser(user)
    };

    return reply.code(201).send(response);
  });

  app.post<{ Body: LoginRequest }>("/v1/auth/login", async (request, reply) => {
    const { email, password } = request.body ?? {};
    const details: Record<string, string> = {};

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) details.email = "required";
    if (!password) details.password = "required";

    if (Object.keys(details).length > 0) {
      return badRequest(reply, "Invalid login request", details);
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return reply.code(401).send({ code: "unauthorized", message: "Invalid credentials" });
    }

    const matches = await compare(password, user.passwordHash);
    if (!matches) {
      return reply.code(401).send({ code: "unauthorized", message: "Invalid credentials" });
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    const response: AuthResponse = {
      token,
      user: serializeUser(user)
    };

    return reply.code(200).send(response);
  });

  app.get("/v1/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.code(404).send({ code: "not_found", message: "User not found" });
    }

    return { user: serializeUser(user) };
  });
}
