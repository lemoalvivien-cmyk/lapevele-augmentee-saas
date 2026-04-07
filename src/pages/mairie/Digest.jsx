import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import MairieGuard from "@/components/MairieGuard";
import { RefreshCw, Zap, FileText, CheckCircle } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// PAGE /mairie/digest — Configuration et historique digests IA
// CDC V4 Supernova §4 — Phase 1
// ═══════════════════════════════════════════════════════════════════════

export default function Digest() {
  const [digests, setDigests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  const [error, setError] = useState(null);
  const [commune, setCommune] = useState("");

  useEffect(() => {
    loadDigests();
  }, []);

  const loadDigests = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.DailyDigest.filter({});
      const sorted = list.sort((a, b) =>
        new Date(b.generated_at || b.created_date || 0) - new Date(a.generated_at || a.created_date || 0)
      );
      setDigests(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke("generateDigest", {
        commune_nom: commune || undefined,
        period_days: 7,
        force: true,
      });
      setGenerateResult(res.data);
      loadDigests();
    } catch (err) {
      setError(err.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <MairieGuard>
      <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="max-w-4xl mx-auto px-4 py-10">

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1D1836" }}>Digests IA</h1>
              <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>
                Résumés hebdomadaires générés par intelligence artificielle
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm text-white shadow transition-all hover:scale-105 disabled:opacity-60"
              style={{ backgroundColor: "#FF6A00" }}>
              <Zap className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
              {generating ? "Génération…" : "Générer maintenant"}
            </button>
          </div>

          {error && (
            <div className="mb-6 px-5 py-3 rounded-xl text-sm font-bold border-2 border-red-300 bg-red-50 text-red-700">
              {error}
            </div>
          )}

          {/* Configuration */}
          <div className="bg-white rounded-2xl p-6 border-2 border-ink/10 mb-6 shadow-sm">
            <h2 className="font-black mb-4" style={{ color: "#1D1836" }}>Configuration</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black mb-1.5 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.5 }}>
                  Commune (optionnel)
                </label>
                <input
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  placeholder="Nom de la commune"
                  className="w-full px-4 py-2.5 rounded-xl border-2 text-sm focus:outline-none"
                  style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}
                />
              </div>
              <div className="flex items-end">
                <div className="px-4 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: "rgba(29,24,54,0.05)", color: "#1D1836" }}>
                  📅 Fréquence : hebdomadaire (dimanche)
                </div>
              </div>
            </div>
          </div>

          {/* Résultat de la dernière génération */}
          {generateResult && (
            <div className="bg-white rounded-2xl p-6 border-2 mb-6 shadow-sm"
              style={{ borderColor: "#FF6A00" }}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-black" style={{ color: "#1D1836" }}>Digest généré avec succès</h3>
              </div>
              <DigestCard digest={generateResult.digest} stats={generateResult.stats} />
            </div>
          )}

          {/* Historique */}
          <h2 className="font-black mb-4" style={{ color: "#1D1836" }}>
            Historique ({digests.length} digest{digests.length > 1 ? "s" : ""})
          </h2>

          {loading ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: "#FF6A00" }} />
              <p className="text-sm font-bold" style={{ color: "#1D1836", opacity: 0.5 }}>Chargement…</p>
            </div>
          ) : digests.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border-2" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#1D1836", opacity: 0.2 }} />
              <p className="font-bold mb-1" style={{ color: "#1D1836" }}>Aucun digest généré</p>
              <p className="text-sm" style={{ color: "#1D1836", opacity: 0.5 }}>
                Cliquez sur "Générer maintenant" pour créer votre premier digest.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {digests.map((d, i) => (
                <div key={d.id || i} className="bg-white rounded-2xl p-5 border-2 shadow-sm"
                  style={{ borderColor: "rgba(29,24,54,0.1)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-black text-sm" style={{ color: "#1D1836" }}>
                        {d.commune_nom || "Territoire"} — {d.nb_dossiers || 0} dossiers
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#1D1836", opacity: 0.4 }}>
                        {d.generated_at ? new Date(d.generated_at).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Date inconnue"}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                      style={{ backgroundColor: d.ai_generated ? "rgba(255,106,0,0.1)" : "rgba(29,24,54,0.05)", color: d.ai_generated ? "#FF6A00" : "#1D1836" }}>
                      {d.ai_generated ? "🤖 IA" : "Manuel"}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#1D1836", opacity: 0.7 }}>
                    {d.contenu_court || "Aucun résumé."}
                  </p>
                  {(d.top_1 || d.top_2 || d.top_3) && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-3 gap-2"
                      style={{ borderColor: "rgba(29,24,54,0.1)" }}>
                      {[d.top_1, d.top_2, d.top_3].filter(Boolean).map((item, j) => (
                        <div key={j} className="px-3 py-2 rounded-xl text-xs"
                          style={{ backgroundColor: "rgba(29,24,54,0.04)", color: "#1D1836" }}>
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MairieGuard>
  );
}

function DigestCard({ digest, stats }) {
  if (!digest) return null;
  return (
    <div>
      <p className="text-sm font-medium mb-3" style={{ color: "#1D1836" }}>
        {digest.contenu_court}
      </p>
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "Total", value: stats.total },
            { label: "Nouveaux", value: stats.nouveaux },
            { label: "En cours", value: stats.en_cours },
            { label: "Résolus", value: stats.resolus },
          ].map(({ label, value }, i) => (
            <div key={i} className="text-center px-3 py-2 rounded-xl"
              style={{ backgroundColor: "rgba(29,24,54,0.04)" }}>
              <p className="text-lg font-black" style={{ color: "#1D1836" }}>{value}</p>
              <p className="text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>{label}</p>
            </div>
          ))}
        </div>
      )}
      {(digest.top_1 || digest.top_2 || digest.top_3) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[digest.top_1, digest.top_2, digest.top_3].filter(Boolean).map((item, i) => (
            <div key={i} className="px-3 py-2 rounded-xl text-xs"
              style={{ backgroundColor: "rgba(255,106,0,0.08)", color: "#1D1836" }}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
