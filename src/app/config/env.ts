import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  appUrl: process.env.APP_URL || "http://localhost",
  port: Number(process.env.PORT || 3000),
  dbUri: `mongodb+srv://${required("DB_USERNAME")}:${required("DB_PASSWORD")}@${required("DB_CLUSTER")}/${required("DB_NAME")}?appName=MernCluster`,
  accessTokenSecret: required("ACCESS_TOKEN_SECRET"),
  refreshTokenSecret: required("REFRESH_TOKEN_SECRET"),
  accessTokenExpiration: process.env.ACCESS_TOKEN_EXPIRATION || '15m',
  refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
  cookieExpirationTime: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
  hashSaltRounds: Number(process.env.HASH_SALT_ROUNDS || 10),
};
