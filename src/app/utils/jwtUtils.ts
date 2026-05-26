import { SignJWT, jwtVerify } from "jose";

export interface TokenPayload {
  id: string;
  email: string;
}

export const generateToken = async (
  payload: TokenPayload,
  secret: string,
  expirationTime: string
) => {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationTime)
    .sign(new TextEncoder().encode(secret));

  return token;
};

export const verifyToken = async (token: string, secret: string) => {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  return payload as unknown as TokenPayload;
};
