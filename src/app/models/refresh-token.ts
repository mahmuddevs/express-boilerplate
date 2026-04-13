import { model, Schema, Types } from "mongoose";

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

export const RefreshToken = model("RefreshToken", refreshTokenSchema);