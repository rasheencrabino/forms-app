import type { AuthResponseDto, LoginInput, RegisterInput } from "@forms-app/shared";
import { prisma } from "../db";
import { ConflictError, UnauthorizedError } from "../errors/app-error";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";

export async function register(input: RegisterInput): Promise<AuthResponseDto> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash },
  });

  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: { id: user.id, email: user.email } };
}

export async function login(input: LoginInput): Promise<AuthResponseDto> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: { id: user.id, email: user.email } };
}
