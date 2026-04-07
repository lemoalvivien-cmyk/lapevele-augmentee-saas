import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Plus, Trash2, Pin, Edit2, Users, Eye } from "lucide-react";
import MairieGuard from "@/components/MairieGuard";

const CATEGORIES = ["culture", "sport", "nature", "solidarite", "jeunesse", "famille", "marche", "autre"];

const EMPTY_FORM = {
  titre: "", description: "", categorie: "", date_debut: "", date_fin: "",
  lieu: "", quartier: "", image: "", est_public: true, est_epingle: false,
};

export default function Evenements() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [propositions, setPropositions] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [viewParticip, setViewParticip] = useState(null);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const [ev, parts, props] = await Promise.all([
      base44.entities.EvenementLocal.filter({}, "-date_debut", 100),
      base44.entities.ParticipationEvenement.filter({}),
      base44.entities.PropositionEvenement.filter({ statut: "en_attente" }, "-created_date", 50),
    ]);
    setEvents(ev);
    setParticipations(parts);
    setPropositions(props);
    setLoading(false);
  };

  const accepterProposition = async (prop) => {
    await base44.entities.EvenementLocal.create({
      titre: prop.titre,
      description: prop.description || "",
      categorie: prop.categorie || "autre",
      date_debut: prop.date_heure,
      lieu: prop.lieu || "",
      quartier: prop.quartier || "",
      commune: prop.commune,
      est_public: true,
      est_epingle: false,
      created_by: user?.email,
    });
    await base44.entities.PropositionEvenement.update(prop.id, { statut: "acceptee" });
    load();
  };

  const refuserProposition = async (prop) => {
    await base44.entities.PropositionEvenement.update(prop.id, { statut: "refusee" });
    load();
  };

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (e) => {
    setEditId(e.id);
    setForm({
      titre: e.titre || "", description: e.description || "", categorie: e.categorie || "",
      date_debut: e.date_debut ? e.date_debut.slice(0, 16) : "",
      date_fin: e.date_fin ? e.date_fin.slice(0, 16) : "",
      lieu: e.lieu || "", quartier: e.quartier || "", image: e.image || "",
      est_public: e.est_public ?? true, est_epingle: e.est_epingle ?? false,
    });
    setShowForm(true);
  };

  const save = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      commune: user?.commune,
      created_by: user?.email,
      date_debut: form.date_debut ? new Date(form.date_debut).toISOString() : "",
      date_fin: form.date_fin ? new Date(form.date_fin).toISOString() : "",
    };
    if (editId) {
      await base44.entities.EvenementLocal.update(editId, payload);
    } else {
      await base44.entities.EvenementLocal.create(payload);
    }
    setShowForm(false); setEditId(null);
    load(); setSaving(false);
  };

  const toggleEpingle = async (e) => {
    await base44.entities.EvenementLocal.update(e.id, { est_epingle: !e.est_epingle });
    load();
  };

  const deleteEvent = async (id) => {
    await base44.entities.EvenementLocal.delete(id);
    load();
  };

  const publierSurPlace = async (e) => {
    await base44.entities.VillagePost.create({
      commune: e.commune || user?.commune, type_post: "actualite",
      titre: e.titre,
      resume: `📅 ${e.lieu ? e.lieu + " · " : ""}${new Date(e.date_debut).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`,
      contenu: e.description || e.titre,
      est_public: true, published_at: new Date().toISOString(), created_by: user?.email,
    });
    alert("Publié sur la Place du Village !");
  };

  const particsForEvent = (eventId) => participations.filter(p => p.evenement === eventId);

  const upcoming = events.filter(e => new Date(e.date_debut) >= new Date());
  const past = events.filter(e => new Date(e.date_debut) < new Date());

  return (
    <MairieGuard>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <h1 className="text-3xl font-bold text-primary">Événements locaux</h1>
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-accent text-accent-foreground font-bold py-3 px-5 rounded-xl">
              <Plus className="w-5 h-5" /> Nouvel événement
            </button>
          </div>

          {/* Formulaire */}
          {showForm && (
            <form onSubmit={save} className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4">
              <h2 className="font-bold text-primary">{editId ? "Modifier l'événement" : "Nouvel événement"}</h2>
              <input required value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                placeholder="Titre *" className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                placeholder="Description" className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Catégorie</label>
                  <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none">
                    <option value="">— choisir —</option>
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Quartier</label>
                  <input value={form.quartier} onChange={e => setForm(f => ({ ...f, quartier: e.target.value }))}
                    placeholder="Ex : Centre-ville" className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date et heure de début *</label>
                  <input required type="datetime-local" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date et heure de fin</label>
                  <input type="datetime-local" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <input value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))}
                placeholder="Lieu (ex : Salle des fêtes)" className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
              <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                placeholder="URL image (optionnel)" className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.est_public} onChange={e => setForm(f => ({ ...f, est_public: e.target.checked }))} className="w-4 h-4" />
                  <span>Visible publiquement</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.est_epingle} onChange={e => setForm(f => ({ ...f, est_epingle: e.target.checked }))} className="w-4 h-4" />
                  <span>Épingler</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                  className="flex-1 border border-border py-3 rounded-xl font-semibold text-sm">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-accent text-accent-foreground font-bold py-3 rounded-xl text-sm disabled:opacity-60">
                  {saving ? "Sauvegarde…" : editId ? "Enregistrer" : "Créer l'événement"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : (
            <div className="space-y-8">
              {propositions.length > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5">
                  <h2 className="text-sm font-black uppercase tracking-wide mb-4" style={{ color: "#1D1836" }}>🕐 Propositions en attente ({propositions.length})</h2>
                  <div className="space-y-3">
                    {propositions.map(p => (
                      <div key={p.id} className="bg-white border border-yellow-200 rounded-xl p-4 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm" style={{ color: "#1D1836" }}>{p.titre}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#1D1836", opacity: 0.55 }}>
                            {p.commune} · {p.date_heure ? new Date(p.date_heure).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "—"}
                            {p.lieu ? ` · ${p.lieu}` : ""}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#FF6A00" }}>Par {p.prenom_proposant}{p.email_proposant ? ` · ${p.email_proposant}` : ""}</p>
                          {p.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: "#1D1836", opacity: 0.6 }}>{p.description}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => accepterProposition(p)}
                            className="text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ backgroundColor: "#4CAF50" }}>
                            ✓ Accepter
                          </button>
                          <button onClick={() => refuserProposition(p)}
                            className="text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ backgroundColor: "#EF4444" }}>
                            ✗ Refuser
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {[
                { label: "À venir", items: upcoming },
                { label: "Passés", items: past },
              ].map(({ label, items }) => items.length > 0 && (
                <div key={label}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{label}</h2>
                  <div className="space-y-3">
                    {items.map(e => {
                      const parts = particsForEvent(e.id);
                      return (
                        <div key={e.id} className="bg-card border border-border rounded-xl p-5">
                          <div className="flex items-start gap-4 flex-wrap">
                            {e.image && <img loading="lazy" src={e.image} alt="" className="w-20 h-16 object-cover rounded-lg shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 flex-wrap">
                                {e.categorie && <span className="capitalize font-semibold">{e.categorie}</span>}
                                {e.est_epingle && <span className="text-primary font-bold">📌 Épinglé</span>}
                                {!e.est_public && <span className="text-destructive font-bold">Non public</span>}
                              </div>
                              <h3 className="font-bold text-primary">{e.titre}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(e.date_debut).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                {e.lieu && ` · ${e.lieu}`}
                              </p>
                              {parts.length > 0 && (
                                <button onClick={() => setViewParticip(viewParticip === e.id ? null : e.id)}
                                  className="flex items-center gap-1 text-xs text-accent font-semibold mt-1 hover:underline">
                                  <Users className="w-3 h-3" /> {parts.length} participation(s)
                                </button>
                              )}
                              {viewParticip === e.id && (
                                <div className="mt-2 bg-secondary rounded-xl p-3 space-y-1 text-xs">
                                  {parts.map(p => (
                                    <div key={p.id} className="flex items-center gap-2">
                                      <span className={`font-semibold ${p.statut === "inscrit" ? "text-green-600" : "text-muted-foreground"}`}>
                                        {p.statut === "inscrit" ? "✓" : "○"}
                                      </span>
                                      <span>{p.nom}</span>
                                      {p.email && <span className="text-muted-foreground">· {p.email}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => openEdit(e)} title="Modifier"
                                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-primary transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => toggleEpingle(e)} title="Épingler"
                                className={`p-2 rounded-lg transition-colors ${e.est_epingle ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
                                <Pin className="w-4 h-4" />
                              </button>
                              <button onClick={() => publierSurPlace(e)} title="Publier sur Place du Village"
                                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-accent transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteEvent(e.id)} title="Supprimer"
                                className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {events.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  <div className="text-5xl mb-4">📅</div>
                  <p className="text-lg font-semibold text-primary mb-1">Aucun événement créé</p>
                  <p className="text-sm">Cliquez sur "Nouvel événement" pour commencer.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MairieGuard>
  );
}