import { Router } from "express";
import verifyAuth from "../auth/verify-auth.middleware.js";
import { response } from "../../utils/apiResponse.js";

const rootRoutes = Router();

// You can add a default root route if you want
rootRoutes.get("/", (req, res) => {
  res.send("Shit Works!");
});

rootRoutes.get("/new", verifyAuth, (req, res) => {
  return response.success(res, {
    message: "New Shit Works Too!"
  });
});

export default rootRoutes;