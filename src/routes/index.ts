import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.module.js";
import { rootRoutes } from "../modules/root/root.module.js";

const router = Router();

router.use("/auth", authRoutes)
router.use("/", rootRoutes)

export default router;