import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError, ValidationError } from "../../lib/errors";
import { env } from "../../config/env";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) throw new UnauthorizedError("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new ValidationError("Current password is incorrect.");

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
}
