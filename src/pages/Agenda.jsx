import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, Calendar, Users, Plus, X, CheckCircle } from "lucide-react";
import SponsorSlot from "@/components/SponsorSlot";

const CATEGORIES = [
  { key: "sport", label: "⚽ Sport", color: "#63C7FF" },
  { key: "culture", label: "🎭 Culture", color: "#FF6FB5" },
  { key: "famille", label: "👶 Famille", color: "#FFDAB3" },
  { key: "solidarite", label: "🤲 Solidarité", color: "#B8F5C4" },
  { key: "marche", label: "🛒 Marché", color: "#FFD84D" },
  { key: "nature", label: "🌱 Nature", color: "#B8F5C4" },
  { key: "jeunesse", label: "🎉 Jeunesse", color: "#FF6FB5" },
  { key: "autre", label: "✨ Autre", color: "#e0e0e0" },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

function formatDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export default function Agenda() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filtreCategorie, setFiltreCategorie] = useState("tous");
  const [profile, setProfile] = useState(null);
  const [participModal, setParticipModal] = useState(null);
  const [participForm, setParticipForm] = useState({ nom: "", email: "", statut: "interesse" });
  const [participConsent, setParticipConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState({});
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [proposeForm, setProposeForm] = useState({ titre: "", description: "", categorie: "autre", date_debut: "", lieu: "", quartier: "", commune: "", nom: "", email: "" });
  const [communes, setCommunes] = useState([]);
  const [proposeSent, setProposeSent] = useState(false);
  const [proposeSending, setProposeSending] = useState(false);
  const [eventPage, setEventPage] = useState(0);
  const EVENTS_PER_PAGE = 12;

  useEffect(() => { load(); loadProfile(); loadCommunes(); }, []);

  const loadProfile = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return;
    const user = await base44.auth.me();
    const profiles = await base44.entities.UserProfile.filter({ email: user.email });
    if (profiles[0]) setProfile(profiles[0]);
  };

  const loadCommunes = async () => {
    try {
      const data = await base44.entities.Commune.filter({ statut: "active" }, "nom");
      setCommunes(data);
    } catch {
      // silently fail — formulaire proposition désactivé si communes indisponibles
    }
  };

  const load = async () => {
    setLoadError(false);
    setLoading(true);
    const timeout = setTimeout(() => { setLoadError(true); setLoading(false); }, 10000);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const res = await base44.functions.invoke('getPublicEvenements', {});
      const data = Array.isArray(res.data) ? res.data : [];
      setEvents(data.filter(e => e.date_debut >= thirtyDaysAgo));
    } catch {
      setLoadError(true);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const filtered = events.filter(e => filtreCategorie === "tous" || e.categorie === filtreCategorie);
  const upcoming = filtered.filter(e => new Date(e.date_debut) >= new Date());
  const past = filtered.filter(e => new Date(e.date_debut) < new Date());
  const paginatedUpcoming = upcoming.slice(0, EVENTS_PER_PAGE * (eventPage + 1));
  const hasMoreEvents = upcoming.length > EVENTS_PER_PAGE * (eventPage + 1);

  const openParticip = (event) => {
    setParticipModal(event);
    setParticipConsent(false);
  };

  const submitParticip = async (e) => {
    e.preventDefault();
    const lastParticip = parseInt(sessionStorage.getItem("last_particip") || "0");
    if (Date.now() - lastParticip < 10000) return;
    setSending(true);
    try {
      await base44.entities.ParticipationEvenement.create({
        evenement: participModal.id, nom: participForm.nom, email: participForm.email, statut: participForm.statut,
      });
      sessionStorage.setItem("last_particip", String(Date.now()));
    } catch {
      // Ne pas bloquer — on confirme quand même côté UI
    } finally {
      setSent(prev => ({ ...prev, [participModal.id]: true }));
      setSending(false);
      setParticipModal(null);
    }
  };

  const submitPropose = async (e) => {
    e.preventDefault();
    const lastPropose = parseInt(sessionStorage.getItem("last_propose") || "0");
    if (Date.now() - lastPropose < 60000) return;
    setProposeSending(true);
    await base44.entities.PropositionEvenement.create({
      titre: proposeForm.titre,
      categorie: proposeForm.categorie,
      commune: proposeForm.commune,
      date_heure: proposeForm.date_debut,
      lieu: proposeForm.lieu,
      description: proposeForm.description,
      quartier: proposeForm.quartier,
      prenom_proposant: proposeForm.nom || "Citoyen",
      email_proposant: proposeForm.email || "",
      statut: "en_attente",
    });
    setProposeSent(true);
    sessionStorage.setItem("last_propose", String(Date.now()));
    setProposeSending(false);
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* Hero citoyen */}
      <div className="px-4 pt-12 pb-10 text-center" style={{ backgroundColor: "#FFD84D" }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-5 border-2 bg-white/60"
            style={{ borderColor: "#1D1836", color: "#1D1836" }}>
            📅 Pévèle Carembault · Gratuit · Sans compte
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight" style={{ color: "#1D1836" }}>
            Ce qui se passe<br className="hidden sm:block" /> près de chez vous
          </h1>
          <p className="text-base font-medium mb-7 max-w-lg mx-auto" style={{ color: "#1D1836", opacity: 0.7 }}>
            Sport, culture, marchés, sorties, solidarité — tous les événements de votre territoire, au même endroit.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setShowProposeForm(true); setProposeSent(false); }}
              className="inline-flex items-center justify-center gap-2 text-white font-black py-3.5 px-8 rounded-2xl shadow-lg transition-all hover:scale-105 text-sm"
              style={{ backgroundColor: "#FF6A00" }}>
              <Plus className="w-4 h-4" /> Je propose un événement
            </button>
            <a href="#evenements"
              className="inline-flex items-center justify-center gap-2 font-black py-3.5 px-8 rounded-2xl border-2 bg-white/70 transition-all hover:bg-white text-sm"
              style={{ borderColor: "#1D1836", color: "#1D1836" }}>
              Voir l'agenda ↓
            </a>
          </div>
          <p className="text-xs mt-3 font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>
            Votre proposition est relayée après validation par la commune.
          </p>
        </div>
      </div>

      {/* Filtres catégories */}
      <div className="bg-white border-b-2 border-ink/10 px-4 py-4 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-3xl mx-auto flex gap-2 flex-nowrap pb-1">
          <button
            onClick={() => setFiltreCategorie("tous")}
            className="shrink-0 px-4 py-2 rounded-full text-xs font-black border-2 transition-all min-h-[44px]"
            style={{
              backgroundColor: filtreCategorie === "tous" ? "#FFD84D" : "white",
              borderColor: filtreCategorie === "tous" ? "#1D1836" : "rgba(29,24,54,0.15)",
              color: "#1D1836",
            }}>
            Tous les événements
          </button>
          {CATEGORIES.map(c => (
            <button key={c.key}
              onClick={() => setFiltreCategorie(c.key)}
              className="shrink-0 px-4 py-2 rounded-full text-xs font-black border-2 transition-all min-h-[44px]"
              style={{
                backgroundColor: filtreCategorie === c.key ? c.color : "white",
                borderColor: filtreCategorie === c.key ? "#1D1836" : "rgba(29,24,54,0.15)",
                color: "#1D1836",
              }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sponsor slot agenda */}
      <div className="max-w-3xl mx-auto px-4 pt-5">
        <SponsorSlot rubrique="agenda" />
      </div>

      {/* Filtre quartier profil */}
      {profile?.quartier && (
        <div className="bg-white border-b-2 border-ink/10 px-4 py-2">
          <div className="max-w-3xl mx-auto text-xs font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>
            📍 Connecté depuis le quartier : <strong style={{ opacity: 1 }}>{profile.quartier}</strong>
          </div>
        </div>
      )}

      {/* Contenu */}
      <div id="evenements" className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        {loadError ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 px-6" style={{ borderColor: "#FF6A00" }}>
            <div className="text-4xl mb-4">📅</div>
            <p className="font-black text-lg mb-2" style={{ color: "#1D1836" }}>Impossible de charger l'agenda</p>
            <p className="text-sm mb-6" style={{ color: "#1D1836", opacity: 0.6 }}>Vérifiez votre connexion internet.</p>
            <button onClick={load}
              className="text-white font-black py-3 px-8 rounded-2xl shadow-lg"
              style={{ backgroundColor: "#FF6A00" }}>Réessayer</button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xl font-black mb-5 flex items-center gap-2" style={{ color: "#1D1836" }}>
                  <Calendar className="w-5 h-5" style={{ color: "#FF6A00" }} />
                  {upcoming.length} événement{upcoming.length > 1 ? "s" : ""} à venir
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paginatedUpcoming.map(e => (
                      <EventCard key={e.id} event={e} sent={!!sent[e.id]} onParticip={() => openParticip(e)} />
                  ))}
                </div>
                {hasMoreEvents && (
                  <div className="flex justify-center pt-6">
                    <button
                      onClick={() => setEventPage(p => p + 1)}
                      className="text-white font-black py-3 px-8 rounded-xl shadow-lg transition-all hover:scale-105"
                      style={{ backgroundColor: "#FF6A00" }}>
                      Charger plus ({EVENTS_PER_PAGE * (eventPage + 1)}/{upcoming.length})
                    </button>
                  </div>
                )}
              </section>
            )}

            {upcoming.length === 0 && past.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-5">📅</div>
                <p className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>Pas encore d'événements publiés</p>
                <p className="text-base mb-8 max-w-sm mx-auto" style={{ color: "#1D1836", opacity: 0.55 }}>
                  Proposez le premier événement de votre commune — la mairie le relayera sur cet agenda.
                </p>
                <button onClick={() => { setShowProposeForm(true); setProposeSent(false); }}
                  className="text-white font-black py-4 px-10 rounded-2xl shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: "#FF6A00" }}>
                  <Plus className="w-4 h-4 inline mr-2" />Je propose un événement
                </button>
              </div>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "#1D1836", opacity: 0.4 }}>Passés</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60">
                  {past.slice(0, 4).map(e => (
                    <EventCard key={e.id} event={e} past />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Modal participation */}
      {participModal && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-ink/10">
            {sent[participModal.id] ? (
              <div className="text-center py-6">
                <CheckCircle className="w-14 h-14 mx-auto mb-3" style={{ color: "#FF6A00" }} />
                <p className="font-black text-lg mb-1" style={{ color: "#1D1836" }}>C'est noté !</p>
                <p className="text-sm mb-4" style={{ color: "#1D1836", opacity: 0.55 }}>Votre réponse a été enregistrée.</p>
                <button onClick={() => setParticipModal(null)} className="text-sm font-bold underline" style={{ color: "#FF6A00" }}>Fermer</button>
              </div>
            ) : (
              <form onSubmit={submitParticip} className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-black text-base leading-snug" style={{ color: "#1D1836" }}>{participModal.titre}</h2>
                  <button type="button" onClick={() => setParticipModal(null)} className="shrink-0 p-1">
                    <X className="w-4 h-4" style={{ color: "#1D1836", opacity: 0.4 }} />
                  </button>
                </div>
                <p className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>Aucun compte requis pour participer.</p>
                <div className="flex gap-2">
                  {[{ val: "interesse", label: "Je suis intéressé" }, { val: "inscrit", label: "Je m'inscris" }].map(opt => (
                    <button type="button" key={opt.val} onClick={() => setParticipForm(f => ({ ...f, statut: opt.val }))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                      style={{
                        backgroundColor: participForm.statut === opt.val ? "#FFD84D" : "white",
                        borderColor: participForm.statut === opt.val ? "#1D1836" : "rgba(29,24,54,0.15)",
                        color: "#1D1836"
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input required value={participForm.nom} onChange={e => setParticipForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Votre prénom *"
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium border-2 focus:outline-none"
                  style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                <input type="email" value={participForm.email} onChange={e => setParticipForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email (optionnel — pour être recontacté)"
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium border-2 focus:outline-none"
                  style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={participConsent}
                    onChange={e => setParticipConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-orange"
                  />
                  <span className="text-xs leading-relaxed font-medium" style={{ color: "#1D1836", opacity: 0.75 }}>
                    J'accepte que mes données soient transmises à l'organisateur de l'événement.{" "}
                    <a href="/mentions-legales" target="_blank" rel="noopener noreferrer"
                      className="underline underline-offset-2 font-bold" style={{ color: "#FF6A00" }}>
                      Voir nos mentions légales
                    </a>.
                  </span>
                </label>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setParticipModal(null)}
                    className="flex-1 border-2 py-3 rounded-xl text-sm font-bold transition-colors"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
                    Annuler
                  </button>
                  <button type="submit" disabled={sending || !participConsent}
                    className="flex-1 text-white font-black py-3 rounded-xl text-sm disabled:opacity-60 shadow-md"
                    style={{ backgroundColor: "#FF6A00" }}>
                    {sending ? "Envoi…" : "Je participe"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal proposer un événement */}
      {showProposeForm && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border-2 border-ink/10 my-auto">
            {proposeSent ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "#FF6A00" }} />
                <h2 className="text-2xl font-black mb-2" style={{ color: "#1D1836" }}>Proposition reçue !</h2>
                <p className="text-base mb-2" style={{ color: "#1D1836", opacity: 0.65 }}>
                  Merci. Votre événement sera relu par la commune avant d'être publié sur l'agenda.
                </p>
                <p className="text-sm font-bold mb-6" style={{ color: "#1D1836", opacity: 0.4 }}>
                  Pas de délai garanti — la validation dépend de la mairie.
                </p>
                <button onClick={() => setShowProposeForm(false)}
                  className="text-white font-black py-3 px-8 rounded-2xl shadow-lg"
                  style={{ backgroundColor: "#FF6A00" }}>
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={submitPropose} className="space-y-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="font-black text-xl" style={{ color: "#1D1836" }}>Proposer un événement</h2>
                  <button type="button" onClick={() => setShowProposeForm(false)} className="p-1">
                    <X className="w-5 h-5" style={{ color: "#1D1836", opacity: 0.4 }} />
                  </button>
                </div>
                <p className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>
                  Votre proposition sera transmise à la commune. Elle apparaîtra sur l'agenda après validation.
                </p>

                <PF label="Titre de l'événement *">
                  <input required value={proposeForm.titre} onChange={e => setProposeForm(f => ({ ...f, titre: e.target.value }))}
                    placeholder="Ex : Tournoi de pétanque du quartier…" className="pfi" />
                </PF>

                <PF label="Catégorie">
                  <select value={proposeForm.categorie} onChange={e => setProposeForm(f => ({ ...f, categorie: e.target.value }))}
                    className="pfi bg-white">
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </PF>

                <PF label="Commune *">
                  <select required value={proposeForm.commune} onChange={e => setProposeForm(f => ({ ...f, commune: e.target.value }))}
                    className="pfi bg-white">
                    <option value="">— Sélectionnez votre commune —</option>
                    {communes.map(c => <option key={c.id} value={c.slug}>{c.nom}</option>)}
                  </select>
                </PF>

                <div className="grid grid-cols-2 gap-3">
                  <PF label="Date et heure *">
                    <input required type="datetime-local" value={proposeForm.date_debut}
                      onChange={e => setProposeForm(f => ({ ...f, date_debut: e.target.value }))} className="pfi" />
                  </PF>
                  <PF label="Lieu">
                    <input value={proposeForm.lieu} onChange={e => setProposeForm(f => ({ ...f, lieu: e.target.value }))}
                      placeholder="Salle des fêtes…" className="pfi" />
                  </PF>
                </div>

                <PF label="Description">
                  <textarea rows={3} value={proposeForm.description}
                    onChange={e => setProposeForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Décrivez l'événement, qui peut venir, comment participer…" className="pfi resize-none" />
                </PF>

                <PF label="Quartier (optionnel)">
                  <input value={proposeForm.quartier} onChange={e => setProposeForm(f => ({ ...f, quartier: e.target.value }))}
                    placeholder="Centre-ville, Les Acacias…" className="pfi" />
                </PF>

                <div className="grid grid-cols-2 gap-3">
                  <PF label="Votre prénom *">
                    <input required value={proposeForm.nom} onChange={e => setProposeForm(f => ({ ...f, nom: e.target.value }))}
                      placeholder="Marie" className="pfi" />
                  </PF>
                  <PF label="Email (optionnel)">
                    <input type="email" value={proposeForm.email} onChange={e => setProposeForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="pour être recontacté" className="pfi" />
                  </PF>
                </div>

                <button type="submit" disabled={proposeSending}
                  className="w-full text-white font-black py-4 rounded-xl shadow-lg transition-all hover:scale-105 disabled:opacity-60"
                  style={{ backgroundColor: "#FF6A00" }}>
                  {proposeSending ? "Envoi…" : "Envoyer ma proposition →"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`.pfi { width:100%; border:2px solid rgba(29,24,54,0.15); border-radius:0.75rem; padding:0.65rem 1rem; font-size:0.9rem; outline:none; font-family:inherit; font-weight:500; color:#1D1836; background:#FFF8F1; } .pfi:focus { border-color:#FF6A00; }`}</style>
    </div>
  );
}

function EventCard({ event: e, onParticip, sent, past }) {
  const cat = CAT_MAP[e.categorie] || { label: "Événement", color: "#e0e0e0" };
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col"
      style={{ border: (!past && e.est_epingle) ? "2px solid #FF6A00" : "2px solid rgba(29,24,54,0.08)" }}>

      {e.image ? (
        <div className="relative">
          <img loading="lazy" src={e.image} alt="" className="w-full object-cover h-44" />
          {cat && (
            <span
              className="absolute top-3 left-3 text-xs font-black px-3 py-1.5 rounded-full border border-ink/10 shadow-sm"
              style={{ backgroundColor: cat.color, color: "#1D1836" }}>
              {cat.label}
            </span>
          )}
          {!past && e.est_epingle && (
            <span className="absolute top-3 right-3 text-xs font-black px-2.5 py-1 rounded-full bg-white shadow-sm" style={{ color: "#FF6A00" }}>📌 À la une</span>
          )}
        </div>
      ) : (
        <div className="h-2 w-full" style={{ backgroundColor: cat?.color || "#e0e0e0" }} />
      )}

      <div className="p-5 flex flex-col flex-1">
        {!e.image && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {!past && e.est_epingle && <span className="text-xs font-black" style={{ color: "#FF6A00" }}>📌 À la une</span>}
            {cat && (
              <span
                className="text-xs font-black px-2.5 py-1 rounded-full border border-ink/10"
                style={{ backgroundColor: cat.color, color: "#1D1836" }}>
                {cat.label}
              </span>
            )}
          </div>
        )}

        <h3 className="font-black text-base mb-2 leading-snug" style={{ color: "#1D1836" }}>{e.titre}</h3>
        {e.description && (
          <p className="text-sm mb-3 line-clamp-2 leading-relaxed flex-1" style={{ color: "#1D1836", opacity: 0.6 }}>{e.description}</p>
        )}

        <div className="space-y-1 text-xs font-medium mb-4" style={{ color: "#1D1836", opacity: 0.5 }}>
          <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(e.date_debut)}</p>
          {e.lieu && (
            <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {e.lieu}{e.quartier ? ` · ${e.quartier}` : ""}</p>
          )}
        </div>

        {!past && onParticip && (
          <button
            onClick={onParticip}
            className="w-full flex items-center justify-center gap-2 font-black py-3.5 px-5 rounded-xl text-sm transition-all hover:scale-105 mt-auto"
            style={{
              backgroundColor: sent ? "#B8F5C4" : "#FF6A00",
              color: sent ? "#1D1836" : "white",
            }}>
            <Users className="w-4 h-4" />
            {sent ? "Participation enregistrée ✓" : "Je participe 🙋"}
          </button>
        )}
      </div>
    </div>
  );
}

function PF({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}