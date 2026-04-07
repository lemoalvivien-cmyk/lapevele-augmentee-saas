import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PublicAssistant from "@/components/PublicAssistant";
import { Loader2, Clock, CheckCircle } from "lucide-react";

const STATUTS = {
  nouveau:  { label: "Reçu par la mairie",        emoji: "📥", color: "#63C7FF" },
  qualifie: { label: "Qualifié",                   emoji: "📋", color: "#FFD84D" },
  en_cours: { label: "En cours de traitement",     emoji: "⚙️", color: "#FF6A00" },
  resolu:   { label: "Résolu",                     emoji: "✅", color: "#4CAF50" },
  rejete:   { label: "Non retenu",                 emoji: "—",  color: "#aaa"   },
};

const TYPES = {
  signaler: { label: "Signalement", emoji: "🚨" },
  proposer: { label: "Proposition", emoji: "💡" },
  aider:    { label: "Offre d'aide", emoji: "🤝" },
};

const STEPS = ["nouveau", "qualifie", "en_cours", "resolu"];

export default function MonSuivi() {
  const { token } = useParams();
  const [state, setState] = useState("loading");
  const [dossier, setDossier] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [satisfactionSent, setSatisfactionSent] = useState(false);
  const [satLoading, setSatLoading] = useState(false);
  const [satError, setSatError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    load();
  }, [token]);

  const load = async () => {
    setState("loading");
    setLoadError("");
    try {
      const res = await base44.functions.invoke('getSuiviDossier', { token });
      if (res.data?.error) {
        setState("invalid");
        return;
      }
      const { dossier: d, updates: u } = res.data;
      setDossier(d);
      setUpdates(u || []);
      if (d.note_satisfaction) setSatisfactionSent(true);
      setState("found");
    } catch {
      setState("error");
      setLoadError("Une erreur est survenue. Vérifiez votre connexion et réessayez.");
    }
  };

  const handleSatisfaction = async (e) => {
    e.preventDefault();
    if (!note) return;
    setSatLoading(true);
    setSatError("");
    try {
      await base44.functions.invoke('submitSatisfaction', { token, note, commentaire });
      setSatisfactionSent(true);
    } catch {
      setSatError("Erreur lors de l'envoi. Réessayez.");
    } finally {
      setSatLoading(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#FF6A00" }} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="text-5xl mb-5">⚠️</div>
        <h1 className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>Erreur de chargement</h1>
        <p className="text-base max-w-sm mb-8" style={{ color: "#1D1836", opacity: 0.6 }}>{loadError}</p>
        <button onClick={load}
          className="text-white font-black py-4 px-8 rounded-2xl shadow-lg"
          style={{ backgroundColor: "#FF6A00" }}>
          Réessayer
        </button>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="text-5xl mb-5">🔍</div>
        <h1 className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>Lien introuvable</h1>
        <p className="text-base max-w-sm mb-8 leading-relaxed" style={{ color: "#1D1836", opacity: 0.6 }}>
          Ce lien de suivi est invalide ou expiré. Vérifiez le lien reçu par email ou copié depuis la page de confirmation.
        </p>
        <Link to="/agir" className="text-white font-black py-4 px-8 rounded-2xl shadow-lg" style={{ backgroundColor: "#FF6A00" }}>
          Faire une contribution
        </Link>
      </div>
    );
  }

  const statut = STATUTS[dossier.statut] || STATUTS.nouveau;
  const type = TYPES[dossier.type_action] || TYPES.signaler;
  const currentStep = STEPS.indexOf(dossier.statut);
  const isResolu = dossier.statut === "resolu";

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "#FFF8F1" }}>
      <PublicAssistant />

      {/* Header statut */}
      <div className="bg-white border-b-2 border-ink/10 px-4 py-8">
        <div className="max-w-xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#1D1836", opacity: 0.55 }}>
            {type.emoji} {type.label} · #{dossier.id.slice(-8).toUpperCase()}
          </div>
          <h1 className="text-2xl md:text-3xl font-black leading-tight mb-4" style={{ color: "#1D1836" }}>{dossier.titre_public}</h1>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border-2"
            style={{ backgroundColor: statut.color + "22", borderColor: statut.color, color: "#1D1836" }}>
            <span>{statut.emoji}</span>
            <span>{statut.label}</span>
          </div>
          <div className="text-xs mt-3 font-medium" style={{ color: "#1D1836", opacity: 0.55 }}>
            Déposé le {new Date(dossier.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            {dossier.commune && ` · ${dossier.commune}`}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* Barre de progression */}
        {dossier.statut !== "rejete" && (
          <div className="bg-white rounded-2xl border-2 border-ink/10 p-5">
            <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "#1D1836", opacity: 0.55 }}>Avancement</p>
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => {
                const done = currentStep >= i;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 shrink-0 transition-all"
                      style={{
                        backgroundColor: done ? "#FF6A00" : "white",
                        borderColor: done ? "#FF6A00" : "rgba(29,24,54,0.15)",
                        color: done ? "white" : "rgba(29,24,54,0.5)"
                      }}>
                      {done ? "✓" : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-1 rounded-full transition-all"
                        style={{ backgroundColor: currentStep > i ? "#FF6A00" : "rgba(29,24,54,0.1)" }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              {STEPS.map((s, i) => (
                <span key={s} className="text-xs font-medium"
                  style={{ color: "#1D1836", opacity: currentStep === i ? 1 : 0.55 }}>
                  {STATUTS[s].label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Résumé */}
        {dossier.description_resumee && (
          <div className="bg-white rounded-2xl border-2 border-ink/10 p-5">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#1D1836", opacity: 0.55 }}>Résumé de votre demande</p>
            <p className="text-base leading-relaxed" style={{ color: "#1D1836" }}>{dossier.description_resumee}</p>
            {dossier.service_assigne && (
              <p className="text-sm mt-3 font-medium" style={{ color: "#1D1836", opacity: 0.55 }}>
                Service en charge : <strong style={{ opacity: 1 }}>{dossier.service_assigne}</strong>
              </p>
            )}
          </div>
        )}

        {/* Photos */}
        {(dossier.photo_avant || dossier.photo_apres) && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#1D1836", opacity: 0.55 }}>Photos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dossier.photo_avant && (
                <div>
                  <p className="text-xs font-bold mb-1.5 uppercase" style={{ color: "#1D1836", opacity: 0.55 }}>Avant</p>
                  <img loading="lazy" src={dossier.photo_avant} alt="Photo avant" className="w-full rounded-2xl object-cover max-h-52 border-2 border-ink/10" />
                </div>
              )}
              {dossier.photo_apres && (
                <div>
                  <p className="text-xs font-bold mb-1.5 uppercase" style={{ color: "#FF6A00" }}>Après ✓</p>
                  <img loading="lazy" src={dossier.photo_apres} alt="Photo après" className="w-full rounded-2xl object-cover max-h-52 border-2" style={{ borderColor: "#FF6A00" }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mises à jour */}
        {updates.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "#1D1836", opacity: 0.55 }}>Mises à jour</p>
            <div className="space-y-3">
              {updates.map((u) => (
                <div key={u.id} className="bg-white rounded-2xl border-2 border-ink/10 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: "#1D1836", opacity: 0.55 }}>
                    <Clock className="w-3 h-3" />
                    {new Date(u.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <p className="text-base leading-relaxed" style={{ color: "#1D1836" }}>{u.contenu}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aucune mise à jour */}
        {updates.length === 0 && !isResolu && dossier.statut !== "rejete" && (
          <div className="bg-white rounded-2xl border-2 border-ink/10 p-5 text-center">
            <p className="text-base font-medium" style={{ color: "#1D1836", opacity: 0.55 }}>Votre demande a bien été reçue.</p>
            <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.55 }}>La mairie la traitera selon ses priorités. Aucun délai garanti.</p>
          </div>
        )}

        {/* Rejeté */}
        {dossier.statut === "rejete" && (
          <div className="bg-white rounded-2xl border-2 border-ink/10 p-5 text-center">
            <p className="text-base font-bold" style={{ color: "#1D1836" }}>Demande non retenue.</p>
            <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.55 }}>Votre demande n'a pas pu être traitée par la mairie.</p>
          </div>
        )}

        {/* Satisfaction (résolu) */}
        {isResolu && (
          <div className="rounded-2xl border-2 p-6" style={{ backgroundColor: "#FFD84D22", borderColor: "#FFD84D" }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5" style={{ color: "#FF6A00" }} />
              <p className="text-base font-black" style={{ color: "#1D1836" }}>Votre demande a été résolue.</p>
            </div>
            {satisfactionSent ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">🙏</div>
                <p className="text-sm font-bold" style={{ color: "#1D1836" }}>Merci pour votre retour !</p>
              </div>
            ) : (
              <form onSubmit={handleSatisfaction} className="space-y-4">
                <div className="bg-white rounded-2xl p-4 border-2 border-ink/10">
                  <p className="text-sm font-black mb-3" style={{ color: "#1D1836" }}>Êtes-vous satisfait du traitement ?</p>
                  <div className="flex gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setNote(n)}
                        className="w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl transition-all"
                        style={{
                          backgroundColor: note >= n ? "#FFD84D" : "white",
                          borderColor: note >= n ? "#FF6A00" : "rgba(29,24,54,0.15)"
                        }}>
                        ⭐
                      </button>
                    ))}
                  </div>
                  {note > 0 && (
                    <p className="text-xs font-bold" style={{ color: "#FF6A00" }}>
                      {["", "Pas satisfait", "Peu satisfait", "Correct", "Bien", "Très satisfait"][note]}
                    </p>
                  )}
                </div>
                <textarea
                  value={commentaire}
                  onChange={e => setCommentaire(e.target.value)}
                  rows={3}
                  placeholder="Un commentaire sur la résolution ? (facultatif)"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none font-medium border-2"
                  style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "white" }}
                />
                {satError && (
                  <p className="text-sm font-bold" style={{ color: "#FF6A00" }}>{satError}</p>
                )}
                <button type="submit" disabled={!note || satLoading}
                  className="w-full text-white font-black py-4 rounded-xl text-sm shadow-lg disabled:opacity-40"
                  style={{ backgroundColor: "#FF6A00" }}>
                  {satLoading ? "Envoi…" : "Envoyer mon avis"}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="text-center pt-4">
          <Link to="/agir" className="text-sm font-bold underline underline-offset-4" style={{ color: "#FF6A00" }}>
            Faire une autre contribution →
          </Link>
        </div>
      </div>
    </div>
  );
}