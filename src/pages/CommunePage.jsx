import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, Phone, Mail, AlertTriangle } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

export default function CommunePage() {
  const { slug } = useParams();
  const [commune, setCommune] = useState(null);
  const [posts, setPosts] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { if (slug) load(); }, [slug]);

  const load = async () => {
    setLoading(true);
    try {
      const communes = await base44.entities.Commune.filter({ slug });
      if (!communes.length) { setNotFound(true); setLoading(false); return; }
      const com = communes[0];
      setCommune(com);

      const [postsRes, eventsRes] = await Promise.all([
        base44.entities.VillagePost.filter({ commune: slug, est_public: true }, "-published_at", 60).catch(() => []),
        base44.entities.EvenementLocal.filter({ commune: slug, est_public: true }, "date_debut", 10).catch(() => []),
      ]);

      setPosts(postsRes);
      setEvenements(eventsRes.filter(e => new Date(e.date_debut) > new Date()).slice(0, 5));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="text-6xl mb-4">🏘️</div>
        <h1 className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>Commune introuvable</h1>
        <p className="text-base mb-6 max-w-sm" style={{ color: "#1D1836", opacity: 0.6 }}>
          Cette commune n'est pas encore sur la plateforme ou l'adresse est incorrecte.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/place-du-village"
            className="text-white font-bold py-3 px-6 rounded-full shadow-md"
            style={{ backgroundColor: "#FF6A00" }}>
            Voir la Place du Village
          </Link>
          <Link to="/agir"
            className="font-bold py-3 px-6 rounded-full border-2 bg-white"
            style={{ borderColor: "#1D1836", color: "#1D1836" }}>
            Agir maintenant
          </Link>
        </div>
      </div>
    );
  }

  // Dériver les sections depuis posts
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7days = new Date(now.getTime() + 7 * 86400000);

  const actionsEnCours = posts.filter(p =>
    p.type_post === "appel_aide"
  ).slice(0, 6);

  const urgents = actionsEnCours.filter(p =>
    p.est_epingle || (p.date_souhaitee && new Date(p.date_souhaitee) <= in7days)
  );

  const victoires = posts.filter(p =>
    ["victoire", "merci_local"].includes(p.type_post) &&
    p.published_at && new Date(p.published_at) >= startOfMonth
  ).slice(0, 4);

  const acteurs = posts.filter(p =>
    ["victoire", "merci_local"].includes(p.type_post)
  ).slice(0, 4);

  const infos = posts.filter(p => p.type_post === "message_maire").slice(0, 3);

  const hasContent = actionsEnCours.length + victoires.length + evenements.length + acteurs.length + infos.length > 0;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* ─── SECTION 1 : HERO COMMUNE ─── */}
      <section className="border-b-2 border-ink/8 relative overflow-hidden" style={{
        backgroundColor: commune.couleur_primaire || "#1D1836",
        backgroundImage: commune.photo_hero ? `url(${commune.photo_hero})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        {commune.photo_hero && <div className="absolute inset-0 bg-black/40" />}
        <div className="relative">
        <div className="max-w-2xl mx-auto px-6 pt-14 pb-12 text-center relative">
          {commune.logo ? (
            <img loading="lazy" src={commune.logo} alt={commune.nom}
              className="w-16 h-16 object-contain mx-auto mb-5 rounded-2xl bg-white p-2 shadow-md" />
          ) : (
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shadow-md">
              🏘️
            </div>
          )}
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            Pévèle Carembault
          </p>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight text-white">
            {commune.nom}
          </h1>
          {commune.message_bienvenue_public ? (
            <p className="text-base font-medium mb-6 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.75)" }}>
              {commune.message_bienvenue_public}
            </p>
          ) : (
            <p className="text-base font-medium mb-6 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.65)" }}>
              Ce qui bouge, ce qui a besoin de vous, ce qui vient d’aboutir.
            </p>
          )}
          {commune.message_du_maire && (
            <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-left max-w-lg mx-auto mb-6">
              <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#FFD84D" }}>📣 Message du maire</p>
              <p className="text-sm leading-relaxed text-white/85">{commune.message_du_maire}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/agir"
              className="inline-block font-black py-3 px-6 rounded-full shadow-md transition-all hover:scale-105"
              style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
              Agir maintenant
            </Link>
            <Link to="/place-du-village"
              className="inline-block font-bold py-3 px-6 rounded-full border-2 transition-all hover:bg-white/10"
              style={{ borderColor: "rgba(255,255,255,0.4)", color: "white" }}>
              Voir tout ce qui bouge
            </Link>
          </div>
        </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-12">

        {/* ─── SECTION 2 : ACTIONS EN COURS ─── */}
        <section>
          <SectionHeader emoji={urgents.length > 0 ? <AlertTriangle className="w-5 h-5 text-red-600" /> : "🙋"}
            title="Actions en cours" subtitle="Ce qui a besoin de vous maintenant" />
          {actionsEnCours.length === 0 ? (
            <EmptyState msg="Aucun appel à l'aide en ce moment dans cette commune." />
          ) : (
            <div className="space-y-3">
              {actionsEnCours.map(post => (
                <ActionCard key={post.id} post={post} urgent={urgents.some(u => u.id === post.id)} />
              ))}
            </div>
          )}
        </section>

        {/* ─── SECTION 3 : CE QUI VIENT D'ABOUTIR ─── */}
        <section>
          <SectionHeader emoji="🏆" title="Ce qui vient d'aboutir" subtitle="Les réussites de ce mois-ci" />
          {victoires.length === 0 ? (
            <EmptyState msg="Aucune victoire ce mois-ci — mais les prochaines se préparent." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {victoires.map(post => <SimpleCard key={post.id} post={post} badge="🏆 Victoire" badgeBg="#FFD84D" />)}
            </div>
          )}
        </section>

        {/* ─── SECTION 4 : ÉVÉNEMENTS ─── */}
        <section>
          <SectionHeader emoji="📅" title="Événements à venir" subtitle="Participez, rencontrez, vivez le territoire" />
          {evenements.length === 0 ? (
            <EmptyState msg="Aucun événement prévu." cta={{ label: "Proposer un événement", to: "/proposer" }} />
          ) : (
            <div className="space-y-3">
              {evenements.map(ev => (
                <div key={ev.id} className="bg-white rounded-2xl border-2 border-ink/10 p-5 hover:shadow-md transition-shadow flex items-start gap-4">
                  <div className="bg-orange-100 rounded-xl p-3 text-center min-w-[3.5rem] shrink-0">
                    <p className="text-lg font-black leading-none" style={{ color: "#FF6A00" }}>
                      {new Date(ev.date_debut).getDate()}
                    </p>
                    <p className="text-xs font-bold uppercase" style={{ color: "#FF6A00" }}>
                      {new Date(ev.date_debut).toLocaleDateString("fr-FR", { month: "short" })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm leading-snug mb-1" style={{ color: "#1D1836" }}>{ev.titre}</h3>
                    {ev.lieu && (
                      <p className="flex items-center gap-1 text-xs mb-2" style={{ color: "#1D1836", opacity: 0.5 }}>
                        <MapPin className="w-3 h-3" /> {ev.lieu}
                      </p>
                    )}
                    <Link to="/agenda"
                      className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:shadow-sm text-white"
                      style={{ backgroundColor: "#63C7FF", color: "#1D1836" }}>
                      Je participe
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── SECTION 5 : ACTEURS LOCAUX ─── */}
        <section>
          <SectionHeader emoji="🤝" title="Acteurs locaux" subtitle="Associations, entreprises, initiatives qui font avancer la commune" />
          {acteurs.length === 0 ? (
            <EmptyState msg="Aucun acteur référencé pour l'instant." cta={{ label: "Proposer mon aide", to: "/aider" }} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {acteurs.map(post => <SimpleCard key={post.id} post={post} badge="🌱 Acteur local" badgeBg="#B8F5C4" />)}
            </div>
          )}
        </section>

        {/* ─── SECTION 6 : INFOS MAIRIE (si présent) ─── */}
        {infos.length > 0 && (
          <section>
            <SectionHeader emoji="📣" title="Infos utiles" subtitle="Messages et annonces de la commune" />
            <div className="space-y-3">
              {infos.map(post => (
                <div key={post.id} className="bg-white rounded-2xl border-2 border-ink/10 p-5">
                  <span className="text-xs font-black px-2 py-1 rounded-full mb-2 inline-block"
                    style={{ backgroundColor: "#FF6FB5", color: "#1D1836" }}>
                    📣 Info mairie
                  </span>
                  <h3 className="font-black text-sm mt-2 mb-1 leading-snug" style={{ color: "#1D1836" }}>{post.titre}</h3>
                  {post.resume && <p className="text-xs leading-relaxed" style={{ color: "#1D1836", opacity: 0.65 }}>{post.resume}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── SECTION 6 (bis) : AGIR DANS CETTE COMMUNE ─── */}
        <section className="bg-white rounded-2xl border-2 border-ink/10 p-8">
          <h2 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Agir dans cette commune</h2>
          <p className="text-sm mb-5 font-medium" style={{ color: "#1D1836", opacity: 0.65 }}>
            Signalez, proposez, aidez — sans compte, directement utile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { emoji: "🚨", label: "Signaler un problème", to: "/signaler", bg: "#FFD84D" },
              { emoji: "💡", label: "Proposer une idée", to: "/proposer", bg: "#63C7FF" },
              { emoji: "🤝", label: "Proposer mon aide", to: "/aider", bg: "#FF6FB5" },
            ].map(a => (
              <Link key={a.to} to={a.to}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-ink/10 font-black text-sm text-center transition-all hover:shadow-md hover:scale-105"
                style={{ backgroundColor: a.bg, color: "#1D1836" }}>
                <span className="text-2xl">{a.emoji}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ─── SECTION 7 : CONTACT MAIRIE ─── */}
        <section className="border-t-2 border-ink/8 pt-8 text-center">
          <p className="text-sm font-bold mb-1" style={{ color: "#1D1836" }}>
            {commune.adresse_mairie ? `📍 ${commune.adresse_mairie}` : "Contacter l'équipe de la plateforme"}
          </p>
          <p className="text-xs mb-4" style={{ color: "#1D1836", opacity: 0.5 }}>
            {commune.email_contact ? "Contact de la commune" : "Pour activer votre commune sur la plateforme"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {commune.email_contact ? (
              <a href={`mailto:${commune.email_contact}`}
                className="inline-flex items-center gap-2 text-white font-black py-3 px-5 rounded-full shadow-md transition-all hover:scale-105 text-sm"
                style={{ backgroundColor: "#FF6A00" }}>
                <Mail className="w-4 h-4" /> {commune.email_contact}
              </a>
            ) : (
              <a href="mailto:contact@vlmconsulting.fr"
                className="inline-flex items-center gap-2 text-white font-black py-3 px-5 rounded-full shadow-md transition-all hover:scale-105 text-sm"
                style={{ backgroundColor: "#FF6A00" }}>
                <Mail className="w-4 h-4" /> contact@vlmconsulting.fr
              </a>
            )}
            {commune.telephone_contact ? (
              <a href={`tel:${commune.telephone_contact}`}
                className="inline-flex items-center gap-2 text-white font-black py-3 px-5 rounded-full shadow-md transition-all hover:scale-105 text-sm"
                style={{ backgroundColor: "#FF6A00" }}>
                <Phone className="w-4 h-4" /> {commune.telephone_contact}
              </a>
            ) : (
              <a href="tel:+33668733842"
                className="inline-flex items-center gap-2 text-white font-black py-3 px-5 rounded-full shadow-md transition-all hover:scale-105 text-sm"
                style={{ backgroundColor: "#FF6A00" }}>
                <Phone className="w-4 h-4" /> 06 68 73 38 42
              </a>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

/* ─── Composants locaux ─── */

function EmptyState({ msg, cta }) {
  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-ink/10 p-6 text-center">
      <p className="text-sm mb-3" style={{ color: "#1D1836", opacity: 0.5 }}>{msg}</p>
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

function ActionCard({ post, urgent }) {
  const date = post.date_souhaitee
    ? new Date(post.date_souhaitee).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;
  return (
    <div className="bg-white rounded-2xl border-2 hover:shadow-md transition-shadow overflow-hidden"
      style={{ borderColor: "rgba(29,24,54,0.08)", borderLeftWidth: "4px", borderLeftColor: urgent ? "#FF6A00" : "#63C7FF" }}>
      <div className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ backgroundColor: urgent ? "#FF6A00" : "#63C7FF", color: urgent ? "white" : "#1D1836" }}>
              {urgent ? "⚡ Urgent" : "🙋 Coup de main cherché"}
            </span>
            {date && <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>{date}</span>}
          </div>
          <h3 className="font-black text-sm leading-snug mb-1" style={{ color: "#1D1836" }}>{post.titre}</h3>
          {post.resume && <p className="text-xs leading-relaxed" style={{ color: "#1D1836", opacity: 0.65 }}>{post.resume}</p>}
        </div>
        <Link to="/place-du-village"
          className="shrink-0 text-xs font-bold px-3 py-2 rounded-full border-2 transition-all hover:shadow-sm"
          style={{ borderColor: "#63C7FF", backgroundColor: "#63C7FF", color: "#1D1836" }}>
          Voir →
        </Link>
      </div>
      </div>
    </div>
  );
}

function SimpleCard({ post, badge, badgeBg }) {
  return (
    <div className="bg-white rounded-2xl border-2 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
      style={{ borderColor: "rgba(29,24,54,0.08)", borderLeftWidth: "4px", borderLeftColor: badgeBg }}>
      {post.image && <img loading="lazy" src={post.image} alt="" className="w-full h-28 object-cover" />}
      <div className="p-5 flex flex-col flex-1">
      <span className="text-xs font-black px-2.5 py-1 rounded-full self-start mb-2"
        style={{ backgroundColor: badgeBg, color: "#1D1836" }}>
        {badge}
      </span>
      <h3 className="font-black text-sm mb-2 flex-1 leading-snug" style={{ color: "#1D1836" }}>{post.titre}</h3>
      {post.resume && <p className="text-xs leading-relaxed mb-3" style={{ color: "#1D1836", opacity: 0.65 }}>{post.resume}</p>}
      <Link to="/place-du-village"
        className="inline-block text-xs font-bold px-4 py-2 rounded-full self-start transition-all hover:shadow-sm"
        style={{ borderWidth: 2, borderStyle: "solid", borderColor: "rgba(29,24,54,0.12)", color: "#1D1836", backgroundColor: "white" }}>
        Découvrir
      </Link>
      </div>
    </div>
  );
}