import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { post_ids } = await req.json();

  if (!Array.isArray(post_ids) || post_ids.length === 0) {
    return Response.json({});
  }

  if (post_ids.length > 50) {
    return Response.json({ error: 'Too many post_ids — max 50' }, { status: 400 });
  }

  const counts = {};
  const BATCH_SIZE = 10;

  for (let i = 0; i < post_ids.length; i += BATCH_SIZE) {
    const batch = post_ids.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (id) => {
      const reactions = await base44.asServiceRole.entities.VillageReaction.filter({ village_post: id });
      const tally = { merci: 0, present: 0, je_peux_aider: 0 };
      for (const r of reactions) {
        if (tally[r.type_reaction] !== undefined) tally[r.type_reaction]++;
      }
      counts[id] = tally;
    }));
  }

  return Response.json(counts);
});