import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Loader2, Search, ChevronDown, ChevronUp, Send, X } from "lucide-react";
import MairieGuard from "@/components/MairieGuard";

const statutColors = {
  nouveau: "bg-blue-100 text-blue-700", qualifie: "bg-purple-100 text-purple-700",
  en_cours: "bg-yellow-100 text-yellow-700", resolu: "bg-green-100 text-green-700", rejete: "bg-gray-100 text-gray-600",
};
const statutLabels = { nouveau: "Nouveau", qualifie: "Qualifié", en_cours: "En cours", resolu: "Résolu", rejete: "Rejeté" };
const prioriteColors = { urgente: "text-red-600 font-bold", haute: "text-orange-500 font-semibold", normale: "text-blue-600", basse: "text-gray-400" };
const prioriteEmoji = { urgente: "🔴", haute: "🟡", normale: "🔵", basse: "⚪" };
const typeEmoji = { signaler: "🚨", proposer: "💡", aider: "🤝" };
const typeLabels = { signaler: "Signalement", proposer: "Idée", aider: "Aide" };


export default function Dossiers() {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [communeSlug, setCommuneSlug] = useState(null);
  const [servicesList, setServicesList] = useState([]);

  // Filtres
  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [filtreType, setFiltreType] = useState("tous");
  const [filtreCategorie, setFiltreCategorie] = useState("tous");
  const [filtrePriorite, setFiltrePriorite] = useState("tous");
  const [filtreService, setFiltreService] = useState("tous");
  const [filtreReview, setFiltreReview] = useState(false);
  const [tri, setTri] = useState("urgence"); // urgence | date

  // Quick action state
  const [quickStatus, setQuickStatus] = useState({});
  const [quickService, setQuickService] = useState({});
  const [quickNote, setQuickNote] = useState({});
  const [quickVisible, setQuickVisible] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoadError(null);
    try {
      const [dosRes, svcsRes] = await Promise.all([
        base44.functions.invoke('getMairieData', { operation: 'dossiers', params: { sort: '-created_date', limit: 300 } }),
        base44.functions.invoke('getMairieData', { operation: 'services', params: {} }),
      ]);
      setCommuneSlug(dosRes.data.commune);
      setDossiers(dosRes.data.dossiers || []);
      setServicesList((svcsRes.data.services || []).map(s => s.nom));
    } catch {
      setLoadError("Erreur de chargement. Réessayez.");
    }
    setLoading(false);
  };

  // Catégories dynamiques depuis les données réelles
  const categories = [...new Set(dossiers.map(d => d.categorie).filter(Boolean))].sort();

  const saveStatus = async (d) => {
    const val = quickStatus[d.id] || d.statut;
    setSaving(s => ({ ...s, [d.id]: true }));
    await base44.functions.invoke('updateDossier', { dossierId: d.id, updates: { statut: val } });
    setDossiers(prev => prev.map(x => x.id === d.id ? { ...x, statut: val } : x));
    setSaving(s => ({ ...s, [d.id]: false }));
  };

  const saveService = async (d) => {
    const val = quickService[d.id] ?? d.service_assigne;
    setSaving(s => ({ ...s, [d.id]: true }));
    await base44.functions.invoke('updateDossier', { dossierId: d.id, updates: { service_assigne: val } });
    setDossiers(prev => prev.map(x => x.id === d.id ? { ...x, service_assigne: val } : x));
    setSaving(s => ({ ...s, [d.id]: false }));
  };

  const sendNote = async (d) => {
    const note = quickNote[d.id] || "";
    if (!note.trim()) return;
    setSaving(s => ({ ...s, [d.id]: true }));
    const visible = !!quickVisible[d.id];
    await base44.functions.invoke('createDossierUpdate', {
      dossierId: d.id,
      type_update: visible ? "public" : "interne",
      contenu: note,
      visible_citoyen: visible,
    });
    setQuickNote(n => ({ ...n, [d.id]: "" }));
    setQuickVisible(v => ({ ...v, [d.id]: false }));
    setSaving(s => ({ ...s, [d.id]: false }));
  };

  const prioriteOrder = { urgente: 0, haute: 1, normale: 2, basse: 3 };

  const filtered = dossiers.filter(d => {
    if (filtreStatut !== "tous" && d.statut !== filtreStatut) return false;
    if (filtreType !== "tous" && d.type_action !== filtreType) return false;
    if (filtreCategorie !== "tous" && d.categorie !== filtreCategorie) return false;
    if (filtrePriorite !== "tous" && d.priorite !== filtrePriorite) return false;
    if (filtreService !== "tous" && d.service_assigne !== filtreService) return false;
    if (filtreReview && !d.ai_needs_review) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.titre_public?.toLowerCase().includes(q) &&
          !d.description_resumee?.toLowerCase().includes(q) &&
          !d.description_brute?.toLowerCase().includes(q) &&
          !d.quartier?.toLowerCase().includes(q) &&
          !d.commune?.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (tri === "urgence") {
      const pa = prioriteOrder[a.priorite] ?? 4;
      const pb = prioriteOrder[b.priorite] ?? 4;
      if (pa !== pb) return pa - pb;
    }
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const resetFiltres = () => {
    setSearch(""); setFiltreStatut("tous"); setFiltreType("tous");
    setFiltreCategorie("tous"); setFiltrePriorite("tous"); setFiltreService("tous");
    setFiltreReview(false);
  };

  const hasFiltres = filtreStatut !== "tous" || filtreType !== "tous" || filtreCategorie !== "tous" ||
    filtrePriorite !== "tous" || filtreService !== "tous" || filtreReview || search;

  return (
    <MairieGuard>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h1 className="text-3xl font-bold text-primary">Dossiers citoyens</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTri(t => t === "urgence" ? "date" : "urgence")}
                className="border border-border rounded-xl px-4 py-2 text-sm font-semibold text-primary hover:bg-secondary transition-colors"
              >
                Tri : {tri === "urgence" ? "Urgence ↓" : "Date ↓"}
              </button>
              <span className="text-sm text-muted-foreground">{filtered.length} dossier(s)</span>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par titre, description, quartier, commune…"
                className="w-full pl-9 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Statut :</span>
              {["tous", "nouveau", "qualifie", "en_cours", "resolu", "rejete"].map(s => (
                <button key={s} onClick={() => setFiltreStatut(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filtreStatut === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-border"}`}>
                  {s === "tous" ? "Tous" : statutLabels[s]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Type :</span>
              {["tous", "signaler", "proposer", "aider"].map(t => (
                <button key={t} onClick={() => setFiltreType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filtreType === t ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:bg-border"}`}>
                  {t === "tous" ? "Tous" : `${typeEmoji[t]} ${typeLabels[t]}`}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Priorité :</span>
              {["tous", "urgente", "haute", "normale", "basse"].map(p => (
                <button key={p} onClick={() => setFiltrePriorite(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filtrePriorite === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-border"}`}>
                  {p === "tous" ? "Toutes" : `${prioriteEmoji[p]} ${p}`}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Catégorie :</span>
              <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-xs bg-background font-semibold text-muted-foreground">
                <option value="tous">Toutes</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide ml-2">Service :</span>
              <select value={filtreService} onChange={e => setFiltreService(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-xs bg-background font-semibold text-muted-foreground">
                <option value="tous">Tous</option>
                {servicesList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={() => setFiltreReview(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ml-2 ${filtreReview ? "bg-orange-100 text-orange-700 border border-orange-300" : "bg-secondary text-muted-foreground hover:bg-border"}`}>
                ⚠️ À réviser
              </button>
              {hasFiltres && (
                <button onClick={resetFiltres} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors">
                  <X className="w-3 h-3" /> Effacer
                </button>
              )}
            </div>
          </div>

          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{loadError}</div>
          )}

          {/* Liste */}
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-3">📂</div>
              <p>Aucun dossier dans cette sélection.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(d => {
                const isOpen = expanded === d.id;
                return (
                  <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    {/* Ligne principale */}
                    <div className="flex items-start gap-3 p-4">
                      <span className="text-2xl shrink-0 mt-0.5">{typeEmoji[d.type_action]}</span>
                      <div className="flex-1 min-w-0">
                        {/* Badges ligne 1 */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statutColors[d.statut]}`}>
                            {statutLabels[d.statut]}
                          </span>
                          <span className={`text-xs ${prioriteColors[d.priorite]}`}>
                            {prioriteEmoji[d.priorite]} {d.priorite}
                          </span>
                          {d.ai_needs_review && (
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">⚠️ À réviser</span>
                          )}
                          <span className="font-mono text-xs text-muted-foreground">#{d.id.slice(-6).toUpperCase()}</span>
                        </div>
                        {/* Titre */}
                        <p className="font-semibold text-primary truncate">{d.titre_public}</p>
                        {/* Meta ligne */}
                        <div className="flex items-center gap-3 flex-wrap mt-0.5">
                          {d.categorie && <span className="text-xs text-muted-foreground">{d.categorie}</span>}
                          {d.quartier && <span className="text-xs text-muted-foreground">📍 {d.quartier}</span>}
                          {d.service_assigne && <span className="text-xs text-muted-foreground">🏛 {d.service_assigne}</span>}
                          <span className="text-xs text-muted-foreground">{new Date(d.created_date).toLocaleDateString("fr-FR")}</span>
                        </div>
                        {/* Résumé court */}
                        {d.description_resumee && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{d.description_resumee}</p>
                        )}
                      </div>
                      {/* Actions droite */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Link to={`/mairie/dossiers/${d.id}`}
                          className="text-xs font-semibold text-primary border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors">
                          Ouvrir
                        </Link>
                        <button onClick={() => setExpanded(isOpen ? null : d.id)}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-secondary transition-colors">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Panneau actions rapides */}
                    {isOpen && (
                      <div className="border-t border-border bg-secondary/40 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Statut */}
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Statut</label>
                          <div className="flex gap-1 flex-wrap">
                            {Object.entries(statutLabels).map(([val, lab]) => (
                              <button key={val}
                                onClick={() => setQuickStatus(s => ({ ...s, [d.id]: val }))}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${(quickStatus[d.id] || d.statut) === val ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-border"}`}>
                                {lab}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => saveStatus(d)}
                            disabled={saving[d.id] || (quickStatus[d.id] === undefined || quickStatus[d.id] === d.statut)}
                            className="mt-2 text-xs font-semibold text-accent underline disabled:opacity-40">
                            {saving[d.id] ? "Sauvegarde…" : "Sauvegarder"}
                          </button>
                        </div>

                        {/* Service */}
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Assigner service</label>
                          <select
                            value={quickService[d.id] ?? d.service_assigne ?? ""}
                            onChange={e => setQuickService(s => ({ ...s, [d.id]: e.target.value }))}
                            className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background"
                          >
                            <option value="">— Non assigné —</option>
                            {servicesList.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button
                            onClick={() => saveService(d)}
                            disabled={saving[d.id]}
                            className="mt-2 text-xs font-semibold text-accent underline disabled:opacity-40">
                            {saving[d.id] ? "Sauvegarde…" : "Assigner"}
                          </button>
                        </div>

                        {/* Note */}
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Ajouter une note</label>
                          <textarea
                            value={quickNote[d.id] || ""}
                            onChange={e => setQuickNote(n => ({ ...n, [d.id]: e.target.value }))}
                            rows={2}
                            placeholder="Note interne ou message citoyen…"
                            className="w-full border border-border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-primary"
                          />
                          <div className="flex items-center justify-between mt-1.5">
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input type="checkbox"
                                checked={!!quickVisible[d.id]}
                                onChange={e => setQuickVisible(v => ({ ...v, [d.id]: e.target.checked }))}
                                className="w-3 h-3"
                              />
                              <span className="text-muted-foreground">Visible citoyen</span>
                            </label>
                            <button
                              onClick={() => sendNote(d)}
                              disabled={saving[d.id] || !quickNote[d.id]?.trim()}
                              className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold py-1.5 px-3 rounded-lg disabled:opacity-50">
                              <Send className="w-3 h-3" /> Envoyer
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MairieGuard>
  );
}