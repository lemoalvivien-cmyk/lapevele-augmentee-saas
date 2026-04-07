import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { village_post, type_reaction, user_email } = await req.json();

    if (!village_post || !type_reaction || !user_email) {
      return Response.json({ exists: false });
    }

    const existing = await base44.asServiceRole.entities.VillageReaction.filter({
      village_post,
      type_reaction,
      user_email,
    });

    return Response.json({ exists: existing.length > 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});