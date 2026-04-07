import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const events = await base44.asServiceRole.entities.EvenementLocal.filter(
      { est_public: true },
      "date_debut",
      200
    );
    return Response.json(events);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});