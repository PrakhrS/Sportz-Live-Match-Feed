import { z } from 'zod';

export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Helper for ISO date validation
const isValidISODate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.valueOf()) && dateString === date.toISOString();
};

export const createMatchSchema = z.object({
  sport: z.string().trim().min(1, 'sport cannot be empty'),
  homeTeam: z.string().trim().min(1, 'homeTeam cannot be empty'),
  awayTeam: z.string().trim().min(1, 'awayTeam cannot be empty'),
  startTime: z.string().refine(isValidISODate, {
    message: 'startTime must be a valid ISO date string',
  }),
  endTime: z.string().refine(isValidISODate, {
    message: 'endTime must be a valid ISO date string',
  }),
  homeScore: z.coerce.number().int().nonnegative().optional(),
  awayScore: z.coerce.number().int().nonnegative().optional(),
}).superRefine((data, ctx) => {
  if (data.startTime && data.endTime) {
    const startDate = new Date(data.startTime).getTime();
    const endDate = new Date(data.endTime).getTime();
    
    if (endDate <= startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endTime must be chronologically after startTime',
        path: ['endTime'],
      });
    }
  }
});

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
