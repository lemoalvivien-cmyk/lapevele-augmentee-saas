import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LIMITS = {
  dossier_create: { max: 5, windowMs: 3600000 },
  reaction_create: { max: 20, windowMs: 3600000 },
  lead_create: { max: 3, windowMs: 3600000 },
};

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.length > 1000) {
      return Response.json({ error: 'Payload invalide ou trop grand' }, { status: 400 });
    }
    const base44 = createClientFromRequest(req);
    const { action, identifier } = JSON.parse(rawBody);

    if (!action || !identifier) {
      return Response.json({ error: "action et identifier requis" }, { status: 400 });
    }
    if (!LIMITS[action]) {
      return Response.json({ error: "action inconnue" }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const now = Date.now();
    const { max, windowMs } = LIMITS[action];
    const windowStart = new Date(now - windowMs).toISOString();
    const cutoff24h = new Date(now - 86400000).toISOString();

    // Auto-purge entrées > 24h
    const old = await sr.entities.RateLimitLog.filter({ action });
    const toDelete = old.filter(e => e.timestamp < cutoff24h);
    await Promise.all(toDelete.map(e => sr.entities.RateLimitLog.delete(e.id)));

    // Compter les tentatives dans la fenêtre
    const recent = await sr.entities.RateLimitLog.filter({ action, identifier });
    const inWindow = recent.filter(e => e.timestamp >= windowStart);

    if (inWindow.length >= max) {
      // Trouver la plus ancienne dans la fenêtre → retry_after
      const oldest = inWindow.reduce((a, b) => a.timestamp < b.timestamp ? a : b);
      const retryAfterMs = windowMs - (now - new Date(oldest.timestamp).getTime());
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return Response.json({ allowed: false, retry_after: retryAfterSec });
    }

    // Enregistrer la tentative
    await sr.entities.RateLimitLog.create({
      action,
      identifier,
      timestamp: new Date(now).toISOString(),
    });

    return Response.json({ allowed: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});