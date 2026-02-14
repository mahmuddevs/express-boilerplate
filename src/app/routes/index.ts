import { Router } from "express";

const router = Router();

// You can add a default root route if you want
router.get("/", (req, res) => {
  res.send("API Root: Use /auth or /users endpoints");
});

export default router;
