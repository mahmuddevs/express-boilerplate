import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodObject } from "zod";

export const validate =
  (schema: ZodObject) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        req.body = await schema.parseAsync(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            status: "fail",
            errors: error.issues.map((e) => ({
              field: e.path[0],
              message: e.message,
            })),
          });
        }
        next(error);
      }
    };