import { Router } from "express";
import authRoutes from "./auth/auth.route.js";
import rootRoutes from "./root.route.js";

const router = Router();

router.use("/auth", authRoutes)
router.use("/", rootRoutes)

export default router;
