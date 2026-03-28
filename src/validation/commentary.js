import { z } from 'zod';

export const listCommentaryQuerySchema = z.object({
    limit: z.coerce.number().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
    minute: z.number().int().nonnegative().optional(),
    sequence: z.number().optional(),
    period: z.string().optional(),
    eventType: z.string().optional(),
    actor: z.string().optional(),
    team: z.string().optional(),
    message: z.string({
        required_error: 'Message is required',
    }),
    metadata: z.record(z.string(), z.any()).optional(),
    tags: z.array(z.string()).optional(),
});
