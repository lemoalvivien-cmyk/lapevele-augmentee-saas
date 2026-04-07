import { useState, useEffect } from "react";
import { isAIEnabled } from "@/lib/app-params";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Plus, Trash2, Pin, Eye, MessageSquare, X, Wand2 } from "lucide-react";
import MairieGuard from "@/components/MairieGuard";

const typeOptions = [
  { value: "victoire", label: "🏆 Victoire" },
  { value: "appel_aide", label: "🙋 Appel à l'aide" },
  { value: "actualite", label: "📰 Actualité" },
  { value: "merci_local", label: "💛 Merci local" },
  { value: "message_maire", label: "🎤 Message du maire" },
];

export default function MairePlaceVillage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [communeSlug, setCommuneSlug] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type_post: "actualite", titre: "", resume: "", contenu: "", quartier: "", date_souhaitee: "", type_aide: "" });
  const [viewAiders, setViewAiders] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mayorMsg, setMayorMsg] = useState("");
  const [mayorPreview, setMayorPreview] = useState(false);
  const [mayorSaving, setMayorSaving] = useState(false);
  const [rewriteModal, setRewriteModal] = useState(null);
  const [rewriteProposal, setRewriteProposal] = useState("");
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const aiMairieEnabled = isAIEnabled('rewrite_mairie');
  const mayorPosts = posts.filter(p => p.type_post === "message_maire");
  const activeMayorMsg = mayorPosts.find(p => p.est_epingle);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoadError(null);
    try {
      let slug = null;
      if (user?.role !== "admin") {
        const profiles = await base44.entities.UserProfile.filter({ email: user.email });
        slug = profiles[0]?.commune || null;
        if (!slug) { setLoadError("Profil mairie introuvable."); setLoading(false); return; }
        setCommuneSlug(slug);
      }
      const q = user?.role === "admin" ? {} : { commune: slug };
      const [data, reac] = await Promise.all([
        base44.entities.VillagePost.filter(q, "-created_date", 50),
        base44.entities.VillageReaction.filter({ type_reaction: "je_peux_aider" }),
      ]);
      setPosts(data);
      setReactions(reac);
    } catch {
      setLoadError("Erreur de chargement. Réessayez.");
    }
    setLoading(false);
  };

  const publish = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const commune = communeSlug || user?.commune;
    if (!commune) { setSaveError("Commune introuvable."); setSaving(false); return; }
    try {
    await base44.entities.VillagePost.create({
      ...form, commune, est_public: true, created_by: user?.email,
      published_at: new Date().toISOString(),
      date_souhaitee: form.date_souhaitee ? new Date(form.date_souhaitee).toISOString() : undefined,
    });
    setForm({ type_post: "actualite", titre: "", resume: "", contenu: "", quartier: "", date_souhaitee: "", type_aide: "" });
    setShowForm(false);
    load();
    } catch { setSaveError("Erreur lors de la publication. Réessayez."); }
    setSaving(false);
  };

  const toggleEpingle = async (post) => {
    // Un seul épinglé à la fois
    if (!post.est_epingle) {
      const currentEpingle = posts.find(p => p.est_epingle && p.id !== post.id);
      if (currentEpingle) await base44.entities.VillagePost.update(currentEpingle.id, { est_epingle: false });
    }
    await base44.entities.VillagePost.update(post.id, { est_epingle: !post.est_epingle });
    load();
  };

  const publishMayorMsg = async () => {
    if (!mayorMsg.trim()) return;
    setMayorSaving(true);
    setSaveError(null);
    const commune = communeSlug || user?.commune;
    if (!commune) { setSaveError("Commune introuvable."); setMayorSaving(false); return; }
    try {
    if (activeMayorMsg) await base44.entities.VillagePost.update(activeMayorMsg.id, { est_epingle: false });
    await base44.entities.VillagePost.create({
      type_post: "message_maire",
      titre: "Message du maire",
      resume: mayorMsg,
      contenu: mayorMsg,
      commune,
      est_public: true,
      est_epingle: true,
      created_by: user?.email,
      published_at: new Date().toISOString(),
    });
    setMayorMsg("");
    setMayorPreview(false);
    load();
    } catch { setSaveError("Erreur lors de la publication. Réessayez."); }
    setMayorSaving(false);
  };

  const deletePost = async (id) => {
    await base44.entities.VillagePost.delete(id);
    load();
  };

  const handleRewrite = async (text, target) => {
    setRewriteLoading(true);
    setRewriteProposal("");
    try {
      const res = await base44.functions.invoke('qwenAssist', {
        mode: 'rewrite_mairie',
        user_input: text,
      });
      if (res.data?.success && res.data?.data?.text) {
        setRewriteProposal(res.data.data.text);
        setRewriteModal({ target, originalText: text });
      } else {
        alert("Erreur: impossible de reformuler. Réessayez.");
      }
    } catch {
      alert("Erreur: service temporairement indisponible.");
    } finally {
      setRewriteLoading(false);
    }
  };

  const applyRewrite = (target, newText) => {
    if (target === "mayor") setMayorMsg(newText);
    else if (target === "form") setForm(f => ({ ...f, contenu: newText }));
    setRewriteModal(null);
    setRewriteProposal("");
  };

  return (
    <MairieGuard>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {(loadError || saveError) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{loadError || saveError}</div>
          )}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-primary">Place du Village</h1>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-accent text-accent-foreground font-bold py-3 px-5 rounded-xl">
              <Plus className="w-5 h-5" /> Nouvelle publication
            </button>
          </div>

          {/* === MESSAGE DU MAIRE === */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 font-bold text-primary mb-1">
              <MessageSquare className="w-5 h-5" /> Message du maire
            </div>
            <p className="text-sm text-muted-foreground mb-4">Un message court, humain et local. Pas une tribune.</p>

            {activeMayorMsg && !mayorPreview && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-4 text-sm">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Message actuel (épinglé)</p>
                <p className="italic text-foreground">"{activeMayorMsg.contenu}"</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Publié le {new Date(activeMayorMsg.published_at || activeMayorMsg.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}

            {!mayorPreview ? (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    value={mayorMsg}
                    onChange={e => setMayorMsg(e.target.value.slice(0, 400))}
                    rows={4}
                    placeholder="Ex : Merci aux habitants de la rue des Acacias pour leur soutien lors des travaux. Nous avançons ensemble !"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary"
                  />
                  <span className={`absolute bottom-3 right-3 text-xs font-medium ${mayorMsg.length > 350 ? "text-orange-500" : "text-muted-foreground"}`}>
                    {mayorMsg.length}/400
                  </span>
                </div>
                <div className="bg-secondary/60 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-primary text-sm mb-2">💡 Conseils de ton</p>
                  <p>✅ <strong>Court</strong> — une ou deux phrases suffisent</p>
                  <p>✅ <strong>Local</strong> — parlez d'un lieu, d'un nom, d'un quartier précis</p>
                  <p>✅ <strong>Utile</strong> — info concrète, action en cours, invitation</p>
                  <p>✅ <strong>Proche</strong> — remercier, saluer, encourager</p>
                  <p className="mt-2 text-xs italic">Ex : "Les travaux rue du Moulin avancent bien, merci pour votre patience." · "Venez nombreux à la réunion de quartier jeudi soir."</p>
                </div>
                <div className="flex gap-3">
                   {aiMairieEnabled && (
                     <button type="button" onClick={() => handleRewrite(mayorMsg, "mayor")} disabled={rewriteLoading || !mayorMsg.trim()}
                       className="flex items-center gap-2 border border-border text-primary font-semibold py-2.5 px-5 rounded-xl text-sm hover:bg-secondary transition-colors disabled:opacity-40">
                       <Wand2 className="w-4 h-4" /> M'aider à reformuler
                     </button>
                   )}
                   <button type="button" onClick={() => { if (mayorMsg.trim()) setMayorPreview(true); }}
                     disabled={!mayorMsg.trim()}
                     className="flex items-center gap-2 border border-border text-primary font-semibold py-2.5 px-5 rounded-xl text-sm hover:bg-secondary transition-colors disabled:opacity-40">
                     <Eye className="w-4 h-4" /> Aperçu
                   </button>
                 </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aperçu avant publication</p>
                <div className="bg-primary/5 border-2 border-primary/30 rounded-2xl px-5 py-5">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">🎤 Message du maire</p>
                  <p className="text-base text-foreground leading-relaxed italic">"{mayorMsg}"</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {communeSlug}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMayorPreview(false)}
                    className="flex-1 border border-border py-3 rounded-xl font-semibold text-sm">
                    Modifier
                  </button>
                  <button onClick={publishMayorMsg} disabled={mayorSaving}
                    className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm disabled:opacity-60">
                    {mayorSaving ? "Publication…" : "Publier ce message"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {showForm && (
            <form onSubmit={publish} className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4">
              <h2 className="font-bold text-primary">Nouvelle publication</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {typeOptions.map(t => (
                  <button type="button" key={t.value} onClick={() => setForm(f => ({ ...f, type_post: t.value }))}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${form.type_post === t.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} required
                placeholder="Titre *" className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
              <input value={form.resume} onChange={e => setForm(f => ({ ...f, resume: e.target.value }))}
                placeholder="Résumé court (accroche)" className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
              <div className="relative">
                <textarea value={form.contenu} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))} required rows={4}
                  placeholder="Contenu *" className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary" />
                {aiMairieEnabled && (
                  <button type="button" onClick={() => { if (form.contenu.trim()) handleRewrite(form.contenu, "form"); }} disabled={rewriteLoading || !form.contenu.trim()}
                    className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40" title="Reformuler">
                    <Wand2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input value={form.quartier} onChange={e => setForm(f => ({ ...f, quartier: e.target.value }))}
                placeholder="Quartier (optionnel)" className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
              {form.type_post === "appel_aide" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Détails de l'appel à l'aide</p>
                  <input value={form.type_aide} onChange={e => setForm(f => ({ ...f, type_aide: e.target.value }))}
                    placeholder="Type d'aide recherchée (ex : transport, jardinage…)" className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date souhaitée</label>
                    <input type="date" value={form.date_souhaitee} onChange={e => setForm(f => ({ ...f, date_souhaitee: e.target.value }))}
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-border py-3 rounded-xl font-semibold text-sm">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 bg-accent text-accent-foreground font-bold py-3 rounded-xl text-sm disabled:opacity-60">
                  {saving ? "Publication…" : "Publier"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {posts.map(p => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>{typeOptions.find(t => t.value === p.type_post)?.label || p.type_post}</span>
                        {p.est_epingle && <span className="font-bold text-primary">· 📌 Épinglé</span>}
                        {!p.est_public && <span className="text-destructive font-bold">· Non publié</span>}
                      </div>
                      <h3 className="font-bold text-primary">{p.titre}</h3>
                      {p.type_aide && <p className="text-xs text-blue-600 font-semibold mt-0.5">Aide : {p.type_aide}</p>}
                      {p.date_souhaitee && <p className="text-xs text-muted-foreground">📅 {new Date(p.date_souhaitee).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>}
                      {p.resume && <p className="text-sm text-muted-foreground mt-0.5">{p.resume}</p>}
                      <p className="text-sm mt-2 line-clamp-2">{p.contenu}</p>
                      {p.type_post === "appel_aide" && (() => {
                        const aiders = reactions.filter(r => r.village_post === p.id);
                        return aiders.length > 0 ? (
                          <div className="mt-2">
                            <button onClick={() => setViewAiders(viewAiders === p.id ? null : p.id)}
                              className="text-xs text-blue-600 font-semibold hover:underline">
                              🤝 {aiders.length} personne(s) proposent leur aide
                            </button>
                            {viewAiders === p.id && (
                              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
                                {aiders.map(r => (
                                  <div key={r.id} className="text-xs flex items-center gap-2">
                                    <span className="font-semibold text-primary">{r.user_name || "Anonyme"}</span>
                                    {r.user_email && <span className="text-muted-foreground">{r.user_email}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => toggleEpingle(p)} title="Épingler"
                        className={`p-2 rounded-lg transition-colors ${p.est_epingle ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                        <Pin className="w-4 h-4" />
                      </button>
                      <button onClick={() => deletePost(p.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            <p className="text-xs text-muted-foreground mb-4">Voici une version reformulée plus claire, humaine et locale. Vous pouvez la garder ou l'utiliser comme base.</p>
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
                onClick={() => applyRewrite(rewriteModal.target, rewriteProposal)}
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