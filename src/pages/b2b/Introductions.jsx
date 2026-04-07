import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle, X, Calendar, Trophy, AlertCircle } from "lucide-react";

const STATUT_CONFIG = {
  DRAFT: { label: "Brouillon", color: "#e0e0e0", textColor: "#1D1836", icon: "📝" },
  PENDING: { label: "En attente", color: "#FFD84D", textColor: "#1D1836", icon: "⏳" },
  ACCEPTED: { label: "Acceptée", color: "#63C7FF", textColor: "#1D1836", icon: "✅" },
  MEETING_SCHEDULED: { label: "RDV planifié", color: "#FF6FB5", textColor: "#1D1836", icon: "📅" },
  WON: { label: "Deal conclu 🎉", color: "#B8F5C4", textColor: "#1D1836", icon: "🏆" },
  LOST: { label: "Sans suite", color: "#f0f0f0", textColor: "#999", icon: "💤" },
  REJECTED: { label: "Refusée", color: "#fde8e8", textColor: "#c0392b", icon: "❌" },
};

export default function B2BIntroductions() {
  const [introductions, setIntroductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(null);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [filtre, setFiltre] = useState("tous");

  useEffect(() => { init(); }, []);

  const init = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) { setLoading(false); return; }
    const user = await base44.auth.me();
    setUserId(user.id);
    await loadIntroductions(user.id);
  };

  const loadIntroductions = async (uid) => {
    setLoading(true);
    try {
      const [asD, asO] = await Promise.all([
        base44.entities.Introduction.filter({ demandeur_user_id: uid }, "-created_at", 50).catch(() => []),
        base44.entities.Introduction.filter({ offreur_user_id: uid }, "-created_at", 50).catch(() => []),
      ]);
      const merged = [...asD, ...asO].reduce((acc, intro) => {
        if (!acc.find(i => i.id === intro.id)) acc.push(intro);
        return acc;
      }, []);
      merged.sort((a, b) => new Date(b.last_action_at ?? b.created_at) - new Date(a.last_action_at ?? a.created_at));
      setIntroductions(merged);
    } finally {
      setLoading(false);
    }
  };

  const advance = async (intro_id, new_statut, extras = {}) => {
    setAdvancing(intro_id + new_statut);
    setError(null);
    try {
      const res = await base44.functions.invoke("advanceIntroState", {
        introduction_id: intro_id, new_statut, ...extras,
      });
      if (!res.data?.success) throw new Error(res.data?.error ?? "Erreur");
      await loadIntroductions(userId);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdvancing(null);
    }
  };

  const filtered = filtre === "tous" ? introductions : introductions.filter(i => i.statut === filtre);

  if (!userId && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="text-center p-8 bg-white rounded-3xl border-2 max-w-md" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Connexion requise</h2>
          <p className="text-sm mb-4" style={{ color: "#1D1836", opacity: 0.6 }}>Connectez-vous pour accéder à vos introductions B2B.</p>
          <Link to="/se-connecter" className="inline-block text-white font-black py-3 px-6 rounded-2xl" style={{ backgroundColor: "#FF6A00" }}>Se connecter</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-4xl mx-auto px-4 py-12">

        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2" style={{ color: "#1D1836" }}>🤝 Mes introductions B2B</h1>
          <p className="text-sm font-medium" style={{ color: "#1D1836", opacity: 0.6 }}>
            {introductions.length} introduction{introductions.length !== 1 ? "s" : ""} · Modèle WIINUP
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Stats rapides */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-8">
          {Object.entries(STATUT_CONFIG).map(([key, cfg]) => {
            const count = introductions.filter(i => i.statut === key).length;
            return (
              <button key={key} onClick={() => setFiltre(filtre === key ? "tous" : key)}
                className="p-3 rounded-2xl border-2 text-center transition-all hover:shadow-md"
                style={{ backgroundColor: filtre === key ? cfg.color : "white", borderColor: filtre === key ? "#1D1836" : "rgba(29,24,54,0.08)" }}>
                <div className="text-lg">{cfg.icon}</div>
                <div className="text-lg font-black" style={{ color: cfg.textColor }}>{count}</div>
                <div className="text-xs font-medium leading-tight" style={{ color: cfg.textColor, opacity: 0.8 }}>{cfg.label}</div>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
            <div className="text-4xl mb-3">🤝</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Aucune introduction</h2>
            <p className="text-sm mb-4" style={{ color: "#1D1836", opacity: 0.6 }}>
              {filtre === "tous" ? "Rendez-vous dans les Besoins pour démarrer une mise en relation." : `Aucune introduction en statut "${STATUT_CONFIG[filtre]?.label}".`}
            </p>
            <Link to="/b2b/besoins" className="inline-block text-white font-black py-3 px-6 rounded-2xl text-sm" style={{ backgroundColor: "#FF6A00" }}>
              Voir les besoins
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(intro => {
              const cfg = STATUT_CONFIG[intro.statut] ?? STATUT_CONFIG.PENDING;
              const isAdvancing = advancing?.startsWith(intro.id);
              const isOffreur = intro.offreur_user_id === userId;

              return (
                <div key={intro.id} className="bg-white rounded-2xl border-2 p-5" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cfg.icon}</span>
                      <span className="text-xs font-black px-3 py-1 rounded-full" style={{ backgroundColor: cfg.color, color: cfg.textColor }}>
                        {cfg.label}
                      </span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>
                      {new Date(intro.last_action_at ?? intro.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>

                  {intro.message_init && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-3">
                      <p className="text-xs font-bold mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>Message d'introduction</p>
                      <p className="text-sm" style={{ color: "#1D1836" }}>{intro.message_init}</p>
                    </div>
                  )}

                  {intro.date_meeting && (
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <Calendar className="w-4 h-4" style={{ color: "#FF6A00" }} />
                      <span className="font-medium" style={{ color: "#1D1836" }}>
                        RDV : {new Date(intro.date_meeting).toLocaleString("fr-FR")}
                        {intro.lieu_meeting && ` · ${intro.lieu_meeting}`}
                      </span>
                    </div>
                  )}

                  {/* Actions selon statut */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {intro.statut === "PENDING" && isOffreur && (
                      <>
                        <button onClick={() => advance(intro.id, "ACCEPTED")} disabled={isAdvancing}
                          className="flex items-center gap-1 text-xs font-black px-4 py-2 rounded-xl text-white transition-all hover:scale-105 disabled:opacity-60"
                          style={{ backgroundColor: "#22c55e" }}>
                          {isAdvancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Accepter
                        </button>
                        <button onClick={() => advance(intro.id, "REJECTED")} disabled={isAdvancing}
                          className="flex items-center gap-1 text-xs font-black px-4 py-2 rounded-xl border-2 transition-all disabled:opacity-60"
                          style={{ borderColor: "#ef4444", color: "#ef4444" }}>
                          <X className="w-3 h-3" /> Refuser
                        </button>
                      </>
                    )}
                    {intro.statut === "ACCEPTED" && (
                      <button
                        onClick={() => {
                          const date = prompt("Date du rendez-vous (YYYY-MM-DDTHH:MM) :");
                          const lieu = prompt("Lieu ou lien visio :");
                          if (date) advance(intro.id, "MEETING_SCHEDULED", { date_meeting: date, lieu_meeting: lieu });
                        }}
                        disabled={isAdvancing}
                        className="flex items-center gap-1 text-xs font-black px-4 py-2 rounded-xl text-white transition-all hover:scale-105 disabled:opacity-60"
                        style={{ backgroundColor: "#FF6A00" }}>
                        <Calendar className="w-3 h-3" /> Planifier le RDV
                      </button>
                    )}
                    {intro.statut === "MEETING_SCHEDULED" && (
                      <>
                        <button onClick={() => advance(intro.id, "WON", { outcome_note: "Deal conclu !" })} disabled={isAdvancing}
                          className="flex items-center gap-1 text-xs font-black px-4 py-2 rounded-xl text-white transition-all hover:scale-105 disabled:opacity-60"
                          style={{ backgroundColor: "#22c55e" }}>
                          <Trophy className="w-3 h-3" /> Deal conclu !
                        </button>
                        <button onClick={() => advance(intro.id, "LOST")} disabled={isAdvancing}
                          className="flex items-center gap-1 text-xs font-black px-4 py-2 rounded-xl border-2 transition-all disabled:opacity-60"
                          style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
                          Sans suite
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
