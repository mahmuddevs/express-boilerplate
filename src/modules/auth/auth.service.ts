import type { Document } from "mongoose";
import { User, type IUser } from "./user.model.js";
import { env } from "../../config/env.js";
import ms from "ms";
import type { StringValue } from "ms"

export const AuthService = {
  // Common function to find a user by email
  findUserByEmail: async (email: string) => {
    return await User.findOne({ email });
  },

  // Centralized Cookie Configuration
  getCookieConfig: (
    cookies: { name: string; value: string; expiration: string }[]
  ) => {
    return cookies.map(({ name, value, expiration }) => ({
      name,
      value,
      options: {
        httpOnly: true,
        secure: env.nodeEnv === "production",
        sameSite: (env.nodeEnv === "production" ? "none" : "lax") as
          | "none"
          | "lax",
        maxAge: ms(expiration as StringValue),
      },
    }));
  },

  getLogoutCookieConfig: (cookieNames: string[]) => {
    return cookieNames.map((name) => ({
      name,
      value: "",
      clear: true,
      options: {
        httpOnly: true,
        secure: env.nodeEnv === "production",
        sameSite: (env.nodeEnv === "production" ? "none" : "lax") as
          | "none"
          | "lax",
      },
    }));
  },

  // Reusable function to remove sensitive data and clean up mongoose object
  getFormattedUser: (user: Document & IUser) => {
    const { password, ...userData } = user.toObject();
    return userData;
  },
};