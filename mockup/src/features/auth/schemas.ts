import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().min(1, 'Enter your email').email('That does not look like an email'),
  password: z.string().min(6, 'Passwords are at least 6 characters'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, 'The code is 6 digits')
    .regex(/^\d+$/, 'Digits only'),
});

export type OtpValues = z.infer<typeof otpSchema>;
