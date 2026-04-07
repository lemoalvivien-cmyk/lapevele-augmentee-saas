import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Download, Eye, CheckCircle, AlertCircle, Zap } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "mensuel", label: "📅 Mensuel" },
  { value: "trimestriel", label: "📊 Trimestriel" },
  { value: "annuel", label: "📋 Annuel" },
  { value: "flash", label: "⚡ Flash" },
  { value: "mandat", label: "🏛️ Rapport de mandat" },
];

const NIVEAU_IA = {
  L1: { label: "L1 local", color: "#B8F5C4" },
  L2: { label: "L2 Sonnet", color: "#63C7FF" },
  L3: { label: "L3 Opus", color: "#FF6FB5" },
};

export default function RapportMandat() {
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [commune, setCommune] = useState("");
  const [communes, setCommunes] = useState([]);
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [genForm, setGenForm] = useState({ type_rapport: "mensuel", periode: "" });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const com = await base44.entities.Commune.filter({ statut: "active" }, "nom", 50).catch(() => []);
      setCommunes(com);
      if (com[0] && !commune) setCommune(com[0].slug ?? com[0].nom);
      const raps = await base44.entities.ObservatoryReport.filter({}, "-created_at", 20).catch(() => []);
      setRapports(raps);
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    if (!commune) return;
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const fn = genForm.type_rapport === "mandat" ? "generateMandateReport" : "generateObsReport";
      const res = await base44.functions.invoke(fn, {
        commune,
        type_rapport: genForm.type_rapport,
        periode: genForm.periode || undefined,
      });
      if (res.data?.success) {
        setSuccess(res.data.message ?? "Rapport généré avec succès !");
        await loadAll();
        if (res.data.data) setSelectedRapport(res.data.data);
      } else {
        setError(res.data?.error ?? "Erreur lors de la génération");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const togglePublish = async (rapport) => {
    await base44.entities.ObservatoryReport.update(rapport.id, { publie: !rapport.publie }).catch(() => {});
    setRapports(prev => prev.map(r => r.id === rapport.id ? { ...r, publie: !r.publie } : r));
  };

  const exportMarkdown = (rapport) => {
    const blob = new Blob([rapport.contenu_markdown ?? ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-${rapport.commune}-${rapport.periode}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-5xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-black" style={{ color: "#1D1836" }}>📊 Rapports & Observatoire</h1>
          <p className="text-sm font-medium mt-1" style={{ color: "#1D1836", opacity: 0.6 }}>
            Générez des rapports territoriaux IA · Mensuel · Trimestriel · Rapport de mandat
          </p>
        </div>

        {/* Panneau de génération */}
        <div className="bg-white rounded-3xl border-2 p-6 mb-8" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
          <h2 className="font-black text-lg mb-4" style={{ color: "#1D1836" }}>
            <Zap className="w-5 h-5 inline mr-2 text-orange-500" />
            Générer un rapport IA
          </h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Commune</label>
              <select value={commune} onChange={e => setCommune(e.target.value)}
                className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }}>
                {communes.map(c => <option key={c.id} value={c.slug ?? c.nom}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Type de rapport</label>
              <select value={genForm.type_rapport} onChange={e => setGenForm(f => ({ ...f, type_rapport: e.target.value }))}
                className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }}>
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Période (optionnel)</label>
              <input type="text" value={genForm.periode} onChange={e => setGenForm(f => ({ ...f, periode: e.target.value }))}
                placeholder="Ex: 2024-Q1, 2024-03"
                className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>
              Mensuel/Trimestriel → L2 Claude Sonnet · Rapport de mandat → L3 Claude Opus
            </div>
            <button onClick={generate} disabled={generating || !commune}
              className="inline-flex items-center gap-2 text-white font-black py-3 px-6 rounded-2xl text-sm transition-all hover:scale-105 disabled:opacity-60"
              style={{ backgroundColor: "#FF6A00" }}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération en cours...</> : <><Zap className="w-4 h-4" /> Générer</>}
            </button>
          </div>
        </div>

        {/* Liste des rapports */}
        <h2 className="text-xl font-black mb-4" style={{ color: "#1D1836" }}>
          📂 Rapports générés ({rapports.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} /></div>
        ) : rapports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm" style={{ color: "#1D1836", opacity: 0.6 }}>Aucun rapport généré. Utilisez le panneau ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rapports.map(rapport => {
              const niveauCfg = NIVEAU_IA[rapport.niveau_ia] ?? { label: "IA", color: "#e0e0e0" };
              return (
                <div key={rapport.id} className="bg-white rounded-2xl border-2 p-5 hover:shadow-md transition-shadow"
                  style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: niveauCfg.color, color: "#1D1836" }}>
                          {niveauCfg.label}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 capitalize">
                          {rapport.type_rapport}
                        </span>
                        {rapport.publie && (
                          <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "#B8F5C4", color: "#1D1836" }}>
                            ✅ Publié
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-base mb-1" style={{ color: "#1D1836" }}>{rapport.titre}</h3>
                      {rapport.resume_executif && (
                        <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: "#1D1836", opacity: 0.7 }}>
                          {rapport.resume_executif}
                        </p>
                      )}
                      <div className="flex gap-3 text-xs" style={{ color: "#1D1836", opacity: 0.4 }}>
                        <span>📍 {rapport.commune}</span>
                        <span>📅 {rapport.periode}</span>
                        <span>🕒 {new Date(rapport.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => setSelectedRapport(selectedRapport?.id === rapport.id ? null : rapport)}
                        className="flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl border-2 transition-all hover:shadow-sm"
                        style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
                        <Eye className="w-3 h-3" />
                        {selectedRapport?.id === rapport.id ? "Fermer" : "Lire"}
                      </button>
                      <button onClick={() => exportMarkdown(rapport)}
                        className="flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl border-2 transition-all hover:shadow-sm"
                        style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
                        <Download className="w-3 h-3" /> Export .md
                      </button>
                      <button onClick={() => togglePublish(rapport)}
                        className="flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl border-2 transition-all hover:shadow-sm"
                        style={{
                          borderColor: rapport.publie ? "#22c55e" : "rgba(29,24,54,0.15)",
                          color: rapport.publie ? "#22c55e" : "#1D1836"
                        }}>
                        {rapport.publie ? "✅ Publié" : "📢 Publier"}
                      </button>
                    </div>
                  </div>

                  {/* Contenu déployé */}
                  {selectedRapport?.id === rapport.id && rapport.contenu_markdown && (
                    <div className="mt-4 pt-4 border-t-2" style={{ borderColor: "rgba(29,24,54,0.06)" }}>
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans overflow-x-auto"
                        style={{ color: "#1D1836", opacity: 0.8, maxHeight: "400px", overflowY: "auto" }}>
                        {rapport.contenu_markdown}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
