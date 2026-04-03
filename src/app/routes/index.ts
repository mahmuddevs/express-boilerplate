import { Router } from "express";

const router = Router();

// You can add a default root route if you want
router.get("/", (req, res) => {
  res.send("Shit Works!");
});

router.get("/new", (req, res) => {
  res.send("New Shit Works Too!");
});

export default router;
