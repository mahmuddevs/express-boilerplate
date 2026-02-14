import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
// Set a longer expiration (e.g., 7 days)
const TOKEN_EXPIRATION = process.env.JWT_EXPIRATION || "7d";

export const generateToken = async (payload: object) => {
  const token = await new SignJWT({payload})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(new TextEncoder().encode(JWT_SECRET));

  return token;
};

export const verifyToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET),
    );
    return payload;
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
};
