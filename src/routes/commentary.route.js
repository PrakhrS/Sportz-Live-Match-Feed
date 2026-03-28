import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { matchEvents } from "../events.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get("/", async (req, res) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params)
    if (!paramsResult.success) {
        return res.status(400).json({ error: 'Invalid match ID.', details: paramsResult.error.issues })
    }

    const queryResult = listCommentaryQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
        return res.status(400).json({ error: 'Invalid query parameters.', details: queryResult.error.issues })
    }

    try {
        const MAX_LIMIT = 100;
        const limitCount = Math.min(queryResult.data.limit || MAX_LIMIT, MAX_LIMIT);

        const result = await db.select()
            .from(commentary)
            .where(eq(commentary.matchId, paramsResult.data.id))
            .orderBy(desc(commentary.createdAt))
            .limit(limitCount);

        res.status(200).json({ data: result })
    } catch (error) {
        console.error('Failed to fetch commentary:', error)
        res.status(500).json({ error: 'Failed to fetch commentary.' })
    }
});

commentaryRouter.post("/", async (req, res) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params)
    if (!paramsResult.success){
        return res.status(400).json({error: 'Invalid match ID.', details: paramsResult.error.issues})
    }

    const bodyResult = createCommentarySchema.safeParse(req.body)
    if(!bodyResult.success){
        return res.status(400).json({error: 'Invalid commentary payload.', details: bodyResult.error.issues})
    }

    try{
        const [result] = await db.insert(commentary).values({
            matchId: paramsResult.data.id,
            ...bodyResult.data
        }).returning()

        matchEvents.emit('commentary', result.matchId, result);

        res.status(201).json({data: result})
    } catch(error){
        console.error('Failed to create commentary:', error)
        res.status(500).json({error: 'Failed to create commentary.'})
    }
});
