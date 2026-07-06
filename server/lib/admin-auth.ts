import * as jose from "jose";
import { env } from "./env";

const JWT_ALG = "HS256";
const ADMIN_JWT_SECRET = () =>
  new TextEncoder().encode(env.jwtSecret + ":admin");

export type AdminTokenPayload = {
  adminId: number;
  username: string;
  role: "admin";
};

export async function signAdminToken(
  payload: AdminTokenPayload,
): Promise<string> {
  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(ADMIN_JWT_SECRET());
}

export async function verifyAdminToken(
  token: string,
): Promise<AdminTokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, ADMIN_JWT_SECRET(), {
      algorithms: [JWT_ALG],
      clockTolerance: 60,
    });
    if (
      typeof payload.adminId !== "number" ||
      typeof payload.username !== "string" ||
      payload.role !== "admin"
    ) {
      return null;
    }
    return payload as unknown as AdminTokenPayload;
  } catch {
    return null;
  }
}
