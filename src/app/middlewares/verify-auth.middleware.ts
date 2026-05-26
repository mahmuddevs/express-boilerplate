import type { Request, Response, NextFunction } from "express";
import { response, handleCookies } from "../utils/apiResponse.js";
import { verifyToken, generateToken } from "../utils/jwtUtils.js";
import { env } from "../config/env.js";
import { RefreshToken } from "../models/refresh-token.js";
import { AuthService } from "../services/auth.services.js";
import { compareHash } from "../utils/hashUtils.js";

const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
  const { accessToken, refreshToken } = req.cookies;

  try {
    let payload;

    // 1. Try verifying the Access Token
    if (accessToken) {
      try {
        payload = await verifyToken(accessToken, env.accessTokenSecret);
      } catch (err: any) {
        // Only fall through to refresh logic if the token is expired
        // For any other error (tampered token etc), throw immediately
        if (err.code !== "ERR_JWT_EXPIRED") throw err;
      }
    }

    // 2. Silent Refresh: Access token is missing or expired
    if (!payload) {
      // No refresh token = no session at all
      if (!refreshToken) {
        return response.error(res, {
          message: "No active session found. Please login.",
          statusCode: 401,
          cookie: AuthService.getLogoutCookieConfig([
            "accessToken",
            "refreshToken",
          ]),
        });
      }

      // Verify the refresh token signature
      payload = await verifyToken(refreshToken, env.refreshTokenSecret);

      // Stateful check: ensure session exists in DB
      const sessions = await RefreshToken.find({ userId: payload.id });
      let activeSession = null;
      for (const session of sessions) {
        if (await compareHash(refreshToken, session.refreshToken)) {
          activeSession = session;
          break;
        }
      }

      if (!activeSession) {
        return response.error(res, {
          message: "Session has been revoked. Please login again.",
          statusCode: 401,
          cookie: AuthService.getLogoutCookieConfig([
            "accessToken",
            "refreshToken",
          ]),
        });
      }

      // Issue a new Access Token and set it as a cookie
      const newAccessToken = await generateToken(
        { id: payload.id, email: payload.email },
        env.accessTokenSecret,
        env.accessTokenExpiration
      );

      const newAccessTokenCookies = AuthService.getCookieConfig([
        {
          name: "accessToken",
          value: newAccessToken,
          expiration: env.accessTokenExpiration,
        },
      ]);

      handleCookies(res, newAccessTokenCookies);
    }

    // 3. Verify User still exists
    const user = await AuthService.findUserByEmail(payload.email);

    if (!user) {
      return response.error(res, {
        message: "Unauthorized. User no longer exists.",
        statusCode: 401,
        cookie: AuthService.getLogoutCookieConfig([
          "accessToken",
          "refreshToken",
        ]),
      });
    }

    // 4. Attach user to request and pass control to next middleware/controller
    req.user = user;
    next();
  } catch (err: any) {
    return response.error(res, {
      message: err.message || "Unauthorized access.",
      statusCode: 401,
      cookie: AuthService.getLogoutCookieConfig(["accessToken", "refreshToken"]),
    });
  }
};

export default verifyAuth;
