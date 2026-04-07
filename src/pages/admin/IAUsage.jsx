import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminGuard from "@/components/AdminGuard";
import { RefreshCw, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ═══════════════════════════════════════════════════════════════════════
// PAGE /admin/ia-usage — Monitoring coûts IA par niveau
// CDC V4 Supernova §4 — Phase 1
// Règle : si coût IA > 15% MRR → alerte + downgrade forcé L1
// ═══════════════════════════════════════════════════════════════════════

const LEVEL_COLORS = { L1: "#10B981", L2: "#3B82F6", L3: "#EF4444" };

export default function IAUsage() {
  const [metrics, setMetrics] = useState([]);
  const [aiStats, setAiStats] = useState(null);
  const [mrrData, setMrrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, mrrRes, metricsRes] = await Promise.allSettled([
        base44.functions.invoke("getAiStats", { hours: 168 }), // 7 jours
        base44.functions.invoke("trackRevenue", { operation: "get_mrr" }),
        base44.entities.AIUsageMetric.filter({}).catch(() => []),
      ]);

      if (statsRes.status === 'fulfilled') setAiStats(statsRes.value.data);
      if (mrrRes.status === 'fulfilled') setMrrData(mrrRes.value.data);
      if (metricsRes.status === 'fulfilled') setMetrics(Array.isArray(metricsRes.value) ? metricsRes.value : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les stats par niveau
  const metricsByLevel = metrics.reduce((acc, m) => {
    const level = m.level || 'L1';
    if (!acc[level]) acc[level] = { count: 0, cost: 0, success: 0, latency: 0 };
    acc[level].count++;
    acc[level].cost += m.cost_eur || 0;
    if (m.success) acc[level].success++;
    acc[level].latency += m.latency_ms || 0;
    return acc;
  }, {});

  const totalCost = Object.values(metricsByLevel).reduce((s, m) => s + m.cost, 0);
  const mrr = mrrData?.mrr_current_month || 0;
  const costRatio = mrr > 0 ? (totalCost / mrr) * 100 : 0;
  const iaCostAlert = costRatio > 15;

  // Données graphique par niveau
  const levelChartData = Object.entries(metricsByLevel).map(([level, data]) => ({
    level,
    requêtes: data.count,
    coût: Math.round(data.cost * 100) / 100,
    taux_succès: data.count > 0 ? Math.round((data.success / data.count) * 100) : 0,
  }));

  // Données par mode
  const metricsByMode = metrics.reduce((acc, m) => {
    const mode = m.mode || 'unknown';
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {});

  const modeChartData = Object.entries(metricsByMode)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([mode, count]) => ({ mode: mode.replace(/_/g, " "), count }));

  // Métriques récentes
  const recentMetrics = metrics
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 30);

  return (
    <AdminGuard>
      <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="max-w-5xl mx-auto px-4 py-10">

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1D1836" }}>Monitoring IA</h1>
              <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>
                Coûts par niveau · Architecture Cheap-First L1/L2/L3
              </p>
            </div>
            <button onClick={loadData} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 disabled:opacity-60"
              style={{ backgroundColor: "#FF6A00" }}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>

          {error && (
            <div className="mb-6 px-5 py-3 rounded-xl text-sm font-bold border-2 border-red-300 bg-red-50 text-red-700">
              {error}
            </div>
          )}

          {/* Alerte Kill Switch §7 */}
          {iaCostAlert && (
            <div className="mb-6 px-5 py-4 rounded-2xl border-2 border-red-400 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-black text-red-700">🔴 KILL SWITCH IA — Coût dépasse 15% du MRR</span>
              </div>
              <p className="text-sm text-red-600">
                Coût IA estimé: <strong>{totalCost.toFixed(2)}€</strong> · MRR: <strong>{mrr.toFixed(0)}€</strong> · Ratio: <strong>{costRatio.toFixed(1)}%</strong>
              </p>
              <p className="text-sm text-red-600 mt-1">
                Action requise : forcer downgrade L1 dans AIRouterConfig ou réduire la fréquence des appels L2/L3.
              </p>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total requêtes" value={metrics.length} icon={<Zap className="w-5 h-5" />} color="#FF6A00" />
            <KPICard label="Coût total estimé" value={`${totalCost.toFixed(3)}€`} icon={<TrendingUp className="w-5 h-5" />} color="#3B82F6" />
            <KPICard label="Coût / MRR" value={`${costRatio.toFixed(1)}%`} icon={<AlertTriangle className="w-5 h-5" />} color={iaCostAlert ? "#EF4444" : "#10B981"} />
            <KPICard
              label="Taux succès global"
              value={metrics.length > 0 ? `${Math.round((metrics.filter(m => m.success).length / metrics.length) * 100)}%` : "—"}
              icon={<Zap className="w-5 h-5" />}
              color="#10B981"
            />
          </div>

          {/* Stats par niveau */}
          {levelChartData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border-2 shadow-sm mb-6"
              style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <h2 className="font-black mb-4" style={{ color: "#1D1836" }}>Requêtes par niveau IA</h2>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                {levelChartData.map(({ level, requêtes, coût, taux_succès }) => (
                  <div key={level} className="rounded-xl p-4 text-center"
                    style={{ backgroundColor: `${LEVEL_COLORS[level]}10`, border: `2px solid ${LEVEL_COLORS[level]}30` }}>
                    <p className="font-black text-lg" style={{ color: LEVEL_COLORS[level] }}>{level}</p>
                    <p className="text-2xl font-black mt-1" style={{ color: "#1D1836" }}>{requêtes}</p>
                    <p className="text-xs mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>requêtes</p>
                    <p className="text-sm font-bold mt-2" style={{ color: "#1D1836" }}>{coût}€</p>
                    <p className="text-xs" style={{ color: "#1D1836", opacity: 0.4 }}>coût · {taux_succès}% succès</p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={levelChartData}>
                  <XAxis dataKey="level" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requêtes" fill="#FF6A00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stats getAiStats (legacy Qwen) */}
          {aiStats && (
            <div className="bg-white rounded-2xl p-6 border-2 shadow-sm mb-6"
              style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <h2 className="font-black mb-4" style={{ color: "#1D1836" }}>Stats IA légacy (7 jours)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-blue-50 rounded-xl py-4 px-3">
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>Total appels</p>
                  <p className="font-black text-xl" style={{ color: "#1D1836" }}>{aiStats.total_calls || 0}</p>
                </div>
                <div className="bg-green-50 rounded-xl py-4 px-3">
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>Succès</p>
                  <p className="font-black text-xl text-green-600">{aiStats.success_calls || 0}</p>
                </div>
                <div className="bg-red-50 rounded-xl py-4 px-3">
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>Erreurs</p>
                  <p className="font-black text-xl text-red-600">{aiStats.error_calls || 0}</p>
                </div>
                <div className="bg-yellow-50 rounded-xl py-4 px-3">
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>FAQ Local</p>
                  <p className="font-black text-xl" style={{ color: "#D97706" }}>{aiStats.local_faq_hits || 0}</p>
                </div>
              </div>
              {aiStats.avg_latency_ms && (
                <p className="text-xs mt-4" style={{ color: "#1D1836", opacity: 0.4 }}>
                  ⏱️ Latence moyenne: {Math.round(aiStats.avg_latency_ms)}ms
                </p>
              )}
            </div>
          )}

          {/* Top modes */}
          {modeChartData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border-2 shadow-sm mb-6"
              style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <h2 className="font-black mb-4" style={{ color: "#1D1836" }}>Top modes d'utilisation</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={modeChartData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="mode" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Requêtes récentes */}
          {recentMetrics.length > 0 && (
            <div className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm"
              style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
                <h2 className="font-black" style={{ color: "#1D1836" }}>Dernières requêtes IA</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                    {["Heure", "Niveau", "Mode", "Coût", "Latence", "Statut"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest"
                        style={{ color: "#1D1836", opacity: 0.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentMetrics.map((m, i) => (
                    <tr key={i} className="border-b last:border-0" style={{ borderColor: "rgba(29,24,54,0.05)" }}>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>
                        {m.timestamp ? new Date(m.timestamp).toLocaleTimeString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-black"
                          style={{ backgroundColor: `${LEVEL_COLORS[m.level] || "#666"}20`, color: LEVEL_COLORS[m.level] || "#666" }}>
                          {m.level || "?"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "#1D1836", opacity: 0.7 }}>{m.mode || "—"}</td>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{ color: "#FF6A00" }}>
                        {(m.cost_eur || 0).toFixed(4)}€
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "#1D1836", opacity: 0.6 }}>
                        {m.latency_ms ? `${m.latency_ms}ms` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-bold ${m.success ? "text-green-600" : "text-red-500"}`}>
                          {m.success ? "✓" : "✗"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {metrics.length === 0 && !loading && (
            <div className="bg-white rounded-2xl p-10 text-center border-2" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: "#1D1836", opacity: 0.2 }} />
              <p className="font-bold" style={{ color: "#1D1836", opacity: 0.5 }}>Aucune métrique IA enregistrée</p>
              <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.4 }}>
                Les métriques apparaîtront après les premiers appels via aiRouter
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}

function KPICard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.5 }}>{label}</span>
      </div>
      <p className="text-2xl font-black" style={{ color: "#1D1836" }}>{value}</p>
    </div>
  );
}
