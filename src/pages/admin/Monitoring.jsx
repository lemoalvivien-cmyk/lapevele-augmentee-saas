import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import AdminGuard from "@/components/AdminGuard";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Trash2 } from "lucide-react";

const MAX_HISTORY = 10;
const INTERVAL_MS = 30000;

function StatusBadge({ status }) {
  if (status === "ok") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black bg-green-100 text-green-700 border border-green-300">
      <CheckCircle className="w-4 h-4" /> OK
    </span>
  );
  if (status === "degraded") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black bg-yellow-100 text-yellow-700 border border-yellow-300">
      <AlertTriangle className="w-4 h-4" /> Dégradé
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black bg-red-100 text-red-700 border border-red-300">
      <XCircle className="w-4 h-4" /> DOWN
    </span>
  );
}

function BoolBadge({ value }) {
  return value
    ? <span className="text-green-700 font-black">✓ OK</span>
    : <span className="text-red-600 font-black">✗ KO</span>;
}

export default function Monitoring() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);

  const runCheck = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("healthCheck", {});
      const data = res.data;
      setChecks(prev => [data, ...prev].slice(0, MAX_HISTORY));
    } catch (err) {
      setChecks(prev => [{
        status: "down",
        database: false,
        email: false,
        timestamp: new Date().toISOString(),
        version: "?",
        error: err.message,
      }, ...prev].slice(0, MAX_HISTORY));
    } finally {
      setLoading(false);
    }
  };

  const loadAiStats = async () => {
    setAiStatsLoading(true);
    try {
      const res = await base44.functions.invoke('getAiStats', { hours: 24 });
      setAiStats(res.data);
    } catch (err) {
      setAiStats({ error: err.message });
    } finally {
      setAiStatsLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
    loadAiStats();
    intervalRef.current = setInterval(() => {
      runCheck();
      loadAiStats();
    }, INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, []);

  const latest = checks[0];
  const isAlert = latest && (latest.status === "degraded" || latest.status === "down");

  return (
    <AdminGuard>
      <div className="min-h-screen font-sans" style={{ backgroundColor: isAlert ? "#FFF0F0" : "#FFF8F1" }}>
        {isAlert && (
          <div className="px-4 py-3 text-center font-black text-white text-sm"
            style={{ backgroundColor: latest.status === "down" ? "#DC2626" : "#D97706" }}>
            ⚠️ ALERTE : plateforme {latest.status === "down" ? "HORS LIGNE" : "DÉGRADÉE"} — {new Date(latest.timestamp).toLocaleTimeString("fr-FR")}
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1D1836" }}>Monitoring plateforme</h1>
              <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>Rafraîchissement toutes les 30 secondes</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setPurgeLoading(true);
                  setPurgeResult(null);
                  try {
                    const res = await base44.functions.invoke('purgeExpiredData', {});
                    setPurgeResult(res.data);
                  } catch (e) {
                    setPurgeResult({ error: e.message });
                  } finally {
                    setPurgeLoading(false);
                  }
                }}
                disabled={purgeLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all hover:scale-105 disabled:opacity-60"
                style={{ borderColor: "#1D1836", color: "#1D1836", backgroundColor: "white" }}>
                <Trash2 className={`w-4 h-4 ${purgeLoading ? "animate-spin" : ""}`} />
                {purgeLoading ? "Purge…" : "Purge RGPD"}
              </button>
              <button onClick={runCheck} disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow transition-all hover:scale-105 disabled:opacity-60"
                style={{ backgroundColor: "#FF6A00" }}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Vérifier maintenant
              </button>
            </div>
          </div>
          {purgeResult && (
            <div className={`mx-0 mb-4 px-5 py-3 rounded-xl text-sm font-bold border-2 ${
              purgeResult.error ? 'border-red-300 bg-red-50 text-red-700' : 'border-green-300 bg-green-50 text-green-700'
            }`}>
              {purgeResult.error
                ? `Erreur purge : ${purgeResult.error}`
                : `✅ Purge effectuée — tokens: ${purgeResult.deleted_tokens ?? 0}, rate limits: ${purgeResult.deleted_rate_limits ?? 0}, email logs: ${purgeResult.deleted_email_logs ?? 0}`
              }
            </div>
          )}

          {/* Stats IA */}
          {aiStats && !aiStats.error && (
            <div className="bg-white rounded-2xl border-2 border-ink/10 p-6 mb-6 shadow-sm">
              <h2 className="font-black text-lg mb-4" style={{ color: "#1D1836" }}>Métriques IA (24h)</h2>
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
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>Fallback local</p>
                  <p className="font-black text-xl" style={{ color: "#D97706" }}>{aiStats.local_faq_hits || 0}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-ink/10 text-sm">
                <p className="text-xs font-semibold mb-2" style={{ color: "#1D1836", opacity: 0.5 }}>Par mode</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {Object.entries(aiStats.by_mode || {}).map(([mode, count]) => (
                    <div key={mode} className="px-3 py-1.5 rounded-lg bg-secondary">
                      <span style={{ color: "#1D1836", opacity: 0.7 }}>{mode}: </span>
                      <span className="font-black" style={{ color: "#1D1836" }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              {aiStats.avg_latency_ms && (
                <p className="text-xs mt-3" style={{ color: "#1D1836", opacity: 0.5 }}>
                  ⏱️ Latence moyenne: {Math.round(aiStats.avg_latency_ms)}ms
                </p>
              )}
            </div>
          )}
          {aiStats?.error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700 font-bold">
              Erreur chargement stats IA: {aiStats.error}
            </div>
          )}

          {/* Statut courant */}
           {latest ? (
            <div className="bg-white rounded-2xl border-2 p-6 mb-6 shadow-sm"
              style={{ borderColor: isAlert ? (latest.status === "down" ? "#DC2626" : "#D97706") : "rgba(29,24,54,0.1)" }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-lg" style={{ color: "#1D1836" }}>État actuel</h2>
                <StatusBadge status={latest.status} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-xl py-4 px-3">
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>Base de données</p>
                  <BoolBadge value={latest.database} />
                </div>
                <div className="bg-gray-50 rounded-xl py-4 px-3">
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>Email (Resend)</p>
                  <BoolBadge value={latest.email} />
                </div>
                <div className="bg-gray-50 rounded-xl py-4 px-3">
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>Version</p>
                  <span className="font-black text-sm" style={{ color: "#1D1836" }}>{latest.version}</span>
                </div>
              </div>
              <p className="text-xs mt-4 text-right" style={{ color: "#1D1836", opacity: 0.4 }}>
                Dernier check : {new Date(latest.timestamp).toLocaleString("fr-FR")}
              </p>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-2xl border-2 border-ink/10 p-10 mb-6 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#FF6A00" }} />
              <p className="font-bold" style={{ color: "#1D1836", opacity: 0.5 }}>Vérification en cours…</p>
            </div>
          ) : null}

          {/* Historique */}
          {checks.length > 1 && (
            <div className="bg-white rounded-2xl border-2 border-ink/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink/10">
                <h2 className="font-black text-base" style={{ color: "#1D1836" }}>Historique des {checks.length} derniers checks</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10">
                    <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.4 }}>Heure</th>
                    <th className="text-left px-3 py-3 text-xs font-black uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.4 }}>Statut</th>
                    <th className="text-center px-3 py-3 text-xs font-black uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.4 }}>DB</th>
                    <th className="text-center px-3 py-3 text-xs font-black uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.4 }}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((c, i) => (
                    <tr key={i} className="border-b border-ink/5 last:border-0"
                      style={{ backgroundColor: i === 0 ? "rgba(255,106,0,0.04)" : "transparent" }}>
                      <td className="px-5 py-3 font-mono text-xs" style={{ color: "#1D1836", opacity: 0.6 }}>
                        {new Date(c.timestamp).toLocaleTimeString("fr-FR")}
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-3 py-3 text-center"><BoolBadge value={c.database} /></td>
                      <td className="px-3 py-3 text-center"><BoolBadge value={c.email} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}