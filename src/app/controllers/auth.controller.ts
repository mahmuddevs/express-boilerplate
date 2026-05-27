import type { Request, Response } from "express";
import { User } from "../models/user.js";
import { response } from "../utils/apiResponse.js";
import { AuthService } from "../services/auth.services.js";
import { compareHash } from "../utils/hashUtils.js";
import { generateToken, verifyToken } from "../utils/jwtUtils.js";
import { decodeJwt } from "jose";
import { env } from "../config/env.js";
import { RefreshToken } from "../models/refresh-token.js";
import { OAuth2Client } from "google-auth-library";


const client = new OAuth2Client(env.googleClientId);

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await AuthService.findUserByEmail(email);
    if (!user) {
      return response.error(res, {
        message: "No user exists with this email",
        statusCode: 404,
      });
    }

    if (!user.password) {
      return response.error(res, {
        message: "This account uses social login or does not have a password set.",
        statusCode: 400,
      });
    }

    const isPasswordValid = await compareHash(password, user.password);
    if (!isPasswordValid) {
      return response.error(res, {
        message: "Invalid password",
        statusCode: 401,
      });
    }

    const accessToken = await generateToken(
      {
        id: user._id.toString(),
        email: user.email
      },
      env.accessTokenSecret,
      env.accessTokenExpiration
    );

    const refreshToken = await generateToken(
      {
        id: user._id.toString(),
        email: user.email
      },
      env.refreshTokenSecret,
      env.refreshTokenExpiration
    );

    await RefreshToken.create({
      userId: user._id,
      refreshToken
    });

    return response.success(res, {
      message: "User logged in successfully",
      data: {
        user: AuthService.getFormattedUser(user),
      },
      statusCode: 200,
      cookie: AuthService.getCookieConfig([
        {
          name: "accessToken",
          value: accessToken,
          expiration: env.cookieExpirationTime,
        },
        {
          name: "refreshToken",
          value: refreshToken,
          expiration: env.cookieExpirationTime,
        },
      ]),
    });
  } catch (err: any) {
    return response.error(res, {
      message: err.message || "An error occurred during login",
      statusCode: 500,
    });
  }
};

const register = async (req: Request, res: Response) => {
  try {
    const existingUser = await AuthService.findUserByEmail(req.body.email);
    if (existingUser) {
      return response.error(res, {
        message: "User with this email already exists",
        statusCode: 400,
      });
    }

    const user = await User.create(req.body);

    const accessToken = await generateToken(
      {
        id: user._id.toString(),
        email: user.email
      },
      env.accessTokenSecret,
      env.accessTokenExpiration
    );

    const refreshToken = await generateToken(
      {
        id: user._id.toString(),
        email: user.email
      },
      env.refreshTokenSecret,
      env.refreshTokenExpiration
    );

    await RefreshToken.create({
      userId: user._id,
      refreshToken
    });

    return response.success(res, {
      message: "User registered successfully",
      data: {
        user: AuthService.getFormattedUser(user),
      },
      statusCode: 201,
      cookie: AuthService.getCookieConfig([
        {
          name: "accessToken",
          value: accessToken,
          expiration: env.cookieExpirationTime,
        },
        {
          name: "refreshToken",
          value: refreshToken,
          expiration: env.cookieExpirationTime,
        },
      ]),
    });
  } catch (err: any) {
    return response.error(res, {
      message: err.message || "An error occurred during registration",
      statusCode: 500,
    });
  }
};

const verifyAuth = async (req: Request, res: Response) => {
  const { accessToken, refreshToken } = req.cookies;

  if (!accessToken) {
    return response.success(res, {
      message: "Authentication token missing",
      data: {
        user: null,
        isGuest: true,
      },
      statusCode: 200,
    });
  }

  try {
    const payload = await verifyToken(accessToken, env.accessTokenSecret);

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
        message: "Invalid or expired session. Please login again.",
        statusCode: 401,
        cookie: AuthService.getLogoutCookieConfig(["accessToken", "refreshToken"]),
      });
    }

    const user = await AuthService.findUserByEmail(payload.email);

    if (!user) {
      return response.error(res, {
        message: "User not found or unauthorized",
        statusCode: 401,
      });
    }

    return response.success(res, {
      message: "Authentication verified",
      data: {
        user: AuthService.getFormattedUser(user),
      },
    });
  } catch (err: any) {
    return response.error(res, {
      message: err.message || "Invalid token",
      statusCode: 401,
    });
  }
};

const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return response.warning(res, {
      message: "No active session found.",
      statusCode: 400,
    });
  }

  try {
    try {
      const payload = decodeJwt(refreshToken);
      const userId = payload.id;
      if (userId) {
        const sessions = await RefreshToken.find({ userId });
        for (const session of sessions) {
          if (await compareHash(refreshToken, session.refreshToken)) {
            await RefreshToken.deleteOne({ _id: session._id });
            break;
          }
        }
      }
    } catch {
      // Ignore if decoding fails
    }

    return response.success(res, {
      message: "Logged out successfully",
      cookie: AuthService.getLogoutCookieConfig(["accessToken", "refreshToken"]),
    });
  } catch (err: any) {
    return response.error(res, {
      message: err.message || "An error occurred during logout",
      statusCode: 500,
    });
  }
}

const refreshAccessToken = async (req: Request, res: Response) => {
  const { accessToken, refreshToken } = req.cookies;
  const logout = AuthService.getLogoutCookieConfig(["accessToken", "refreshToken"]);

  // 1. First check if the session is active or not
  if (!refreshToken) {
    return response.error(res, { message: "Session expired", statusCode: 401, cookie: logout });
  }

  try {
    const payload = await verifyToken(refreshToken, env.refreshTokenSecret);
    const sessions = await RefreshToken.find({ userId: payload.id });

    let session = null;
    for (const s of sessions) {
      if (await compareHash(refreshToken, s.refreshToken)) {
        session = s;
        break;
      }
    }

    if (!session) throw new Error("Revoked");

    // 2. Access token ones
    if (!accessToken) {
      return response.error(res, { message: "Access token missing", statusCode: 401, cookie: logout });
    }

    try {
      await verifyToken(accessToken, env.accessTokenSecret);
      return response.success(res, { message: "Token still valid" });
    } catch (err: any) {
      if (err.code !== "ERR_JWT_EXPIRED" && err.name !== "JWTExpired") {
        return response.error(res, { message: "Invalid session", statusCode: 401, cookie: logout });
      }
    }

    const newAccessToken = await generateToken(
      { id: payload.id, email: payload.email },
      env.accessTokenSecret,
      env.accessTokenExpiration
    );

    return response.success(res, {
      message: "Token refreshed",
      cookie: AuthService.getCookieConfig([
        {
          name: "accessToken",
          value: newAccessToken,
          expiration: env.cookieExpirationTime,
        },
      ]),
    });
  } catch {
    return response.error(res, {
      message: "Session invalid",
      statusCode: 401,
      cookie: logout,
    });
  }
};

const googleLogin = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) {
    return response.error(res, {
      message: "Google ID Token is required.",
      statusCode: 400,
    });
  }

  try {
    if (!env.googleClientId) {
      return response.error(res, {
        message: "Google OAuth client ID is not configured on the server.",
        statusCode: 500,
      });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return response.error(res, {
        message: "Invalid token payload from Google.",
        statusCode: 400,
      });
    }

    const { sub: googleId, email, given_name, family_name, name } = payload;

    let user = await AuthService.findUserByEmail(email);

    if (user) {
      if (user.authProvider === "local" || !user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
        await user.save();
      }
    } else {
      user = await User.create({
        firstName: given_name || name || "Google",
        lastName: family_name || "User",
        email: email,
        authProvider: "google",
        googleId: googleId,
      });
    }

    const accessToken = await generateToken(
      {
        id: user._id.toString(),
        email: user.email,
      },
      env.accessTokenSecret,
      env.accessTokenExpiration
    );

    const refreshToken = await generateToken(
      {
        id: user._id.toString(),
        email: user.email,
      },
      env.refreshTokenSecret,
      env.refreshTokenExpiration
    );

    await RefreshToken.create({
      userId: user._id,
      refreshToken,
    });

    return response.success(res, {
      message: "Google login successful",
      data: {
        user: AuthService.getFormattedUser(user),
      },
      statusCode: 200,
      cookie: AuthService.getCookieConfig([
        {
          name: "accessToken",
          value: accessToken,
          expiration: env.cookieExpirationTime,
        },
        {
          name: "refreshToken",
          value: refreshToken,
          expiration: env.cookieExpirationTime,
        },
      ]),
    });
  } catch (err: any) {
    return response.error(res, {
      message: err.message || "An error occurred during Google login",
      statusCode: 500,
    });
  }
};

export { login, googleLogin, register, verifyAuth, logout, refreshAccessToken };
