import { z } from "zod"
import { Roles } from "../constants/roles.js"


export const UserSchema = z.object({
  firstName: z.string().min(3, "First Name must be at least 3 characters long"),
  lastName: z.string().min(3, "Last Name must be at least 3 characters long"),
  email: z.email("Not a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(Roles),
})

export type UserSchema = z.infer<typeof UserSchema>

export const LoginSchema = z.object({
  email: z.email("Please provide a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});
export type LoginType = z.infer<typeof LoginSchema>;