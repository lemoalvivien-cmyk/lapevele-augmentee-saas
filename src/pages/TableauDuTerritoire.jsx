import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { AlertCircle, TrendingUp, Clock, CheckCircle, Calendar, MapPin, Loader2 } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

export default function TableauDuTerritoire() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [commune, setCommune] = useState(null);
  
  // Données
  const [besoinsAide, setBesoinsAide] = useState([]);
  const [opportunites, setOpportunites] = useState([]);
  const [enCours, setEnCours] = useState([]);
  const [abouties, setAbouties] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    try {
      let communeSlug = null;
      if (user) {
        if (user.role !== "admin") {
          const profiles = await base44.entities.UserProfile.filter({ email: user.email }).catch(() => []);
          if (profiles.length > 0) communeSlug = profiles[0].commune;
        }
      }

      if (communeSlug) setCommune(communeSlug);

      // Tout depuis VillagePost (accessible publiquement)
      const postsFilter = { est_public: true };
      if (communeSlug) postsFilter.commune = communeSlug;
      const allPosts = await base44.entities.VillagePost.filter(postsFilter, "-published_at", 100).catch(() => []);

      // BLOC 1 : Besoins d'aide actifs
      const appels = allPosts.filter(p => p.type_post === "appel_aide").slice(0, 5);
      setBesoinsAide(appels);

      // BLOC 2 : Opportunités (victoires, merci_local, message_maire)
      const opps = allPosts
        .filter(p => ["victoire", "merci_local", "message_maire"].includes(p.type_post))
        .slice(0, 4);
      setOpportunites(opps);

      // BLOC 3 : "En cours" → appels non urgents
      setEnCours(appels.slice(0, 5));

      // BLOC 4 : Abouti → victoires du mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
      const victoiresMois = allPosts
        .filter(p => ["victoire", "merci_local"].includes(p.type_post) && p.published_at && new Date(p.published_at) >= startOfMonth)
        .slice(0, 4);
      setAbouties(victoiresMois);

      // BLOC 5 : Événements
      const evsFilter = { est_public: true };
      if (communeSlug) evsFilter.commune = communeSlug;
      const events = await base44.entities.EvenementLocal.filter(evsFilter).catch(() => []);
      setEvenements(events.filter(e => new Date(e.date_debut) > new Date()).sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut)).slice(0, 4));

      // Stats basées sur VillagePost (données publiques réelles)
      const besoinsActifs = appels.length;
      const totalActions = allPosts.length;
      const victoires = allPosts.filter(p => ["victoire", "merci_local"].includes(p.type_post)).length;
      const tauxResolution = totalActions > 0 ? Math.round((victoires / totalActions) * 100) : 0;
      setStats({ totalDossiers: totalActions, tauxResolution, besoinsActifs });
    } catch (err) {
      console.error("Erreur chargement tableau:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* Hero */}
      <section className="px-4 pt-16 pb-10 text-center border-b-2 border-ink/8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2" style={{ color: "#1D1836" }}>
            Tableau du territoire
          </h1>
          <p className="text-sm font-medium" style={{ color: "#1D1836", opacity: 0.65 }}>
            Ce qui a besoin d'aide • Ce qui bouge • Ce qui vient d'aboutir
          </p>
        </div>
      </section>

      {/* Contexte léger (bloc 6 en haut) */}
      <section className="px-4 py-8 bg-white border-b-2 border-ink/8">
        <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x-2 divide-ink/8">
          <div className="text-center px-4">
            <p className="text-3xl font-black" style={{ color: "#FF6A00" }}>{stats.besoinsActifs}</p>
            <p className="text-xs font-bold mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>Besoins d'aide actifs</p>
          </div>
          <div className="text-center px-4">
            <p className="text-3xl font-black" style={{ color: "#FF6A00" }}>{stats.totalDossiers}</p>
            <p className="text-xs font-bold mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>Actions signalées</p>
          </div>
          <div className="text-center px-4">
            <p className="text-3xl font-black" style={{ color: "#FF6A00" }}>{stats.tauxResolution}%</p>
            <p className="text-xs font-bold mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>Taux de résolution</p>
          </div>
        </div>
      </section>

      {/* Blocs principaux */}
      <section className="px-4 py-12 max-w-5xl mx-auto space-y-12">
        {/* BLOC 1 : Besoin d'aide maintenant */}
        <BlocAction
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          titre="🚨 Besoin d'aide maintenant"
          description="Appels d'aide actifs — actions rapides"
          items={besoinsAide}
          renderItem={(item) => (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-bold text-sm text-red-900 mb-1">{item.titre}</h3>
              <p className="text-xs text-red-700 mb-3 leading-relaxed">{item.resume || item.contenu?.slice(0, 80)}</p>
              <Link
                to={`/place-du-village`}
                className="inline-block text-xs font-bold bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
              >
                Je peux aider
              </Link>
            </div>
          )}
          emptyMessage="Aucun besoin d'aide en cours. C'est bon signe !"
        />

        {/* BLOC 2 : Opportunités locales */}
        <BlocAction
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          titre="💡 Opportunités locales"
          description="Emploi, collaborations, projets"
          items={opportunites}
          renderItem={(item) => (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-bold text-sm text-green-900 mb-1">{item.titre}</h3>
              <p className="text-xs text-green-700 mb-3 leading-relaxed">{item.resume || item.contenu?.slice(0, 80)}</p>
              <Link
                to={`/place-du-village`}
                className="inline-block text-xs font-bold bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
              >
                Explorer
              </Link>
            </div>
          )}
          emptyMessage="Aucune opportunité en ce moment."
        />

        {/* BLOC 3 : En cours près de vous */}
        <BlocAction
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          titre="⏳ Coups de main recherchés"
          description="Appels à l'aide actifs sur le territoire"
          items={enCours}
          renderItem={(item) => (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h3 className="font-bold text-sm text-orange-900 mb-1">{item.titre}</h3>
              <p className="text-xs text-orange-700 mb-3 leading-relaxed">{(item.resume || item.contenu)?.slice(0, 80)}</p>
              <Link
                to="/place-du-village"
                className="inline-block text-xs font-bold bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700"
              >
                Je peux aider
              </Link>
            </div>
          )}
          emptyMessage="Aucun appel à l'aide en cours."
        />

        {/* BLOC 4 : Vient d'aboutir */}
        <BlocAction
          icon={<CheckCircle className="w-5 h-5 text-green-700" />}
          titre="✨ Vient d'aboutir"
          description="Victoires publiées ce mois-ci"
          items={abouties}
          renderItem={(item) => (
            <div className="bg-green-50 border border-green-300 rounded-xl p-4">
              <h3 className="font-bold text-sm text-green-900 mb-1">{item.titre}</h3>
              <p className="text-xs text-green-700 mb-3 leading-relaxed">{(item.resume || item.contenu)?.slice(0, 80)}</p>
              <Link
                to="/place-du-village"
                className="inline-block text-xs font-bold bg-green-700 text-white px-3 py-2 rounded-lg hover:bg-green-800"
              >
                Voir les détails
              </Link>
            </div>
          )}
          emptyMessage="Aucune victoire publiée ce mois."
        />

        {/* BLOC 5 : Événements utiles */}
        <BlocAction
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          titre="📅 Événements utiles"
          description="Prochains événements locaux"
          items={evenements}
          renderItem={(item) => (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <h3 className="font-bold text-sm text-blue-900">{item.titre}</h3>
              </div>
              <p className="text-xs text-blue-700 mb-2">{new Date(item.date_debut).toLocaleDateString("fr-FR")}</p>
              <Link
                to={`/agenda`}
                className="inline-block text-xs font-bold bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
              >
                Je participe
              </Link>
            </div>
          )}
          emptyMessage="Aucun événement prévu."
        />
      </section>

      {/* CTA footer */}
      <section className="px-4 py-12 border-t-2 border-ink/8 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-medium mb-4" style={{ color: "#1D1836", opacity: 0.8 }}>
            Vous avez quelque chose à partager ou signaler ?
          </p>
          <Link
            to="/agir"
            className="inline-block text-white font-black py-3 px-6 rounded-full shadow-md transition-all hover:scale-105"
            style={{ backgroundColor: "#FF6A00" }}
          >
            Agir maintenant
          </Link>
        </div>
      </section>

      <div className="h-8"></div>
    </div>
  );
}

function BlocAction({ icon, titre, description, items, renderItem, emptyMessage }) {
  return (
    <div>
      <SectionHeader emoji={icon} title={titre} subtitle={description} />
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-ink/10 p-8 text-center">
          <p className="text-sm font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item, idx) => (
            <div key={item.id || idx}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </div>
  );
}