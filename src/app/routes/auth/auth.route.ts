import { Router } from "express";
import type { Request, Response } from "express";
import { UserSchema, LoginSchema } from "../../schemas/user.schema.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { login, logout, register, verifyAuth, refreshAccessToken, googleLogin } from "../../controllers/auth.controller.js";

const authRoutes = Router();

authRoutes.post("/", verifyAuth)

authRoutes.post("/login", validate(LoginSchema), login)

authRoutes.post("/google-login", googleLogin)

authRoutes.post("/register", validate(UserSchema), register)

authRoutes.post("/forgot-password", (req: Request, res: Response) => {
  res.send("Forgot Password Route Hit")
})

authRoutes.post("/reset-password", (req: Request, res: Response) => {
  res.send("Reset Password Route Hit")
})

authRoutes.post("/logout", logout)

authRoutes.post("/refresh-access-token", refreshAccessToken)



export default authRoutes