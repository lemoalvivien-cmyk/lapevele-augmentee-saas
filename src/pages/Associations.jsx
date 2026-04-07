import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin } from "lucide-react";
import ModalAide from "@/components/ModalAide";
import CommuneSelector from "@/components/CommuneSelector";
import SectionHeader from "@/components/SectionHeader";

export default function Associations() {
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appels, setAppels] = useState([]);
  const [victoires, setVictoires] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [aiderSent, setAiderSent] = useState({});
  const [aiderModal, setAiderModal] = useState(null);

  useEffect(() => { if (selectedCommune) loadData(); }, [selectedCommune]);

  const loadData = async () => {
    setLoading(true);
    try {
      const slug = selectedCommune.slug;
      const [postsRes, eventsRes] = await Promise.all([
        base44.entities.VillagePost.filter({ commune: slug, est_public: true }, "-published_at", 60).catch(() => []),
        base44.entities.EvenementLocal.filter({ commune: slug, est_public: true }, "date_debut", 20).catch(() => []),
      ]);

      setAppels(postsRes.filter(p => p.type_post === "appel_aide").slice(0, 8));
      setVictoires(postsRes.filter(p => ["victoire", "merci_local"].includes(p.type_post)).slice(0, 4));
      setEvenements(eventsRes.filter(e => new Date(e.date_debut) > new Date()).slice(0, 6));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      <CommuneSelector selectedCommune={selectedCommune} onSelect={setSelectedCommune} />

      {/* ─── SECTION 1 : HERO ─── */}
      <section className="relative overflow-hidden border-b-2 border-ink/8" style={{ backgroundColor: "#1D1836" }}>
        <img
          src="https://media.base44.com/images/public/69c6b3f69a0c0e88e2529d4a/276774328_generated_image.png"
          alt="Bénévoles en action dans la Pévèle"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative px-4 pt-16 pb-14 text-center max-w-2xl mx-auto">
          <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "#FFD84D" }}>
            Territoire de la Pévèle Carembault
          </p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4 text-white">
            La vie associative<br className="hidden sm:block" /> près de chez vous
          </h1>
          <p className="text-base font-medium mb-8 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.75)" }}>
            Des bénévoles cherchés. Des événements utiles. Des associations qui font vraiment bouger les choses.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/aider"
              className="inline-block text-ink font-black py-3 px-6 rounded-full shadow-md transition-all hover:scale-105"
              style={{ backgroundColor: "#FFD84D" }}>
              Je veux aider 🤝
            </Link>
            <Link to="/agenda"
              className="inline-block font-bold py-3 px-6 rounded-full border-2 transition-all hover:bg-white/10"
              style={{ borderColor: "rgba(255,255,255,0.4)", color: "white" }}>
              Voir les événements
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-14">

          {/* ─── SECTION 2 : VICTOIRES ─── */}
          <section>
            <SectionHeader emoji="🏆" title="Ce qu'elles ont réussi" subtitle="Des victoires récentes portées par des associations locales" />
            {victoires.length === 0 ? (
              <EmptyState msg="Aucune activité associative récente." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {victoires.map(post => (
                  <AssocCard key={post.id} post={post}>
                    <Link to="/place-du-village"
                      className="inline-block text-xs font-bold px-3 py-2 rounded-lg border-2 transition-all hover:shadow-sm"
                      style={{ borderColor: "#FFD84D", color: "#1D1836", backgroundColor: "#FFD84D" }}>
                      Voir les détails
                    </Link>
                  </AssocCard>
                ))}
              </div>
            )}
          </section>

          {/* ─── SECTION 3 : BESOINS ET APPELS À L'AIDE (tous, avec tag visuel) ─── */}
          <section>
            <SectionHeader emoji="🙋" title="Besoins et appels à l'aide" subtitle="Tout ce qui cherche un coup de main dans cette commune" />
            {appels.length === 0 ? (
              <EmptyState msg="Aucun appel à l'aide en ce moment. Revenez bientôt !" />
            ) : (
              <div className="space-y-4">
                {appels.map(post => (
                  <BesoinCard key={post.id} post={post}
                    aiderSent={!!aiderSent[post.id]}
                    onAider={() => setAiderModal(post)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ─── SECTION 4 : ÉVÉNEMENTS ASSOCIATIFS ─── */}
          <section>
            <SectionHeader emoji="📅" title="Événements à venir" subtitle="Participez, rejoignez, rencontrez" />
            {evenements.length === 0 ? (
              <EmptyState msg="Aucun événement prévu. Proposez-en un !" cta={{ label: "Proposer un événement", to: "/proposer" }} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evenements.map(ev => (
                  <div key={ev.id} className="bg-white rounded-2xl border-2 border-ink/10 p-5 hover:shadow-md transition-shadow">
                    {ev.image && <img loading="lazy" src={ev.image} alt="" className="w-full h-32 object-cover rounded-xl mb-3" />}
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#FF6A00" }}>
                      {ev.categorie || "Événement"}
                    </p>
                    <h3 className="font-black text-base mb-1 leading-snug" style={{ color: "#1D1836" }}>{ev.titre}</h3>
                    <div className="flex items-center gap-2 text-xs mb-3" style={{ color: "#1D1836", opacity: 0.55 }}>
                      <span>📅 {new Date(ev.date_debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>
                      {ev.lieu && <><span>·</span><MapPin className="w-3 h-3" /><span>{ev.lieu}</span></>}
                    </div>
                    {ev.description && (
                      <p className="text-sm leading-relaxed mb-3" style={{ color: "#1D1836", opacity: 0.65 }}>
                        {ev.description.slice(0, 100)}{ev.description.length > 100 ? "…" : ""}
                      </p>
                    )}
                    <Link to="/agenda"
                      className="inline-block text-xs font-bold px-3 py-2 rounded-lg text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: "#63C7FF", color: "#1D1836" }}>
                      Je participe
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── SECTION 5 : POURQUOI CETTE PAGE ─── */}
          <section className="bg-white rounded-2xl border-2 border-ink/10 p-8">
            <h2 className="text-xl font-black mb-5" style={{ color: "#1D1836" }}>Pourquoi s'engager localement</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { emoji: "⚡", titre: "Impact direct", desc: "Vos actions sont visibles dans votre quartier, dès demain." },
                { emoji: "🤝", titre: "Liens humains", desc: "Des rencontres concrètes avec des gens qui partagent vos valeurs." },
                { emoji: "🌱", titre: "Territoire vivant", desc: "Chaque contribution maintient la vie associative locale en bonne santé." },
              ].map(item => (
                <div key={item.emoji}>
                  <div className="text-3xl mb-2">{item.emoji}</div>
                  <h3 className="font-black text-sm mb-1" style={{ color: "#1D1836" }}>{item.titre}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#1D1836", opacity: 0.65 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ─── SECTION 6 : CTA ACTION ─── */}
          <section className="text-center pt-4 pb-8">
            <h2 className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>Prêt à vous engager ?</h2>
            <p className="text-sm mb-6 font-medium" style={{ color: "#1D1836", opacity: 0.65 }}>
              Gratuit · Sans compte · Direct à votre commune
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/aider"
                className="inline-block text-white font-black py-3 px-6 rounded-full shadow-md transition-all hover:scale-105"
                style={{ backgroundColor: "#FF6A00" }}>
                Proposer mon aide
              </Link>
              <Link to="/place-du-village"
                className="inline-block font-bold py-3 px-6 rounded-full border-2 bg-white transition-all hover:shadow-md"
                style={{ borderColor: "#1D1836", color: "#1D1836" }}>
                Voir la Place du Village
              </Link>
            </div>
          </section>

        </div>
      )}

      {aiderModal && (
        <ModalAide
          post={aiderModal}
          onClose={() => setAiderModal(null)}
          onSuccess={(id) => setAiderSent(prev => ({ ...prev, [id]: true }))}
        />
      )}
    </div>
  );
}

/* ─── Composants locaux ─── */

function getTypeTag(typeAide) {
  if (!typeAide) return { label: "Aide", bg: "#F3F3F3", color: "#1D1836" };
  const val = typeAide.toLowerCase();
  if (/mat.riel|.quipement|outil|fourniture/.test(val))
    return { label: "Matériel", bg: "#FFF0E0", color: "#FF6A00" };
  if (/b.n.vole|aide|personne|service/.test(val))
    return { label: "Bénévoles", bg: "#E8F5FF", color: "#1D1836" };
  return { label: "Aide", bg: "#F3F3F3", color: "#1D1836" };
}

function EmptyState({ msg, cta }) {
  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-ink/10 p-8 text-center">
      <p className="text-sm text-muted-foreground mb-3">{msg}</p>
      {cta && (
        <Link to={cta.to}
          className="inline-block text-xs font-bold px-4 py-2 rounded-full border-2 transition-all"
          style={{ borderColor: "#FF6A00", color: "#FF6A00" }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function AssocCard({ post, children }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;
  return (
    <div className="bg-white rounded-2xl border-2 border-ink/10 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
      style={{ borderLeftWidth: "4px", borderLeftColor: "#FFD84D" }}>
      {post.image && <img loading="lazy" src={post.image} alt="" className="w-full object-cover" style={{ maxHeight: "120px" }} />}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
            ✓ Réussite
          </span>
          {date && <span className="text-xs" style={{ color: "#1D1836", opacity: 0.4 }}>{date}</span>}
        </div>
        <h3 className="font-black text-base mb-2 leading-snug flex-1" style={{ color: "#1D1836" }}>{post.titre}</h3>
        {post.resume && <p className="text-sm leading-relaxed mb-4" style={{ color: "#1D1836", opacity: 0.65 }}>{post.resume.length > 110 ? post.resume.slice(0, 110) + "…" : post.resume}</p>}
        {children}
      </div>
    </div>
  );
}

function BesoinCard({ post, onAider, aiderSent }) {
  const date = post.date_souhaitee
    ? new Date(post.date_souhaitee).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;
  const tag = getTypeTag(post.type_aide);

  return (
    <div className="bg-white rounded-2xl border-2 overflow-hidden hover:shadow-md transition-shadow"
      style={{ borderColor: "rgba(29,24,54,0.08)", borderLeftWidth: "4px", borderLeftColor: "#63C7FF" }}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ backgroundColor: tag.bg, color: tag.color }}>
              {tag.label}
            </span>
            {post.type_aide && (
              <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.55 }}>{post.type_aide}</span>
            )}
          </div>
          {date && (
            <span className="text-xs font-bold whitespace-nowrap px-2 py-1 rounded-full shrink-0"
              style={{ backgroundColor: "#FFF0E0", color: "#FF6A00" }}>
              📅 {date}
            </span>
          )}
        </div>
        <h3 className="font-black text-base leading-snug mb-2" style={{ color: "#1D1836" }}>{post.titre}</h3>
        {post.resume && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#1D1836", opacity: 0.65 }}>{post.resume.length > 120 ? post.resume.slice(0, 120) + "…" : post.resume}</p>
        )}
        <div className="flex gap-2 flex-wrap">
          <button onClick={onAider} disabled={aiderSent}
            className="text-xs font-bold px-4 py-2 rounded-full border-2 transition-all disabled:opacity-60"
            style={{
              backgroundColor: aiderSent ? "#B8F5C4" : "#63C7FF",
              borderColor: aiderSent ? "#4CAF50" : "#63C7FF",
              color: "#1D1836"
            }}>
            🤝 {aiderSent ? "Réponse envoyée ✓" : "Je peux aider"}
          </button>
          <Link to="/place-du-village"
            className="text-xs font-bold px-4 py-2 rounded-full border-2 bg-white transition-all hover:shadow-sm"
            style={{ borderColor: "rgba(29,24,54,0.12)", color: "#1D1836" }}>
            En savoir plus
          </Link>
        </div>
      </div>
    </div>
  );
}