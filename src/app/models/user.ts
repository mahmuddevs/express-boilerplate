import { Schema, model } from "mongoose";
import { hashData } from "../utils/hashUtils.js";

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  authProvider: "local" | "google";
  googleId?: string;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      required: true,
    },
    password: {
      type: String,
      required: function (this: any) {
        return this.authProvider === "local";
      },
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      required: function (this: any) {
        return this.authProvider === "google";
      },
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function () {
  if (!this.password || !this.isModified("password")) {
    return;
  }
  this.password = await hashData(this.password);
});
export const User = model<IUser>("User", UserSchema);