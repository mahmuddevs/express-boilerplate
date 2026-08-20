import type { Request, Response } from "express";
import { User } from "./user.model.js";
import { response } from "../../utils/apiResponse.js";
import { AuthService } from "./auth.service.js";
import { compareHash } from "../../utils/hashUtils.js";
import { generateToken, verifyToken } from "../../utils/jwtUtils.js";
import { decodeJwt } from "jose";
import { env } from "../../config/env.js";
import { RefreshToken } from "./refresh-token.model.js";
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
    return response.error(res, {
      message: "Authentication token missing",
      statusCode: 401,
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
      message: "Token is invalid or expired.",
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
  const { refreshToken, accessToken } = req.cookies;
  const logout = AuthService.getLogoutCookieConfig(["accessToken", "refreshToken"]);

  // 1. First check if the session is active or not
  if (!refreshToken) {
    return response.error(res, { message: "Session expired", statusCode: 401, cookie: logout });
  }

  // 2. If the access token is still valid and not expired, return it as-is without rotating
  if (accessToken) {
    try {
      await verifyToken(accessToken, env.accessTokenSecret);
      return response.success(res, {
        message: "Access token is still valid",
        cookie: AuthService.getCookieConfig([
          {
            name: "accessToken",
            value: accessToken,
            expiration: env.cookieExpirationTime,
          },
        ]),
      });
    } catch {
      // Access token is invalid or expired, proceed with refresh
    }
  }

  // 2. Verify the refresh token signature
  let payload;
  try {
    payload = await verifyToken(refreshToken, env.refreshTokenSecret);
  } catch {
    return response.error(res, {
      message: "Invalid or expired session",
      statusCode: 401,
      cookie: logout,
    });
  }

  try {
    // 3. Stateful check: confirm the session still exists in the DB
    const sessions = await RefreshToken.find({ userId: payload.id });

    let session = null;
    for (const s of sessions) {
      if (await compareHash(refreshToken, s.refreshToken)) {
        session = s;
        break;
      }
    }

    if (!session) {
      return response.error(res, {
        message: "Session has been revoked. Please login again.",
        statusCode: 401,
        cookie: logout,
      });
    }

    // 4. Ensure the user still exists before minting new tokens
    const user = await AuthService.findUserByEmail(payload.email);
    if (!user) {
      return response.error(res, {
        message: "User no longer exists. Please login again.",
        statusCode: 401,
        cookie: logout,
      });
    }

    // 5. Rotate tokens: issue new tokens and revoke the old refresh token
    const newAccessToken = await generateToken(
      { id: payload.id, email: payload.email },
      env.accessTokenSecret,
      env.accessTokenExpiration
    );

    const newRefreshToken = await generateToken(
      { id: payload.id, email: payload.email },
      env.refreshTokenSecret,
      env.refreshTokenExpiration
    );

    await RefreshToken.deleteOne({ _id: session._id });
    await RefreshToken.create({
      userId: user._id,
      refreshToken: newRefreshToken,
    });

    return response.success(res, {
      message: "Token refreshed",
      cookie: AuthService.getCookieConfig([
        {
          name: "accessToken",
          value: newAccessToken,
          expiration: env.cookieExpirationTime,
        },
        {
          name: "refreshToken",
          value: newRefreshToken,
          expiration: env.cookieExpirationTime,
        },
      ]),
    });
  } catch (err: any) {
    return response.error(res, {
      message: err.message || "An error occurred during token refresh",
      statusCode: 500,
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