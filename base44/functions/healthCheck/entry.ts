import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const timestamp = new Date().toISOString();
  const version = "1.0.0";

  // Check database
  let database = false;
  try {
    await base44.asServiceRole.entities.Commune.filter({ statut: "active" }, null, 1);
    database = true;
  } catch {
    database = false;
  }

  // Check Resend API
  let email = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    email = res.status < 500;
  } catch {
    email = false;
  }

  const status = !database ? "down" : !email ? "degraded" : "ok";

  return Response.json({ status, database, email, timestamp, version });
});