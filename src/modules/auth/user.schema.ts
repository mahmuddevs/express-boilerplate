import { z } from "zod";

export const UserSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(3, "First Name must be at least 3 characters long"),
    lastName: z
      .string()
      .trim()
      .min(3, "Last Name must be at least 3 characters long"),
    email: z
      .string()
      .trim()
      .lowercase()
      .email("Not a valid email."),
    authProvider: z.enum(["local", "google"]).default("local"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .optional(),
    googleId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.authProvider === "local") {
      if (!data.password || data.password.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "Password is required for local authentication",
        });
      }
    } else if (data.authProvider === "google") {
      if (!data.googleId || data.googleId.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["googleId"],
          message: "Google ID is required for Google authentication",
        });
      }
    }
  });

export type UserSchema = z.infer<typeof UserSchema>;

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .lowercase()
    .email("Please provide a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export type LoginType = z.infer<typeof LoginSchema>;