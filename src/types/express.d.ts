import type { Document } from "mongoose";
import type { IUser } from "../modules/auth/user.model.ts";

declare global {
  namespace Express {
    interface Request {
      user?: Document & IUser;
    }
  }
}