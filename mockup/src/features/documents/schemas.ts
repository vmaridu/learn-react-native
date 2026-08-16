import { z } from 'zod';

export const acknowledgeSchema = z.object({
  signedName: z.string().min(2, 'Type your full name to sign'),
});

export type AcknowledgeValues = z.infer<typeof acknowledgeSchema>;
