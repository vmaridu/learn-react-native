import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('That does not look like an email'),
  phone: z
    .string()
    .min(10, 'Enter a phone number we can reach you on')
    .max(20, 'That is too long for a phone number'),
});

export type ProfileValues = z.infer<typeof profileSchema>;
