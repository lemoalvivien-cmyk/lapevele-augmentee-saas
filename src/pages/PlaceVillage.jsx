import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, AlertTriangle } from "lucide-react";
import ModalAide from "@/components/ModalAide";
import CommuneSelector from "@/components/CommuneSelector";

// GARDÉ : config visuelle par type
const TYPE_CONFIG = {
  victoire: { emoji: "🏆", label: "Victoire", color: "#FFD84D" },
  merci_local: { emoji: "💛", label: "Merci local", color: "#FFD84D" },
  appel_aide: { emoji: "🙋", label: "Coup de main cherché", color: "#63C7FF" },
  message_maire: { emoji: "📣", label: "Info utile", color: "#FF6FB5" },
};

export default function PlaceVillage() {
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [communes, setCommunes] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState({});
  const [userReactions, setUserReactions] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [profile, setProfile] = useState(null);
  const [filtreLocal, setFiltreLocal] = useState(false);
  const [aiderModal, setAiderModal] = useState(null);
  const [aiderSent, setAiderSent] = useState({});
  const [aiderForm, setAiderForm] = useState({ nom: "", email: "" });

  useEffect(() => {
    const stored = sessionStorage.getItem("village_reactions");
    if (stored) { try { setUserReactions(JSON.parse(stored)); } catch {} }
  }, []);

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    setLoading(true);
    base44.functions.invoke('getPublicVillagePosts', {}).then(async res => {
      const allPosts = Array.isArray(res.data) ? res.data : [];
      const filtered = allPosts.filter(p =>
        ["victoire", "merci_local", "appel_aide", "message_maire"].includes(p.type_post)
      );
      setPosts(filtered);
      if (filtered.length > 0) {
        try {
          const countsRes = await base44.functions.invoke('getReactionCounts', { post_ids: filtered.map(p => p.id) });
          setReactions(countsRes.data || {});
        } catch {}
      }
    }).catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, []);

  const loadCommunes = async () => {
    try {
      const data = await base44.entities.Commune.filter({ statut: "active" }, "nom");
      setCommunes(data);
    } catch {}
  };

  useEffect(() => { loadCommunes(); }, []);

  // GARDÉ : anti-spam session
  const canReact = (postId, type) => {
    const key = `react_${postId}_${type}`;
    const lastTime = parseInt(sessionStorage.getItem(key) || "0");
    return Date.now() - lastTime > 10000;
  };

  const loadProfile = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return;
    const user = await base44.auth.me();
    const profiles = await base44.entities.UserProfile.filter({ email: user.email });
    if (profiles[0]) setProfile(profiles[0]);
  };

  // GARDÉ : logique réaction + anti-spam
  const handleReaction = async (postId, type) => {
    const key = `${postId}:${type}`;
    if (userReactions[key]) return;
    if (!canReact(postId, type)) return;
    const rlRes = await base44.functions.invoke('rateLimitCheck', { action: 'reaction_create', identifier: postId });
    if (!rlRes.data?.allowed) return;
    const next = { ...userReactions, [key]: true };
    setUserReactions(next);
    sessionStorage.setItem("village_reactions", JSON.stringify(next));
    sessionStorage.setItem(`react_${postId}_${type}`, String(Date.now()));
    setReactions(prev => ({
      ...prev,
      [postId]: { ...prev[postId], [type]: ((prev[postId] || {})[type] || 0) + 1 },
    }));
    await base44.entities.VillageReaction.create({ village_post: postId, type_reaction: type });
  };

  const applyLocalFilter = (list) => {
    if (!filtreLocal || !profile?.quartier) return list;
    return list.filter(p => !p.quartier || p.quartier === profile.quartier);
  };

  // NOUVELLE HIÉRARCHIE : urgent → utile → résolu → message utile
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 86400000);

  // 1. URGENT : appels avec date_souhaitee dans 7j ou épinglés
  const appelsTous = applyLocalFilter(posts.filter(p => p.type_post === "appel_aide"));
  const appelsUrgents = appelsTous
    .filter(p => p.est_epingle || (p.date_souhaitee && new Date(p.date_souhaitee) <= in7days))
    .slice(0, 3);

  // 2. UTILE : autres appels (non urgents)
  const urgentIds = new Set(appelsUrgents.map(p => p.id));
  const appelsStandard = appelsTous.filter(p => !urgentIds.has(p.id)).slice(0, 5);

  // 3. RÉSOLU : victoires (toutes dates)
  const victoires = applyLocalFilter(posts.filter(p =>
    ["victoire", "merci_local"].includes(p.type_post)
  )).slice(0, 4);

  // 4. MESSAGE MAIRE : infos utiles uniquement (max 3)
  const infosUtiles = applyLocalFilter(posts.filter(p => p.type_post === "message_maire")).slice(0, 3);

  const hasContent = appelsUrgents.length + appelsStandard.length + victoires.length + infosUtiles.length > 0;
  const totalAiders = Object.values(reactions).reduce((acc, r) => acc + (r.je_peux_aider || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
      </div>
    );
  }



  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>Erreur de chargement</h1>
        <p className="text-base mb-6 max-w-sm" style={{ color: "#1D1836", opacity: 0.6 }}>Vérifiez votre connexion.</p>
        <button onClick={() => { setLoadError(false); setLoading(true); loadCommunes(); }}
          className="text-white font-bold py-3 px-8 rounded-2xl shadow-lg"
          style={{ backgroundColor: "#FF6A00" }}>Réessayer</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8F1" }}>

      <CommuneSelector selectedCommune={selectedCommune} onSelect={setSelectedCommune} />

      {/* Header épuré — MODIFIÉ : supprimé badges décoratifs inutiles */}
      {selectedCommune && (
        <header className="px-4 pt-10 pb-6" style={{ backgroundColor: "#FFF8F1" }}>
          <div className="max-w-2xl mx-auto text-center">
            {selectedCommune.logo && (
              <img loading="lazy" src={selectedCommune.logo} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-3 rounded-xl border-2 border-ink/10 bg-white p-1" />
            )}
            <h1 className="text-3xl font-black mb-1" style={{ color: "#1D1836" }}>
              🏘️ {selectedCommune.nom}
            </h1>
            <p className="text-sm font-bold mb-3 uppercase tracking-widest" style={{ color: "#FF6A00" }}>
              Ce qui bouge, ce qui a besoin de vous
            </p>
            {/* Seul chiffre utile : combien sont prêts à aider */}
            {totalAiders > 0 && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black border-2 bg-white"
                style={{ borderColor: "rgba(29,24,54,0.12)", color: "#1D1836" }}>
                🤝 {totalAiders} habitant{totalAiders > 1 ? "s" : ""} prêt{totalAiders > 1 ? "s" : ""} à aider
              </span>
            )}
          </div>
        </header>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-10">

          {/* Filtre quartier — GARDÉ */}
          {profile?.quartier ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setFiltreLocal(f => !f)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all"
                style={{
                  backgroundColor: filtreLocal ? "#FF6A00" : "white",
                  borderColor: "#FF6A00",
                  color: filtreLocal ? "white" : "#FF6A00"
                }}>
                <MapPin className="w-3.5 h-3.5" /> Près de chez moi ({profile.quartier})
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-ink/10 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium" style={{ color: "#1D1836" }}>
                📍 Indiquez votre quartier pour voir ce qui se passe près de chez vous.
              </p>
              <Link to="/mon-profil" className="text-xs font-black whitespace-nowrap underline" style={{ color: "#FF6A00" }}>Mon espace →</Link>
            </div>
          )}

          {/* ─── BLOC 1 : URGENT ─── */}
          {appelsUrgents.length > 0 && (
            <VillageSection
              emoji={<AlertTriangle className="w-5 h-5 text-red-600" />}
              title="Urgent — besoin maintenant"
              subtitle="Ces demandes ont une échéance proche"
              accentColor="#FF6A00">
              {appelsUrgents.map(post => (
                <PostCard key={post.id} post={post}
                  reactions={reactions[post.id]} userReactions={userReactions}
                  urgent
                  aiderSent={!!aiderSent[post.id]}
                  onAider={() => { setAiderForm({ nom: "", email: "" }); setAiderModal(post); }} />
              ))}
            </VillageSection>
          )}

          {/* ─── BLOC 2 : BESOIN D'AIDE ─── */}
          {appelsStandard.length > 0 && (
            <VillageSection
              emoji="🙋"
              title="On cherche un coup de main"
              subtitle="Des habitants et associations ont besoin de vous"
              accentColor="#63C7FF">
              {appelsStandard.map(post => (
                <PostCard key={post.id} post={post}
                  reactions={reactions[post.id]} userReactions={userReactions}
                  aiderSent={!!aiderSent[post.id]}
                  onReact={handleReaction}
                  onAider={() => { setAiderForm({ nom: "", email: "" }); setAiderModal(post); }} />
              ))}
            </VillageSection>
          )}

          {/* ─── BLOC 3 : VIENT D'ABOUTIR ─── */}
          {victoires.length > 0 && (
            <VillageSection
              emoji="🏆"
              title="Vient d'aboutir"
              subtitle="Ce qu'on a réussi ensemble ce mois-ci"
              accentColor="#FFD84D">
              {victoires.map(post => (
                <PostCard key={post.id} post={post}
                  reactions={reactions[post.id]} userReactions={userReactions}
                  onReact={handleReaction}
                  showSoutenir />
              ))}
            </VillageSection>
          )}

          {/* ─── BLOC 4 : INFOS UTILES (message_maire uniquement) ─── */}
          {infosUtiles.length > 0 && (
            <VillageSection
              emoji="📣"
              title="Info utile de la mairie"
              subtitle="Annonces avec action possible"
              accentColor="#FF6FB5">
              {infosUtiles.map(post => (
                <PostCard key={post.id} post={post}
                  reactions={reactions[post.id]} userReactions={userReactions}
                  onReact={handleReaction}
                  showParticipe />
              ))}
            </VillageSection>
          )}

          {/* État vide */}
          {!hasContent && (
            <div className="text-center py-16">
              <div className="text-6xl mb-5">🌱</div>
              <p className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>La place est prête</p>
              <p className="text-base mb-8 max-w-sm mx-auto" style={{ color: "#1D1836", opacity: 0.5 }}>
                Soyez parmi les premiers à partager un besoin ou une victoire dans votre commune.
              </p>
              <Link to="/agir" className="text-white font-black py-4 px-10 rounded-2xl shadow-lg inline-block"
                style={{ backgroundColor: "#FF6A00" }}>Contribuer 🙋</Link>
            </div>
          )}

          {/* Footer sobre */}
          <div className="text-center text-xs pt-4 pb-2 border-t-2 border-ink/5">
            <p className="mb-1" style={{ color: "#1D1836", opacity: 0.35 }}>Sans algorithme. Au service de votre commune.</p>
            <Link to="/agir" className="font-bold underline" style={{ color: "#FF6A00" }}>
              Signaler, proposer, aider →
            </Link>
          </div>
        </div>
      )}

      {aiderModal && (
        <ModalAide
          post={aiderModal}
          onClose={() => setAiderModal(null)}
          onSuccess={(id) => {
            setAiderSent(prev => ({ ...prev, [id]: true }));
            setReactions(prev => ({ ...prev, [id]: { ...prev[id], je_peux_aider: ((prev[id] || {}).je_peux_aider || 0) + 1 } }));
          }}
        />
      )}
    </div>
  );
}

/* ─── PostCard refondée ─── */
function PostCard({ post, reactions = {}, userReactions, onReact, urgent, showSoutenir, showParticipe, onAider, aiderSent }) {
  const cfg = TYPE_CONFIG[post.type_post] || TYPE_CONFIG.message_maire;
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  const soutienCount = (reactions || {}).merci || 0;
  const soutienDone = !!(userReactions || {})[`${post.id}:merci`];
  const presentCount = (reactions || {}).present || 0;
  const presentDone = !!(userReactions || {})[`${post.id}:present`];

  const isVictoire = ["victoire", "merci_local"].includes(post.type_post);
  const accentLeft = urgent ? "#FF6A00" : isVictoire ? "#FFD84D" : post.type_post === "appel_aide" ? "#63C7FF" : "#FF6FB5";
  const bgCard = urgent ? "#FFF5F0" : "white";

  return (
    <div className="rounded-2xl border-2 overflow-hidden transition-all hover:shadow-md"
      style={{ borderColor: urgent ? "#FF6A00" : "rgba(29,24,54,0.08)", backgroundColor: bgCard, borderLeftWidth: "4px", borderLeftColor: accentLeft }}>

      {post.image && (
        <img loading="lazy" src={post.image} alt="" className="w-full object-cover" style={{ maxHeight: "140px", objectPosition: "center" }} />
      )}

      <div className="p-5">
        {/* Bandeau résolu pour victoires */}
        {isVictoire && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
              ✓ Résolu
            </span>
            {date && <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>{date}</span>}
            {post.quartier && <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>· {post.quartier}</span>}
          </div>
        )}

        {/* Badge + date pour les non-victoires */}
        {!isVictoire && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-black px-2.5 py-1 rounded-full border border-ink/10"
            style={{ backgroundColor: urgent ? "#FF6A00" : cfg.color, color: urgent ? "white" : "#1D1836" }}>
            {urgent ? "⚡ Urgent" : `${cfg.emoji} ${cfg.label}`}
          </span>
          {date && <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>{date}</span>}
          {post.quartier && <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>· {post.quartier}</span>}
        </div>
        )}

        <h3 className="font-black text-base mb-2 leading-snug" style={{ color: "#1D1836" }}>{post.titre}</h3>
        {post.type_aide && !isVictoire && (
          <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "#63C7FF" }}>Besoin : {post.type_aide}</p>
        )}
        {post.resume && <p className="text-sm leading-relaxed mb-4" style={{ color: "#1D1836", opacity: 0.65 }}>{post.resume.length > 130 ? post.resume.slice(0, 130) + "…" : post.resume}</p>}

        {/* CTA selon type — STRICT : uniquement CTA autorisés */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* appel_aide → Je peux aider */}
          {post.type_post === "appel_aide" && onAider && (
            <button onClick={onAider} disabled={aiderSent}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all disabled:opacity-60"
              style={{
                backgroundColor: aiderSent ? "#B8F5C4" : "#63C7FF",
                borderColor: aiderSent ? "#4CAF50" : "#63C7FF",
                color: "#1D1836"
              }}>
              🤝 {aiderSent ? "Réponse envoyée ✓" : "Je peux aider"}
            </button>
          )}

          {/* appel_aide → Je suis concerné */}
          {post.type_post === "appel_aide" && onReact && (
            <button onClick={() => onReact(post.id, "present")} disabled={presentDone}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all disabled:opacity-60"
              style={{
                backgroundColor: presentDone ? "#FFD84D" : "white",
                borderColor: presentDone ? "#FF6A00" : "rgba(29,24,54,0.12)",
                color: "#1D1836"
              }}>
              ✋ Je suis concerné{presentCount > 0 ? ` · ${presentCount}` : ""}
            </button>
          )}

          {/* victoire → Je soutiens */}
          {showSoutenir && onReact && (
            <button onClick={() => onReact(post.id, "merci")} disabled={soutienDone}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all disabled:opacity-60"
              style={{
                backgroundColor: soutienDone ? "#FFD84D" : "white",
                borderColor: soutienDone ? "#FF6A00" : "rgba(29,24,54,0.12)",
                color: "#1D1836"
              }}>
              🙌 Je soutiens{soutienCount > 0 ? ` · ${soutienCount}` : ""}
            </button>
          )}

          {/* message_maire → Je participe */}
          {showParticipe && onReact && (
            <button onClick={() => onReact(post.id, "present")} disabled={presentDone}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all disabled:opacity-60"
              style={{
                backgroundColor: presentDone ? "#FF6FB5" : "white",
                borderColor: presentDone ? "#FF6FB5" : "rgba(29,24,54,0.12)",
                color: "#1D1836"
              }}>
              ✅ Je participe{presentCount > 0 ? ` · ${presentCount}` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── VillageSection ─── */
function VillageSection({ emoji, title, subtitle, accentColor, children }) {
  return (
    <section>
      <div className="flex items-start gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-sm border-2"
          style={{ backgroundColor: accentColor, borderColor: "rgba(29,24,54,0.08)" }}>
          {emoji}
        </div>
        <div>
          <h2 className="text-xl font-black leading-snug" style={{ color: "#1D1836" }}>{title}</h2>
          <p className="text-sm font-medium mt-0.5" style={{ color: "#1D1836", opacity: 0.5 }}>{subtitle}</p>
        </div>
      </div>
      <div className="h-0.5 rounded-full mb-5" style={{ backgroundColor: accentColor, opacity: 0.5 }} />
      <div className="space-y-4">{children}</div>
    </section>
  );
}