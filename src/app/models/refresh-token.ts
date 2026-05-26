import { model, Schema, Types } from "mongoose";
import { hashData } from "../utils/hashUtils.js";

const refreshTokenSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '7d'
  }
});

refreshTokenSchema.pre("save", async function () {
  if (!this.isModified("refreshToken")) {
    return;
  }
  this.refreshToken = await hashData(this.refreshToken);
});

export const RefreshToken = model("RefreshToken", refreshTokenSchema);