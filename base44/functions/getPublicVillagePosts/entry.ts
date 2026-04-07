import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const posts = await base44.asServiceRole.entities.VillagePost.filter(
      { est_public: true },
      "-published_at",
      100
    );
    return Response.json(posts);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});