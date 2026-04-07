import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Calendar, Users, MapPin, Clock, Zap, CheckCircle, ArrowRight } from "lucide-react";
import { emitSignal } from "@/lib/emitSignal";

export default function FlashDate() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inscriptionForm, setInscriptionForm] = useState({ nom: "", email: "", poste: "", entreprise: "" });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [inscribing, setInscribing] = useState(false);
  const [inscribed, setInscribed] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.FlashDateEvent.filter({}, "date_debut", 10).catch(() => []);
    setEvents(data.filter(e => ["ouvert", "complet", "passe"].includes(e.statut)));
    setLoading(false);
  };

  const handleInscription = async (e) => {
    e.preventDefault();
    if (!selectedEvent || !inscriptionForm.email) return;
    setInscribing(true);
    setError(null);
    try {
      // Créer un MatchRequest comme "inscription"
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) throw new Error("Connexion requise pour s'inscrire à un Flash Date.");

      const user = await base44.auth.me();

      // Vérifier ou créer le profil MatchProfile
      let profiles = await base44.entities.MatchProfile.filter({ user_id: user.id }).catch(() => []);
      if (profiles.length === 0) {
        await base44.entities.MatchProfile.create({
          user_id: user.id,
          prenom: inscriptionForm.nom || user.email?.split("@")[0],
          poste: inscriptionForm.poste,
          entreprise: inscriptionForm.entreprise,
          secteur: "autre",
          commune: "",
          visible: true,
          open_to_match: true,
          nb_matchs: 0,
          created_at: new Date().toISOString(),
        });
      }

      // Incrémenter nb_inscrits sur l'event
      await base44.entities.FlashDateEvent.update(selectedEvent.id, {
        nb_inscrits: (selectedEvent.nb_inscrits ?? 0) + 1,
      }).catch(() => {});

      // Email de confirmation
      await base44.functions.invoke("sendLeadEmail", {
        to: inscriptionForm.email,
        subject: `✅ Inscription Flash Date — ${selectedEvent.titre}`,
        body: `Bonjour ${inscriptionForm.nom || ""},\n\nVotre inscription au Flash Date "${selectedEvent.titre}" est confirmée.\n\nDate : ${new Date(selectedEvent.date_debut).toLocaleString("fr-FR")}\nLieu : ${selectedEvent.lieu}\n\nÀ très vite !`,
        template: "flash_date_inscription",
      }).catch(() => {});

      emitSignal({
        type: "participe",
        target_type: "flash_date_event",
        target_id: selectedEvent.id,
        commune: selectedEvent.commune || "",
        topic_tags: ["flash_date", inscriptionForm.secteur || "pro"].filter(Boolean),
        weight: 0.85,
        meta: { titre: selectedEvent.titre },
      });
      setInscribed(prev => ({ ...prev, [selectedEvent.id]: true }));
      setSelectedEvent(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setInscribing(false);
    }
  };

  const upcoming = events.filter(e => e.statut === "ouvert" || (e.statut === "complet" && new Date(e.date_debut) > new Date()));
  const past = events.filter(e => e.statut === "passe" || new Date(e.date_debut) < new Date());

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* Hero */}
      <section style={{ backgroundColor: "#1D1836" }} className="border-b-2">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-5 border-2"
            style={{ backgroundColor: "#FF6FB5", borderColor: "#FF6FB5", color: "#1D1836" }}>
            ⚡ Flash Date Pro · Pévèle
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4 text-white">
            7 minutes.<br />
            <span style={{ color: "#FF6FB5" }}>1 connexion qui change tout.</span>
          </h1>
          <p className="text-base font-medium mb-8 max-w-lg" style={{ color: "rgba(255,255,255,0.7)" }}>
            Networking structuré en mode speed meeting. En {" "}
            <strong className="text-white">7 min par rencontre</strong>, rencontrez les entrepreneurs, prestataires et talents de Pévèle. L'IA WIINUP vous suggère les profils les plus compatibles.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-sm">
            {[
              { icon: "⚡", label: "7 min / round" },
              { icon: "🤝", label: "8 rounds max" },
              { icon: "🎯", label: "IA matchmaking" },
            ].map((stat, i) => (
              <div key={i} className="text-center p-3 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <div className="text-xl mb-1">{stat.icon}</div>
                <div className="text-xs font-black text-white">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} /></div>
        ) : (
          <>
            {/* Événements à venir */}
            <h2 className="text-2xl font-black mb-5" style={{ color: "#1D1836" }}>
              📅 Prochains Flash Dates ({upcoming.length})
            </h2>

            {upcoming.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 mb-10" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="text-lg font-black mb-2" style={{ color: "#1D1836" }}>Aucun Flash Date planifié</h3>
                <p className="text-sm mb-4" style={{ color: "#1D1836", opacity: 0.6 }}>
                  Les prochains événements seront annoncés ici. Restez connecté !
                </p>
                <Link to="/rencontres" className="text-sm font-bold text-orange-500 hover:underline">
                  Voir les profils rencontres →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                {upcoming.map(ev => (
                  <div key={ev.id} className="bg-white rounded-2xl border-2 overflow-hidden hover:shadow-lg transition-all"
                    style={{ borderColor: ev.statut === "complet" ? "#e0e0e0" : "#FF6FB5" }}>
                    {ev.image_url && (
                      <img loading="lazy" src={ev.image_url} alt={ev.titre} className="w-full h-36 object-cover" />
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: ev.statut === "complet" ? "#e0e0e0" : "#FF6FB5",
                            color: "#1D1836"
                          }}>
                          {ev.statut === "complet" ? "Complet" : "Inscriptions ouvertes"}
                        </span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: ev.prix_billet === 0 ? "#B8F5C4" : "#FFD84D", color: "#1D1836" }}>
                          {ev.prix_billet === 0 ? "Gratuit" : `${ev.prix_billet}€`}
                        </span>
                      </div>

                      <h3 className="font-black text-base mb-2" style={{ color: "#1D1836" }}>{ev.titre}</h3>

                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center gap-2 text-xs" style={{ color: "#1D1836", opacity: 0.7 }}>
                          <Calendar className="w-3 h-3" />
                          {new Date(ev.date_debut).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: "#1D1836", opacity: 0.7 }}>
                          <MapPin className="w-3 h-3" /> {ev.lieu} · {ev.commune}
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: "#1D1836", opacity: 0.7 }}>
                          <Users className="w-3 h-3" /> {ev.nb_inscrits ?? 0} / {ev.capacite_max ?? "∞"} inscrits
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: "#1D1836", opacity: 0.7 }}>
                          <Clock className="w-3 h-3" /> {ev.nb_rounds ?? 8} rounds de {ev.duree_round_min ?? 7} min
                        </div>
                      </div>

                      {inscribed[ev.id] ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-green-600">
                          <CheckCircle className="w-4 h-4" /> Inscrit !
                        </div>
                      ) : ev.statut === "complet" ? (
                        <button disabled className="w-full py-2.5 rounded-xl text-sm font-black border-2 opacity-50"
                          style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
                          Complet
                        </button>
                      ) : (
                        <button onClick={() => { setSelectedEvent(ev); setError(null); }}
                          className="w-full py-2.5 rounded-2xl text-sm font-black text-white transition-all hover:scale-105"
                          style={{ backgroundColor: "#FF6FB5" }}>
                          <Zap className="w-3 h-3 inline mr-1" /> S'inscrire
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Événements passés */}
            {past.length > 0 && (
              <>
                <h2 className="text-xl font-black mb-4" style={{ color: "#1D1836", opacity: 0.6 }}>Événements passés</h2>
                <div className="space-y-3">
                  {past.slice(0, 5).map(ev => (
                    <div key={ev.id} className="bg-white rounded-xl border-2 p-4 flex items-center justify-between opacity-60"
                      style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                      <div>
                        <h3 className="font-black text-sm" style={{ color: "#1D1836" }}>{ev.titre}</h3>
                        <p className="text-xs" style={{ color: "#1D1836" }}>
                          {new Date(ev.date_debut).toLocaleDateString("fr-FR")} · {ev.lieu}
                        </p>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100">{ev.nb_inscrits ?? 0} participants</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* CTA Observatoire */}
        <div className="mt-10 text-center bg-white rounded-3xl border-2 p-8" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
          <div className="text-3xl mb-3">🌐</div>
          <h2 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Développez votre réseau Pévèle</h2>
          <p className="text-sm mb-5" style={{ color: "#1D1836", opacity: 0.6 }}>Inscrivez-vous sur la plateforme pour accéder au matching IA, aux introductions B2B et aux Flash Dates.</p>
          <Link to="/rencontres" className="inline-flex items-center gap-2 text-white font-black py-3 px-7 rounded-2xl text-sm" style={{ backgroundColor: "#FF6A00" }}>
            Voir tous les profils <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Modal inscription */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl">
            <div className="p-6 border-b-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
              <h2 className="font-black text-lg" style={{ color: "#1D1836" }}>⚡ Inscription Flash Date</h2>
              <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.6 }}>{selectedEvent.titre}</p>
            </div>
            <form onSubmit={handleInscription} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Prénom</label>
                  <input type="text" value={inscriptionForm.nom} onChange={e => setInscriptionForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Votre prénom"
                    className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Email *</label>
                  <input type="email" required value={inscriptionForm.email} onChange={e => setInscriptionForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@..."
                    className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Poste</label>
                  <input type="text" value={inscriptionForm.poste} onChange={e => setInscriptionForm(f => ({ ...f, poste: e.target.value }))}
                    placeholder="Ex: CEO, Développeur..."
                    className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Entreprise</label>
                  <input type="text" value={inscriptionForm.entreprise} onChange={e => setInscriptionForm(f => ({ ...f, entreprise: e.target.value }))}
                    placeholder="Nom de l'entreprise"
                    className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelectedEvent(null)}
                  className="flex-1 font-black py-3 rounded-2xl border-2 text-sm"
                  style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
                  Annuler
                </button>
                <button type="submit" disabled={inscribing}
                  className="flex-1 text-white font-black py-3 rounded-2xl text-sm transition-all hover:scale-105 disabled:opacity-60"
                  style={{ backgroundColor: "#FF6FB5" }}>
                  {inscribing ? "Inscription..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
