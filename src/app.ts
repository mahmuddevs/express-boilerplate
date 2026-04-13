import express from "express";
import type { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { logger } from "./app/utils/logger.js";
import { response } from "./app/utils/apiResponse.js";
import router from "./app/routes/routes.js";

const app = express();

// -----------------------------
// Middleware
// -----------------------------
// CORS setup
app.use(
  cors({
    origin: "*", // adjust for your frontend URL in production
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
// Parse JSON bodies
app.use(express.json());
// Parse cookies
app.use(cookieParser());
// Morgan logging
const morganStream = {
  write: (message: string) => logger.info(message.trim()),
};
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", { stream: morganStream }));
}

// -----------------------------
// Routes
// -----------------------------
app.use("/api", router);

// -----------------------------
// Global error handler
// -----------------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  response.error(res, { message: err.message || "Internal Server Error" });
});

export default app;
