import { z } from 'zod';

import { ARC_CATEGORIES, REQUEST_CATEGORIES } from './types';

export const disputeSchema = z.object({
  reason: z
    .string()
    .min(30, 'Give the committee enough detail to act on — 30 characters minimum')
    .max(1500, 'Keep it under 1500 characters'),
});

export type DisputeValues = z.infer<typeof disputeSchema>;

export const arcSchema = z.object({
  title: z.string().min(4, 'Give the project a short name'),
  category: z.enum(ARC_CATEGORIES),
  description: z
    .string()
    .min(40, 'Describe materials, dimensions and placement — 40 characters minimum'),
  contractor: z.string().min(2, 'Enter the contractor, or “Self” if doing the work yourself'),
  estimatedStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick an estimated start date'),
});

export type ArcValues = z.infer<typeof arcSchema>;

export const serviceRequestSchema = z.object({
  category: z.enum(REQUEST_CATEGORIES),
  title: z.string().min(4, 'Summarise the issue in a few words'),
  detail: z.string().min(20, 'Add a little more detail — 20 characters minimum'),
  location: z.string().min(3, 'Where is it?'),
  priority: z.enum(['low', 'normal', 'urgent']),
});

export type ServiceRequestValues = z.infer<typeof serviceRequestSchema>;
