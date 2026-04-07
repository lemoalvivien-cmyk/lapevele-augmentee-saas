import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const hours = parseInt(body.hours || '24', 10);
    const hoursAgo = new Date(Date.now() - hours * 3600000);

    // Get AI job logs for last N hours
    const logs = await base44.asServiceRole.entities.AIJobLog.filter({
      created_date: { $gte: hoursAgo.toISOString() },
    }, '-created_date', 1000).catch(() => []);

    // Calculate stats
    const total_calls = logs.length;
    const success_calls = logs.filter(l => l.success).length;
    const error_calls = logs.filter(l => !l.success).length;
    const local_faq_hits = logs.filter(l => l.error_message === 'LOCAL_FAQ_HIT').length;

    const by_mode = {};
    logs.forEach(l => {
      by_mode[l.mode] = (by_mode[l.mode] || 0) + 1;
    });

    const avg_latency_ms = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / logs.length)
      : 0;

    return Response.json({
      total_calls,
      success_calls,
      error_calls,
      local_faq_hits,
      by_mode,
      avg_latency_ms,
      period_hours: hours,
    });
  } catch (error) {
    console.error('[getAiStats] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});