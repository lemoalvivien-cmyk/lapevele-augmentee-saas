import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminGuard from "@/components/AdminGuard";
import { RefreshCw, TrendingUp, DollarSign, Users, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// ═══════════════════════════════════════════════════════════════════════
// PAGE /admin/revenue — Dashboard MRR en temps réel
// CDC V4 Supernova §4 — Phase 1
// ═══════════════════════════════════════════════════════════════════════

export default function Revenue() {
  const [mrrData, setMrrData] = useState(null);
  const [events, setEvents] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRevenue();
  }, []);

  const loadRevenue = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mrrRes, histRes, subsRes] = await Promise.allSettled([
        base44.functions.invoke("trackRevenue", { operation: "get_mrr" }),
        base44.functions.invoke("trackRevenue", { operation: "get_history", limit: 50 }),
        base44.asServiceRole?.entities?.SubscriptionSnapshot?.filter({ status: "active" }).catch(() => []) ||
          base44.entities.SubscriptionSnapshot?.filter({ status: "active" }).catch(() => []),
      ]);

      if (mrrRes.status === 'fulfilled') setMrrData(mrrRes.value.data);
      if (histRes.status === 'fulfilled') setEvents(histRes.value.data?.events || []);
      if (subsRes.status === 'fulfilled') setSubs(Array.isArray(subsRes.value) ? subsRes.value : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Préparer les données du graphique mensuel
  const chartData = mrrData?.by_month
    ? Object.entries(mrrData.by_month)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({
          mois: month.substring(5), // MM
          mrr: Math.round(amount),
        }))
    : [];

  // Données par flux
  const fluxData = mrrData?.by_flux
    ? Object.entries(mrrData.by_flux).map(([produit, montant]) => ({
        produit: produit.replace("_", " "),
        montant: Math.round(montant),
      }))
    : [];

  const target_mrr = 2500; // Gate Phase 1
  const mrr = mrrData?.mrr_current_month || 0;
  const progress = Math.min(100, Math.round((mrr / target_mrr) * 100));

  return (
    <AdminGuard>
      <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="max-w-5xl mx-auto px-4 py-10">

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1D1836" }}>Dashboard Revenue</h1>
              <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>
                MRR en temps réel · Phase 1 — Gate: 2 500€
              </p>
            </div>
            <button onClick={loadRevenue} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow transition-all hover:scale-105 disabled:opacity-60"
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

          {/* Gate Progress */}
          <div className="bg-white rounded-2xl p-6 border-2 mb-6 shadow-sm"
            style={{ borderColor: progress >= 100 ? "#16A34A" : "rgba(29,24,54,0.1)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-black" style={{ color: "#1D1836" }}>Gate Phase 1 → Phase 2</h2>
                <p className="text-sm" style={{ color: "#1D1836", opacity: 0.5 }}>
                  MRR actuel / Objectif 2 500€
                </p>
              </div>
              <span className={`text-sm px-3 py-1 rounded-full font-black ${progress >= 100 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {progress >= 100 ? "✅ GATE OUVERT" : `${progress}% atteint`}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  backgroundColor: progress >= 100 ? "#16A34A" : "#FF6A00",
                }} />
            </div>
            <div className="flex justify-between mt-2 text-xs font-bold" style={{ color: "#1D1836", opacity: 0.5 }}>
              <span>{mrr.toFixed(0)}€ MRR</span>
              <span>Objectif: 2 500€</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="MRR Mois en cours"
              value={`${(mrrData?.mrr_current_month || 0).toFixed(0)}€`}
              icon={<DollarSign className="w-5 h-5" />}
              color="#FF6A00"
            />
            <KPICard
              label="ARR estimé"
              value={`${(mrrData?.arr_estimate || 0).toFixed(0)}€`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="#3B82F6"
            />
            <KPICard
              label="Abonnements actifs"
              value={mrrData?.active_subscriptions || subs.length || 0}
              icon={<Users className="w-5 h-5" />}
              color="#10B981"
            />
            <KPICard
              label="Événements ce mois"
              value={mrrData?.events_this_month || 0}
              icon={<Zap className="w-5 h-5" />}
              color="#8B5CF6"
            />
          </div>

          {/* Graphique MRR sur 12 mois */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border-2 shadow-sm mb-6"
              style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <h2 className="font-black mb-4" style={{ color: "#1D1836" }}>MRR — 12 derniers mois</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(v) => [`${v}€`, "MRR"]} />
                  <Area type="monotone" dataKey="mrr" stroke="#FF6A00" fill="rgba(255,106,0,0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenus par flux */}
          {fluxData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border-2 shadow-sm mb-6"
              style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <h2 className="font-black mb-4" style={{ color: "#1D1836" }}>Revenus par flux</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={fluxData}>
                  <XAxis dataKey="produit" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(v) => [`${v}€`, "Montant"]} />
                  <Bar dataKey="montant" fill="#FF6A00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Abonnements actifs */}
          {subs.length > 0 && (
            <div className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm mb-6"
              style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
                <h2 className="font-black" style={{ color: "#1D1836" }}>Abonnements actifs ({subs.length})</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                    {["Commune", "Plan", "Statut", "Montant/mois", "Début"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest"
                        style={{ color: "#1D1836", opacity: 0.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s, i) => (
                    <tr key={i} className="border-b last:border-0" style={{ borderColor: "rgba(29,24,54,0.05)" }}>
                      <td className="px-5 py-3 font-bold text-sm" style={{ color: "#1D1836" }}>{s.commune_nom || s.commune_id}</td>
                      <td className="px-5 py-3 text-sm capitalize" style={{ color: "#1D1836", opacity: 0.7 }}>{s.plan_tier}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-black" style={{ color: "#FF6A00" }}>{s.montant_mensuel || 0}€</td>
                      <td className="px-5 py-3 text-xs font-mono" style={{ color: "#1D1836", opacity: 0.5 }}>
                        {s.started_at ? new Date(s.started_at).toLocaleDateString("fr-FR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Derniers événements */}
          {events.length > 0 && (
            <div className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm"
              style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
                <h2 className="font-black" style={{ color: "#1D1836" }}>Historique des événements</h2>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(29,24,54,0.05)" }}>
                {events.slice(0, 20).map((e, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#1D1836" }}>
                        {e.type?.replace(/_/g, " ")} · {e.commune || "—"}
                      </p>
                      <p className="text-xs" style={{ color: "#1D1836", opacity: 0.4 }}>
                        {e.timestamp ? new Date(e.timestamp).toLocaleString("fr-FR") : "—"}
                        {e.produit && ` · ${e.produit}`}
                      </p>
                    </div>
                    <span className={`font-black text-sm ${e.type === 'subscription_canceled' ? "text-red-500" : "text-green-600"}`}>
                      {e.type === 'subscription_canceled' ? "-" : "+"}{e.montant?.toFixed(0) || 0}€
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {events.length === 0 && !loading && (
            <div className="bg-white rounded-2xl p-10 text-center border-2" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <DollarSign className="w-10 h-10 mx-auto mb-3" style={{ color: "#1D1836", opacity: 0.2 }} />
              <p className="font-bold" style={{ color: "#1D1836", opacity: 0.5 }}>Aucun événement de revenu</p>
              <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.4 }}>
                Les événements apparaîtront ici après les premiers abonnements via /mairie-plus
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
