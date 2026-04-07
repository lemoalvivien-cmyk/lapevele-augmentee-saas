import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const ago90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Purge SuiviPublicToken expirés — batch delete
  let tokens = 0;
  try {
    const expired = await base44.asServiceRole.entities.SuiviPublicToken.filter({ actif: true });
    const toDelete = expired.filter(t => t.expires_at && t.expires_at < now);
    const deletePromises = toDelete.map(t => base44.asServiceRole.entities.SuiviPublicToken.delete(t.id).catch(() => {}));
    await Promise.all(deletePromises);
    tokens = toDelete.length;
  } catch (e) { console.error('SuiviPublicToken purge error:', e.message); }

  // Purge RateLimitLog > 24h — batch delete
  let rateLogs = 0;
  try {
    const old = await base44.asServiceRole.entities.RateLimitLog.filter({});
    const toDelete = old.filter(r => r.timestamp && r.timestamp < ago24h);
    const deletePromises = toDelete.map(r => base44.asServiceRole.entities.RateLimitLog.delete(r.id).catch(() => {}));
    await Promise.all(deletePromises);
    rateLogs = toDelete.length;
  } catch (e) { console.error('RateLimitLog purge error:', e.message); }

  // Purge EmailLog > 90 jours — batch delete
  let emailLogs = 0;
  try {
    const old = await base44.asServiceRole.entities.EmailLog.filter({});
    const toDelete = old.filter(e => e.created_date && e.created_date < ago90d);
    const deletePromises = toDelete.map(e => base44.asServiceRole.entities.EmailLog.delete(e.id).catch(() => {}));
    await Promise.all(deletePromises);
    emailLogs = toDelete.length;
  } catch (e) { console.error('EmailLog purge error:', e.message); }

  console.log(`Purge RGPD: ${tokens} tokens, ${rateLogs} rateLogs, ${emailLogs} emailLogs supprimés`);

  return Response.json({
    success: true,
    deleted: { tokens, rateLogs, emailLogs },
    timestamp: now,
  });
});