import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, Briefcase, Calendar, MessageSquare, Building2, Users, Settings, ArrowRight, RefreshCw, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import LameDecision from "@/components/LameDecision";

// ═══════════════════════════════════════════════════════════════════════
// PAGE /mon-dashboard — Dashboard personnalisé IA par profil
// CDC V4 Supernova §2.1 — Phase 1
// ═══════════════════════════════════════════════════════════════════════

const WIDGET_DEFS = {
  emploi_offres: { label: "Emploi & Offres", icon: Briefcase, color: "#3B82F6", link: "/emploi-business-local" },
  evenements: { label: "Événements", icon: Calendar, color: "#8B5CF6", link: "/agenda" },
  place_village: { label: "Place du village", icon: MessageSquare, color: "#10B981", link: "/place-du-village" },
  signalements: { label: "Mes signalements", icon: Building2, color: "#F59E0B", link: "/agir" },
  b2b_besoins: { label: "B2B & Réseau", icon: TrendingUp, color: "#EF4444", link: "/b2b" },
  associations: { label: "Associations", icon: Users, color: "#6366F1", link: "/associations" },
  services: { label: "Services", icon: Settings, color: "#EC4899", link: "/services" },
  mairie_news: { label: "Actualités mairie", icon: Building2, color: "#FF6A00", link: "/place-du-village" },
};

const PROFIL_LABELS = {
  citoyen: "Citoyen",
  entrepreneur: "Entrepreneur",
  demandeur_emploi: "Demandeur d'emploi",
  association: "Association",
  facilitateur_b2b: "Facilitateur B2B",
};

export default function MonDashboard() {
  const { user } = useAuth() || {};
  const [interests, setInterests] = useState(null);
  const [dashConfig, setDashConfig] = useState(null);
  const [digest, setDigest] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [user?.email]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const email = user?.email;
      if (!email) { setLoading(false); return; }

      const [interestsList, configList] = await Promise.allSettled([
        base44.entities.UserInterest.filter({ email }),
        base44.entities.DashboardConfig.filter({ email }),
      ]);

      const interest = interestsList.status === 'fulfilled' ? interestsList.value[0] : null;
      const config = configList.status === 'fulfilled' ? configList.value[0] : null;

      setInterests(interest);
      setDashConfig(config);

      // Charger le dernier digest disponible
      try {
        const digests = await base44.entities.DailyDigest.filter({});
        if (digests.length > 0) {
          const sorted = digests.sort((a, b) =>
            new Date(b.generated_at || b.created_date || 0) - new Date(a.generated_at || a.created_date || 0)
          );
          setDigest(sorted[0]);
        }
      } catch {}

      // Charger les stats basiques
      try {
        const res = await base44.functions.invoke("getMairieData", { operation: "dossiers", params: {} });
        const dossiers = res.data?.dossiers || [];
        setStats({
          total: dossiers.length,
          resolus: dossiers.filter(d => d.statut === 'resolu').length,
          en_cours: dossiers.filter(d => d.statut === 'en_cours').length,
        });
      } catch {}

    } catch (err) {
      console.error("[MonDashboard] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Pas encore d'onboarding
  if (!interests || !interests.onboarding_complete) {
    return (
      <div className="min-h-screen font-sans flex items-center justify-center px-4" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "#FF6A00" }}>
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-4" style={{ color: "#1D1836" }}>Personnalisez votre dashboard</h1>
          <p className="mb-6" style={{ color: "#1D1836", opacity: 0.6 }}>
            Dites-nous vos centres d'intérêt pour que votre dashboard n'affiche que ce qui vous est utile.
          </p>
          <Link to="/onboarding-interets"
            className="inline-flex items-center gap-2 font-black text-lg py-4 px-10 rounded-2xl transition-all hover:scale-105"
            style={{ backgroundColor: "#FF6A00", color: "white" }}>
            Personnaliser <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  const widgetsActifs = dashConfig?.widgets_actifs || ['place_village', 'signalements', 'evenements'];
  const profilType = interests.profil_type || 'citoyen';

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black" style={{ color: "#1D1836" }}>
              Bonjour 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>
              Profil : {PROFIL_LABELS[profilType] || profilType}
              {interests.commune && ` · ${interests.commune}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadDashboard}
              className="p-2.5 rounded-xl border-2 transition-all hover:scale-105"
              style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link to="/onboarding-interets"
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ backgroundColor: "rgba(29,24,54,0.05)", color: "#1D1836" }}>
              ✏️ Modifier
            </Link>
          </div>
        </div>

        {/* 🧠 Lame de Décision — Zero-Interface UX (Graphe Territorial) */}
        <div className="mb-6">
          <LameDecision commune={interests?.commune} />
        </div>

        {/* Digest IA (si disponible) */}
        {digest && (
          <div className="rounded-3xl p-6 mb-6 shadow-sm"
            style={{ backgroundColor: "#1D1836" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#FFD84D" }}>
                🤖 Digest IA — Point de la semaine
              </span>
            </div>
            <p className="text-white/90 mb-4 font-medium">{digest.contenu_court || "Aucun résumé disponible."}</p>
            {digest.top_1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[digest.top_1, digest.top_2, digest.top_3].filter(Boolean).map((item, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                    <p className="text-sm text-white/70">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats rapides */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <p className="text-2xl font-black" style={{ color: "#1D1836" }}>{stats.total}</p>
              <p className="text-xs mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>Dossiers totaux</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <p className="text-2xl font-black text-green-600">{stats.resolus}</p>
              <p className="text-xs mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>Résolus</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <p className="text-2xl font-black" style={{ color: "#FF6A00" }}>{stats.en_cours}</p>
              <p className="text-xs mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>En cours</p>
            </div>
          </div>
        )}

        {/* Widgets actifs */}
        <h2 className="text-lg font-black mb-4" style={{ color: "#1D1836" }}>Mes raccourcis</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {widgetsActifs.map((widgetId) => {
            const widget = WIDGET_DEFS[widgetId];
            if (!widget) return null;
            const Icon = widget.icon;
            return (
              <Link key={widgetId} to={widget.link}
                className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:scale-105 flex flex-col items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${widget.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: widget.color }} />
                </div>
                <span className="font-black text-sm" style={{ color: "#1D1836" }}>{widget.label}</span>
                <ArrowRight className="w-4 h-4 ml-auto" style={{ color: widget.color }} />
              </Link>
            );
          })}
        </div>

        {/* Centres d'intérêt */}
        {interests.centres_interet?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#1D1836", opacity: 0.5 }}>
              Vos centres d'intérêt
            </p>
            <div className="flex flex-wrap gap-2">
              {interests.centres_interet.map(id => (
                <span key={id} className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: "rgba(255,106,0,0.1)", color: "#FF6A00" }}>
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTAs selon profil */}
        <ProfilCTAs profil={profilType} />
      </div>
    </div>
  );
}

function ProfilCTAs({ profil }) {
  const ctas = {
    demandeur_emploi: [
      { label: "🔍 Voir les offres d'emploi", to: "/emploi-business-local", color: "#3B82F6" },
      { label: "📝 Proposer mon aide", to: "/aider", color: "#10B981" },
    ],
    entrepreneur: [
      { label: "💼 Emploi & Business local", to: "/emploi-business-local", color: "#FF6A00" },
      { label: "📣 Devenir sponsor", to: "/sponsor", color: "#8B5CF6" },
    ],
    facilitateur_b2b: [
      { label: "🤝 Module B2B (bientôt)", to: "/b2b", color: "#EF4444" },
      { label: "💼 Business local", to: "/emploi-business-local", color: "#FF6A00" },
    ],
    citoyen: [
      { label: "🚨 Signaler un problème", to: "/signaler", color: "#F59E0B" },
      { label: "💡 Proposer une idée", to: "/proposer", color: "#10B981" },
    ],
    association: [
      { label: "🤝 Trouver des bénévoles", to: "/associations", color: "#6366F1" },
      { label: "📅 Agenda associatif", to: "/agenda", color: "#8B5CF6" },
    ],
  };

  const profileCtas = ctas[profil] || ctas.citoyen;

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {profileCtas.map((cta, i) => (
        <Link key={i} to={cta.to}
          className="flex items-center justify-between p-4 rounded-2xl font-black text-white shadow-sm hover:scale-105 transition-all"
          style={{ backgroundColor: cta.color }}>
          <span>{cta.label}</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      ))}
    </div>
  );
}
