import { Router } from "express";
import { LoginSchema, RegisterSchema } from "@forms-app/shared";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import * as authService from "../services/auth.service";
import { prisma } from "../db";
import { UnauthorizedError } from "../errors/app-error";

export const authRouter = Router();

/**
 * @route POST /api/auth/register
 * @body { email, password }
 */
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = RegisterSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  }),
);

/**
 * @route POST /api/auth/login
 * @body { email, password }
 */
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  }),
);

/**
 * @route GET /api/auth/me
 * Returns the currently authenticated user — lets the frontend validate a
 * stored token on app load without guessing at its freshness.
 */
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new UnauthorizedError("User no longer exists");
    res.json({ id: user.id, email: user.email });
  }),
);
