import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/app-error";
import { verifyToken } from "../utils/jwt";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/** Requires a valid `Authorization: Bearer <jwt>` header. Never trust a
 * userId passed in the body/query/params — the authenticated actor always
 * comes from the verified token. */
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or malformed Authorization header");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}
