import { useState, useEffect } from "react";
import { isAIEnabled } from "@/lib/app-params";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, CheckCircle, Archive, Sparkles, Copy, Trophy, BarChart2, X, Wand2 } from "lucide-react";
import MairieGuard from "@/components/MairieGuard";

const statutColor = { brouillon: "bg-yellow-100 text-yellow-700", valide: "bg-green-100 text-green-700", archive: "bg-gray-100 text-gray-600" };
const statutLabel = { brouillon: "Brouillon", valide: "Validé", archive: "Archivé" };

export default function Preuves() {
  const { user } = useAuth();

  // Data
  const [cards, setCards] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [totalReactions, setTotalReactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [communeSlug, setCommuneSlug] = useState(null);
  const [publishFeedback, setPublishFeedback] = useState({});

  // Digest
  const [digest, setDigest] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);

  // Victory cards filter
  const [filtreStatut, setFiltreStatut] = useState("brouillon");
  const [rewriteModal, setRewriteModal] = useState(null);
  const [rewriteProposal, setRewriteProposal] = useState("");
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const aiDigestEnabled = isAIEnabled('generate_digest');
  const aiMairieEnabled = isAIEnabled('rewrite_mairie');

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoadError(null);
    try {
      const [dosRes, vicRes, digestRes] = await Promise.all([
        base44.functions.invoke('getMairieData', { operation: 'dossiers', params: { sort: '-created_date', limit: 300 } }),
        base44.functions.invoke('getMairieData', { operation: 'victories', params: {} }),
        base44.functions.invoke('getMairieData', { operation: 'digest', params: {} }),
      ]);
      setCommuneSlug(dosRes.data.commune);
      setDossiers(dosRes.data.dossiers || []);
      setCards(vicRes.data.victories || []);
      if (digestRes.data.digest) setDigest(digestRes.data.digest);
      // Load reaction counts via secure backend function
      const postsRes = await base44.functions.invoke('getMairieData', { operation: 'village_posts', params: { limit: 100 } }).catch(() => ({ data: { posts: [] } }));
      const postIds = (postsRes.data?.posts || []).map(p => p.id);
      if (postIds.length > 0) {
        const countsRes = await base44.functions.invoke('getReactionCounts', { post_ids: postIds });
        const total = Object.values(countsRes.data || {}).reduce((acc, r) => acc + (r.merci || 0) + (r.present || 0) + (r.je_peux_aider || 0), 0);
        setTotalReactions(total);
      }
    } catch {
      setLoadError("Erreur de chargement. Réessayez.");
    }
    setLoading(false);
  };

  const genererDigest = async () => {
    if (!window.confirm('Générer le point du jour pour aujourd\'hui ?')) return;
    setDigestLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    try {
      // Check si digest pour aujourd'hui existe déjà
      const existing = await base44.entities.DailyDigest.filter({ commune: communeSlug, date_digest: today }).catch(() => []);
      if (existing.length > 0) {
        setDigest(existing[0]);
        setDigestLoading(false);
        return;
      }

      const urgents = dossiers.filter(d => ["urgente", "haute"].includes(d.priorite) && !["resolu", "rejete"].includes(d.statut));
      const recentsResolus = dossiers.filter(d => d.statut === "resolu").slice(0, 5);
      const participation = dossiers.filter(d => ["proposer", "aider"].includes(d.type_action)).slice(0, 5);

      const context = [
        urgents.length ? `Urgences : ${urgents.map(d => d.titre_public).join(", ")}` : "",
        recentsResolus.length ? `Récemment résolus : ${recentsResolus.map(d => d.titre_public).join(", ")}` : "",
        participation.length ? `Participation : ${participation.map(d => d.titre_public).join(", ")}` : "",
      ].filter(Boolean).join("\n");

      const res = await base44.functions.invoke('qwenAssist', {
        mode: 'generate_digest',
        user_input: context,
      });

      if (!res.data?.success || !res.data?.data) {
        setLoadError("Erreur lors de la génération du digest. Réessayez.");
        setDigestLoading(false);
        return;
      }

      const data = res.data.data;
      const saved = await base44.entities.DailyDigest.create({
        commune: communeSlug,
        date_digest: today,
        top_1: data.top_1 || "",
        top_2: data.top_2 || "",
        top_3: data.top_3 || "",
        contenu_court: data.contenu_court || "",
        genere_par_ia: true,
        generated_at: new Date().toISOString(),
      });

      setDigest(saved);
    } catch {
      setLoadError("Erreur lors de la génération du digest. Réessayez.");
    } finally {
      setDigestLoading(false);
    }
  };

  const valider = async (card) => {
    await base44.functions.invoke('getMairieData', { operation: 'update_victory_card', params: { cardId: card.id, updates: { statut: "valide" } } });
    load();
  };

  const archiver = async (card) => {
    await base44.functions.invoke('getMairieData', { operation: 'update_victory_card', params: { cardId: card.id, updates: { statut: "archive" } } });
    load();
  };

  const publierSurPlace = async (card) => {
    try {
      await base44.functions.invoke('getMairieData', {
        operation: 'create_village_post',
        params: { data: {
          commune: card.commune, type_post: "victoire", titre: card.titre,
          resume: card.resume, contenu: card.texte_post, dossier_source: card.dossier,
          est_public: true, published_at: new Date().toISOString(),
        }},
      });
      setPublishFeedback(f => ({ ...f, [card.id]: "published" }));
    } catch {
      setPublishFeedback(f => ({ ...f, [card.id]: "error" }));
    }
  };

  const copyText = (text) => navigator.clipboard.writeText(text);

  const handleRewrite = async (cardId, text) => {
    setRewriteLoading(true);
    setRewriteProposal("");
    try {
      const res = await base44.functions.invoke('qwenAssist', {
        mode: 'rewrite_mairie',
        user_input: text,
      });
      if (res.data?.success && res.data?.data?.text) {
        setRewriteProposal(res.data.data.text);
        setRewriteModal({ cardId, originalText: text });
      } else {
        alert("Erreur: impossible de reformuler. Réessayez.");
      }
    } catch {
      alert("Erreur: service temporairement indisponible.");
    } finally {
      setRewriteLoading(false);
    }
  };

  const applyRewrite = (cardId, newText) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      setCards(cards.map(c => c.id === cardId ? { ...c, texte_post: newText } : c));
    }
    setRewriteModal(null);
    setRewriteProposal("");
  };

  // Stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dosMois = dossiers.filter(d => new Date(d.created_date) >= startOfMonth);
  const resolus = dossiers.filter(d => d.statut === "resolu");
  const resolusMois = resolus.filter(d => d.resolved_at && new Date(d.resolved_at) >= startOfMonth);

  const tempsMoyen = resolus.filter(d => d.resolved_at && d.created_date).length
    ? Math.round(resolus.filter(d => d.resolved_at).reduce((acc, d) => acc + (new Date(d.resolved_at) - new Date(d.created_date)) / 86400000, 0) / resolus.filter(d => d.resolved_at).length)
    : null;

  const avecNote = dossiers.filter(d => d.note_satisfaction);
  const satisfactionMoy = avecNote.length
    ? (avecNote.reduce((acc, d) => acc + d.note_satisfaction, 0) / avecNote.length).toFixed(1)
    : null;

  // Top catégories
  const catCount = {};
  dosMois.forEach(d => { if (d.categorie) catCount[d.categorie] = (catCount[d.categorie] || 0) + 1; });
  const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Quartiers actifs
  const quartierCount = {};
  dosMois.forEach(d => { if (d.quartier) quartierCount[d.quartier] = (quartierCount[d.quartier] || 0) + 1; });
  const topQuartiers = Object.entries(quartierCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const filteredCards = cards.filter(c => c.statut === filtreStatut);

  return (
    <MairieGuard>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-10">
          {loadError && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{loadError}</div>}
          <div>
            <h1 className="text-3xl font-bold text-primary mb-1">Preuves & Impact</h1>
            <p className="text-muted-foreground">Point du jour, victoires et bilan mensuel.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : (
            <>
              {/* === SECTION 1 : POINT DU JOUR === */}
              <section>
                <SectionTitle icon={<Sparkles className="w-5 h-5 text-primary" />} title="Point du jour" />
                <div className="bg-card border border-border rounded-xl p-6">
                  {digest ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground mb-4">
                        <span>Généré le {new Date(digest.generated_at || digest.created_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                        <button onClick={async () => { if (window.confirm('Regénérer un nouveau point du jour ? Le digest existant sera remplacé.')) { const today = new Date().toISOString().slice(0,10); const existing = await base44.entities.DailyDigest.filter({ commune: communeSlug, date_digest: today }).catch(() => []); if (existing.length > 0) await base44.entities.DailyDigest.delete(existing[0].id).catch(() => {}); setDigest(null); } }} className="text-primary underline ml-2">Regénérer</button>
                      </div>
                      <DigestPoint emoji="⚠️" label="Urgence principale" text={digest.top_1} />
                      <DigestPoint emoji="🔧" label="Progrès concret" text={digest.top_2} />
                      <DigestPoint emoji="🌱" label="Signe positif" text={digest.top_3} />
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Génère un résumé sobre et utile de l'activité du jour pour les agents et élus.
                      </p>
                      {aiDigestEnabled ? (
                        <button onClick={genererDigest} disabled={digestLoading}
                          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl text-sm disabled:opacity-60">
                          {digestLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</> : <><Sparkles className="w-4 h-4" /> Générer le point du jour</>}
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Fonctionnalité IA non activée.</p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* === SECTION 2 : VICTORY CARDS === */}
              <section>
                <SectionTitle icon={<Trophy className="w-5 h-5 text-yellow-500" />} title="Cartes Victoire" />

                <div className="flex gap-2 mb-4">
                  {["brouillon", "valide", "archive"].map(s => (
                    <button key={s} onClick={() => setFiltreStatut(s)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filtreStatut === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-border"}`}>
                      {statutLabel[s]} ({cards.filter(c => c.statut === s).length})
                    </button>
                  ))}
                </div>

                {filteredCards.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
                    <div className="text-4xl mb-3">🏆</div>
                    <p>Aucune carte en statut "{statutLabel[filtreStatut]}".</p>
                    {filtreStatut === "brouillon" && <p className="text-xs mt-1">Résolvez des dossiers et utilisez l'IA pour en générer.</p>}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {filteredCards.map(c => (
                      <div key={c.id} className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-start gap-4 mb-3 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statutColor[c.statut]}`}>
                            {statutLabel[c.statut]}
                          </span>
                          {c.chiffre_cle && (
                            <span className="text-xs font-bold bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1 rounded-full">
                              {c.chiffre_cle}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-primary mb-1">{c.titre}</h3>
                        {c.resume && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{c.resume}</p>}
                        {c.angle_communication && (
                          <p className="text-xs text-accent font-semibold italic mb-3">Angle : {c.angle_communication}</p>
                        )}
                        {c.texte_post && (
                          <div className="bg-secondary rounded-xl p-4 mb-4 relative">
                            <p className="text-sm font-semibold text-muted-foreground mb-1">Texte prêt à publier</p>
                            <p className="text-sm leading-relaxed pr-8">{c.texte_post}</p>
                            <div className="absolute top-3 right-3 flex gap-1">
                              <button onClick={() => copyText(c.texte_post)} title="Copier"
                                className="p-2 rounded-lg text-muted-foreground hover:bg-border transition-colors">
                                <Copy className="w-4 h-4" />
                              </button>
                              {aiMairieEnabled && (
                                <button onClick={() => handleRewrite(c.id, c.texte_post)} disabled={rewriteLoading} title="Reformuler"
                                  className="p-2 rounded-lg text-muted-foreground hover:bg-border transition-colors disabled:opacity-40">
                                  <Wand2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-3 flex-wrap">
                          {c.statut === "brouillon" && (
                            <button onClick={() => valider(c)} className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2 px-4 rounded-lg text-sm">
                              <CheckCircle className="w-4 h-4" /> Valider
                            </button>
                          )}
                          {c.statut === "valide" && (
                            publishFeedback[c.id] === "published" ? (
                              <span className="text-sm text-green-700 font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Publié sur la Place du Village</span>
                            ) : publishFeedback[c.id] === "error" ? (
                              <span className="text-sm text-red-600 font-semibold">Erreur — réessayez</span>
                            ) : (
                              <button onClick={() => publierSurPlace(c)} className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-lg text-sm">
                                Publier sur la Place du Village
                              </button>
                            )
                          )}
                          {c.statut !== "archive" && (
                            <button onClick={() => archiver(c)} className="flex items-center gap-2 border border-border text-muted-foreground font-semibold py-2 px-4 rounded-lg text-sm">
                              <Archive className="w-4 h-4" /> Archiver
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* === SECTION 3 : RAPPORT MENSUEL === */}
              <section>
                <SectionTitle icon={<BarChart2 className="w-5 h-5 text-primary" />}
                  title={`Bilan — ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`} />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <StatBox label="Dossiers créés" val={dosMois.length} />
                  <StatBox label="Résolus" val={resolusMois.length} color="text-green-700 bg-green-50" />
                  <StatBox label="Délai moyen" val={tempsMoyen !== null ? `${tempsMoyen} j` : "–"} />
                  <StatBox label="Satisfaction" val={satisfactionMoy ? `${satisfactionMoy}/5 ⭐` : "–"} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-semibold text-primary mb-3 text-sm uppercase tracking-wide">Top catégories</h3>
                    {topCats.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune donnée ce mois.</p>
                    ) : (
                      <div className="space-y-2">
                        {topCats.map(([cat, count]) => (
                          <div key={cat} className="flex items-center justify-between">
                            <span className="text-sm text-foreground capitalize">{cat}</span>
                            <div className="flex items-center gap-2">
                              <div className="h-2 bg-primary/20 rounded-full overflow-hidden w-24">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (count / (topCats[0]?.[1] || 1)) * 100)}%` }} />
                              </div>
                              <span className="text-xs font-bold text-primary w-4 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-semibold text-primary mb-3 text-sm uppercase tracking-wide">Quartiers actifs</h3>
                    {topQuartiers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun quartier renseigné ce mois.</p>
                    ) : (
                      <div className="space-y-2">
                        {topQuartiers.map(([q, count]) => (
                          <div key={q} className="flex items-center justify-between">
                            <span className="text-sm text-foreground">📍 {q}</span>
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-primary mb-1 text-sm uppercase tracking-wide">Place du Village</h3>
                  <p className="text-3xl font-extrabold text-primary">{totalReactions}</p>
                  <p className="text-sm text-muted-foreground">réaction(s) des habitants sur l'ensemble des publications</p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Modale reformulation */}
      {rewriteModal && rewriteProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-bold text-lg text-primary">Proposition de reformulation</h2>
              <button
                type="button"
                onClick={() => setRewriteModal(null)}
                className="shrink-0 p-1 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Voici une version reformulée plus claire et humaine. Vous pouvez la garder ou l'utiliser comme base.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm leading-relaxed text-foreground">{rewriteProposal}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRewriteModal(null)}
                className="flex-1 border border-border py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-secondary">
                Garder le texte actuel
              </button>
              <button
                type="button"
                onClick={() => applyRewrite(rewriteModal.cardId, rewriteProposal)}
                className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm transition-all hover:shadow-md">
                Utiliser cette version
              </button>
            </div>
          </div>
        </div>
      )}
    </MairieGuard>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
      {icon}
      <h2 className="text-xl font-bold text-primary">{title}</h2>
    </div>
  );
}

function DigestPoint({ emoji, label, text }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-secondary rounded-xl">
      <span className="text-2xl shrink-0">{emoji}</span>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm text-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function StatBox({ label, val, color }) {
  return (
    <div className={`rounded-xl p-4 text-center border border-border ${color || "bg-card"}`}>
      <p className="text-2xl font-extrabold text-primary">{val}</p>
      <p className="text-xs text-muted-foreground mt-1 font-medium leading-snug">{label}</p>
    </div>
  );
}