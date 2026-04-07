import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

const STATUT_LABELS = { nouveau: "Nouveau", en_cours: "En cours", contacte: "Contacté", sans_suite: "Sans suite", converti: "Converti" };
const STATUT_COLORS = { nouveau: "#FFD84D", en_cours: "#63C7FF", contacte: "#FF6FB5", sans_suite: "#e0e0e0", converti: "#B8F5C4" };
const SIGNAL_LABELS = {
  creation_entreprise: "🏢 Création",
  recrutement: "👥 Recrutement",
  levee_fonds: "💰 Levée de fonds",
  appel_offre: "📋 Appel d'offre",
  demenagement: "🚚 Déménagement",
  croissance: "📈 Croissance",
  autre: "✨ Autre"
};

export default function B2BProspection() {
  const [signaux, setSignaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState({});
  const [filtre, setFiltre] = useState("tous");
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [data, statsRes] = await Promise.all([
        base44.functions.invoke("scanBODACC", { operation: "list", limit: 50 }).catch(() => ({ data: { data: [] } })),
        base44.functions.invoke("scanBODACC", { operation: "stats" }).catch(() => ({ data: { data: {} } })),
      ]);
      setSignaux(data.data?.data ?? []);
      setStats(statsRes.data?.data ?? {});
    } finally {
      setLoading(false);
    }
  };

  const scan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("scanBODACC", { operation: "scan" });
      if (res.data?.success) {
        await load();
      } else {
        setError(res.data?.error ?? "Erreur lors du scan");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const updateStatut = async (id, newStatut) => {
    await base44.entities.ProspectionSignal.update(id, { statut: newStatut }).catch(() => {});
    setSignaux(prev => prev.map(s => s.id === id ? { ...s, statut: newStatut } : s));
  };

  const filtered = filtre === "tous" ? signaux : signaux.filter(s => s.statut === filtre);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black" style={{ color: "#1D1836" }}>📡 Signaux de prospection</h1>
            <p className="text-sm font-medium mt-1" style={{ color: "#1D1836", opacity: 0.6 }}>
              Nouvelles entreprises BODACC · Opportunités de mise en relation
            </p>
          </div>
          <button onClick={scan} disabled={scanning}
            className="inline-flex items-center gap-2 font-black py-3 px-6 rounded-2xl border-2 text-sm transition-all hover:shadow-md disabled:opacity-60"
            style={{ borderColor: "#1D1836", color: "#1D1836", backgroundColor: "white" }}>
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Scanner BODACC
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total signaux", value: stats.total ?? 0, icon: "📡" },
            { label: "Nouveaux", value: stats.by_statut?.nouveau ?? 0, icon: "🆕", color: "#FFD84D" },
            { label: "Convertis", value: stats.by_statut?.converti ?? 0, icon: "✅", color: "#B8F5C4" },
            { label: "En cours", value: stats.by_statut?.en_cours ?? 0, icon: "⚡", color: "#63C7FF" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border-2 p-4 text-center" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black" style={{ color: "#1D1836" }}>{s.value}</div>
              <div className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {["tous", "nouveau", "en_cours", "contacte", "converti", "sans_suite"].map(f => (
            <button key={f} onClick={() => setFiltre(f)}
              className="shrink-0 px-4 py-2 rounded-full text-xs font-black border-2 transition-all capitalize"
              style={{
                backgroundColor: filtre === f ? (STATUT_COLORS[f] ?? "#FFD84D") : "white",
                borderColor: filtre === f ? "#1D1836" : "rgba(29,24,54,0.15)",
                color: "#1D1836"
              }}>
              {f === "tous" ? "Tous" : STATUT_LABELS[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
            <div className="text-4xl mb-3">📡</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Aucun signal</h2>
            <p className="text-sm mb-4" style={{ color: "#1D1836", opacity: 0.6 }}>Lancez un scan BODACC pour importer les nouvelles entreprises de Pévèle.</p>
            <button onClick={scan} disabled={scanning}
              className="inline-flex items-center gap-2 text-white font-black py-3 px-6 rounded-2xl text-sm"
              style={{ backgroundColor: "#FF6A00" }}>
              <RefreshCw className="w-4 h-4" /> Scanner maintenant
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(signal => (
              <div key={signal.id} className="bg-white rounded-2xl border-2 p-4 hover:shadow-md transition-shadow"
                style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: STATUT_COLORS[signal.statut] ?? "#e0e0e0", color: "#1D1836" }}>
                        {STATUT_LABELS[signal.statut]}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100">
                        {SIGNAL_LABELS[signal.type_signal] ?? signal.type_signal}
                      </span>
                      {signal.score_pertinence >= 70 && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FF6A00", color: "white" }}>
                          🔥 Priorité
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-base mb-1" style={{ color: "#1D1836" }}>{signal.nom_entreprise}</h3>
                    <p className="text-xs mb-2" style={{ color: "#1D1836", opacity: 0.65 }}>{signal.description}</p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>
                      <span>📍 {signal.commune}</span>
                      {signal.secteur && <span>🏭 {signal.secteur}</span>}
                      {signal.siret && <span>SIRET: {signal.siret}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <select value={signal.statut} onChange={e => updateStatut(signal.id, e.target.value)}
                      className="text-xs border-2 rounded-xl px-3 py-1.5 focus:outline-none"
                      style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
                      {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    {signal.url_source && (
                      <a href={signal.url_source} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-bold text-center px-3 py-1.5 rounded-xl border-2 transition-all hover:bg-gray-50"
                        style={{ borderColor: "rgba(29,24,54,0.15)", color: "#FF6A00" }}>
                        Voir BODACC
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
