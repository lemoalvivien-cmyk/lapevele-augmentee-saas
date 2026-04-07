import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Star, Building2, Zap, BarChart3, MessageSquare, FileText, Users, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";

// ═══════════════════════════════════════════════════════════════════════
// PAGE /mairie-plus — Landing pricing Mairie+ avec Stripe Checkout
// CDC V4 Supernova §4 — Phase 1 immédiat
// ═══════════════════════════════════════════════════════════════════════

const PLANS = [
  {
    id: "essentiel",
    nom: "Essentiel",
    prix: 299,
    tagline: "Le démarrage idéal",
    color: "#1D1836",
    highlight: false,
    features: [
      "Tableau de bord mairie",
      "Gestion dossiers citoyens",
      "Place du village",
      "Agenda local",
      "Digest hebdomadaire IA",
      "Assistant IA L1",
      "Jusqu'à 1 commune",
      "Support email",
    ],
    cta: "Démarrer l'essai gratuit",
  },
  {
    id: "pro",
    nom: "Pro",
    prix: 599,
    tagline: "Le plus populaire",
    color: "#FF6A00",
    highlight: true,
    features: [
      "Tout Essentiel +",
      "Analytics avancés (heatmap, exports CSV)",
      "Rapport de mandat IA",
      "Slots sponsors (revenus directs)",
      "Assistant IA L2 (Claude Sonnet)",
      "Notifications email avancées",
      "API data territoire",
      "Support prioritaire",
    ],
    cta: "Choisir Pro",
  },
  {
    id: "territoire",
    nom: "Territoire",
    prix: 999,
    tagline: "Intercommunal & EPCI",
    color: "#1D1836",
    highlight: false,
    features: [
      "Tout Pro +",
      "Jusqu'à 10 communes",
      "Dashboard intercommunal",
      "Observatoire data premium",
      "Agent SENTINEL (signaux faibles)",
      "Assistant IA L3 (Claude Opus)",
      "Onboarding commune 48h",
      "Account manager dédié",
    ],
    cta: "Contacter un expert",
  },
];

const TESTIMONIALS = [
  {
    nom: "Marie-Hélène D.",
    role: "DGS, commune de 3 200 hab.",
    text: "En 3 semaines, nos délais de traitement dossiers ont chuté de 40%. L'agent TRIEUR est bluffant.",
  },
  {
    nom: "Jean-François L.",
    role: "Maire, commune de 1 800 hab.",
    text: "Le digest hebdo IA me fait gagner 2h par semaine. Mes élus adorent le tableau de bord.",
  },
];

export default function MairePlus() {
  const urlParams = new URLSearchParams(window.location.search);
  const checkoutSuccess = urlParams.get("success") === "1";
  const checkoutCanceled = urlParams.get("canceled") === "1";

  return (
    <div className="font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      {checkoutSuccess && <SuccessBanner />}
      {checkoutCanceled && <CanceledBanner />}
      <HeroMairePlus />
      <PricingSection />
      <FeaturesSection />
      <TestimonialsSection />
      <FAQSection />
      <CTAFinal />
    </div>
  );
}

function SuccessBanner() {
  return (
    <div className="px-4 py-4 text-center font-black text-white text-base"
      style={{ backgroundColor: "#16A34A" }}>
      🎉 Abonnement activé ! Bienvenue dans Mairie+. Notre équipe vous contactera sous 24h.
    </div>
  );
}

function CanceledBanner() {
  return (
    <div className="px-4 py-3 text-center font-bold text-amber-800 text-sm"
      style={{ backgroundColor: "#FEF3C7" }}>
      Paiement annulé. Aucun prélèvement n'a été effectué. <Link to="/mairie-plus" className="underline">Réessayer</Link>
    </div>
  );
}

function HeroMairePlus() {
  return (
    <section style={{ backgroundColor: "#1D1836" }} className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-8"
          style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
          🏛️ Mairie+ — SaaS territorial
        </div>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 text-white">
          Pilotez votre commune<br />
          <span style={{ color: "#FF6A00" }}>comme un pro.</span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
          Tableau de bord, IA territoriale, digest automatique, analytics avancés.
          La plateforme qui rend votre commune indispensable à ses habitants.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#pricing"
            className="font-black text-lg py-4 px-10 rounded-2xl transition-all hover:scale-105"
            style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
            Voir les tarifs <ArrowRight className="inline w-5 h-5 ml-1" />
          </a>
          <a href="mailto:contact@lapeveleaugmentee.fr"
            className="font-bold text-base py-4 px-8 rounded-2xl border-2 transition-all hover:bg-white/10"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}>
            Demander une démo
          </a>
        </div>
        <p className="text-sm mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          14 jours d'essai gratuit · Sans engagement · Résiliation en 1 clic
        </p>
      </div>
    </section>
  );
}

function PricingSection() {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [commune, setCommune] = useState("");
  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(null);

  const handleCheckout = async (plan) => {
    if (!commune.trim() || !email.trim()) {
      setShowForm(plan);
      return;
    }
    setLoading(plan);
    setError(null);
    try {
      const res = await base44.functions.invoke("createSubscription", {
        plan,
        commune,
        email,
        success_url: `${window.location.origin}/mairie-plus?success=1`,
        cancel_url: `${window.location.origin}/mairie-plus?canceled=1`,
      });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        setError(res.error || "Erreur lors de la création du checkout");
        setLoading(null);
      }
    } catch (e) {
      setError(e.message || "Erreur réseau");
      setLoading(null);
    }
  };

  return (
    <section id="pricing" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4" style={{ color: "#1D1836" }}>
            Choisissez votre plan
          </h2>
          <p className="text-lg" style={{ color: "#1D1836", opacity: 0.6 }}>
            Tous les plans incluent 14 jours d'essai gratuit. Sans CB requise.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 px-5 py-3 rounded-xl text-sm font-bold border-2 border-red-300 bg-red-50 text-red-700 text-center">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.id}
              className={`rounded-3xl p-8 flex flex-col ${plan.highlight ? "shadow-2xl scale-105" : "shadow-md"}`}
              style={{ backgroundColor: plan.highlight ? plan.color : "white", border: `2px solid ${plan.highlight ? plan.color : "rgba(29,24,54,0.1)"}` }}>

              {plan.highlight && (
                <div className="inline-flex items-center gap-1 text-xs font-black mb-4 rounded-full px-3 py-1 self-start"
                  style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
                  <Star className="w-3 h-3" /> Le plus populaire
                </div>
              )}

              <h3 className={`text-2xl font-black mb-1 ${plan.highlight ? "text-white" : ""}`}
                style={plan.highlight ? {} : { color: "#1D1836" }}>
                {plan.nom}
              </h3>
              <p className={`text-sm mb-4 ${plan.highlight ? "text-white/60" : "text-gray-500"}`}>
                {plan.tagline}
              </p>

              <div className="mb-6">
                <span className={`text-5xl font-black ${plan.highlight ? "text-white" : ""}`}
                  style={plan.highlight ? {} : { color: "#1D1836" }}>
                  {plan.prix}€
                </span>
                <span className={`text-base ml-1 ${plan.highlight ? "text-white/60" : "text-gray-400"}`}>/mois</span>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? "text-yellow-300" : "text-green-500"}`} />
                    <span className={plan.highlight ? "text-white/80" : "text-gray-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              {showForm === plan.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nom de votre commune"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 text-sm font-medium focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836" }}
                  />
                  <input
                    type="email"
                    placeholder="Votre email pro"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 text-sm font-medium focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836" }}
                  />
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loading === plan.id}
                    className="w-full py-3 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-60"
                    style={{ backgroundColor: plan.highlight ? "#FFD84D" : "#1D1836", color: plan.highlight ? "#1D1836" : "white" }}>
                    {loading === plan.id ? "Redirection…" : "Continuer →"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (plan.id === "territoire") {
                      window.location.href = "mailto:contact@lapeveleaugmentee.fr?subject=Mairie+ Territoire";
                    } else {
                      setShowForm(plan.id);
                    }
                  }}
                  className="w-full py-3 rounded-xl font-black text-base transition-all hover:scale-105"
                  style={{ backgroundColor: plan.highlight ? "#FFD84D" : "#1D1836", color: plan.highlight ? "#1D1836" : "white" }}>
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm mt-8" style={{ color: "#1D1836", opacity: 0.4 }}>
          Paiement sécurisé par Stripe · Facturation mensuelle · Résiliation sans délai
        </p>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: BarChart3, titre: "Dashboard temps réel", desc: "Suivez vos indicateurs clés : taux de résolution, satisfaction, heatmap des signalements." },
    { icon: FileText, titre: "Gestion dossiers IA", desc: "L'agent TRIEUR classe et route automatiquement chaque dossier. Zéro doublon, priorité automatique." },
    { icon: MessageSquare, titre: "Digest hebdo automatique", desc: "Chaque semaine, un résumé IA prêt à partager avec vos élus et votre équipe." },
    { icon: Zap, titre: "Assistant IA territorial", desc: "Réécrit vos communications, génère vos victoires, aide à la qualification des dossiers." },
    { icon: Users, titre: "Espace citoyen complet", desc: "Signalement, proposition, aide, place du village, agenda — tout sans compte requis." },
    { icon: Shield, titre: "RGPD & souveraineté", desc: "Données hébergées en France, purge automatique, conformité totale avec le cadre réglementaire." },
  ];

  return (
    <section className="py-20 px-4" style={{ backgroundColor: "#F5F4F2" }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12" style={{ color: "#1D1836" }}>
          Tout ce dont votre commune a besoin
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, titre, desc }, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: "#FF6A00" }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black mb-2" style={{ color: "#1D1836" }}>{titre}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#1D1836", opacity: 0.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-10" style={{ color: "#1D1836" }}>
          Ce que disent nos communes
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="rounded-2xl p-6 border-2" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <p className="text-base leading-relaxed mb-4 italic" style={{ color: "#1D1836", opacity: 0.8 }}>
                "{t.text}"
              </p>
              <div>
                <p className="font-black text-sm" style={{ color: "#1D1836" }}>{t.nom}</p>
                <p className="text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState(null);
  const faqs = [
    { q: "Puis-je tester gratuitement ?", a: "Oui — 14 jours d'essai gratuit, sans carte bancaire requise. Vous accédez à toutes les fonctionnalités du plan choisi." },
    { q: "Combien de temps pour déployer ?", a: "48h maximum. Notre équipe configure la plateforme pour votre commune et forme votre DGS en visioconférence." },
    { q: "Mes données sont-elles sécurisées ?", a: "Toutes les données sont hébergées en France (OVH), chiffrées, et purge automatique RGPD toutes les semaines." },
    { q: "Que se passe-t-il si j'annule ?", a: "Résiliation en 1 clic depuis votre portail client. Aucun frais de résiliation. Vos données exportables avant suppression." },
    { q: "Y a-t-il un contrat d'engagement ?", a: "Non. Facturation mensuelle, sans engagement de durée. Vous payez le mois en cours uniquement." },
  ];

  return (
    <section className="py-20 px-4" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-10" style={{ color: "#1D1836" }}>Questions fréquentes</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border-2 overflow-hidden"
              style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <button
                className="w-full text-left px-6 py-4 font-black flex items-center justify-between"
                style={{ color: "#1D1836" }}
                onClick={() => setOpen(open === i ? null : i)}>
                {faq.q}
                <span className="text-xl">{open === i ? "−" : "+"}</span>
              </button>
              {open === i && (
                <div className="px-6 pb-4 text-sm leading-relaxed" style={{ color: "#1D1836", opacity: 0.7 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAFinal() {
  return (
    <section className="py-20 px-4" style={{ backgroundColor: "#1D1836" }}>
      <div className="max-w-3xl mx-auto text-center">
        <Building2 className="w-12 h-12 mx-auto mb-6" style={{ color: "#FF6A00" }} />
        <h2 className="text-4xl font-black text-white mb-4">
          Votre commune mérite mieux.
        </h2>
        <p className="text-lg mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>
          3 mairies de Pévèle Carembault utilisent déjà Mairie+.
          Rejoignez le mouvement civic-tech.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#pricing"
            className="font-black text-lg py-4 px-10 rounded-2xl transition-all hover:scale-105"
            style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
            Démarrer maintenant <ArrowRight className="inline w-5 h-5 ml-1" />
          </a>
          <a href="mailto:contact@lapeveleaugmentee.fr"
            className="font-bold text-base py-4 px-8 rounded-2xl border-2 transition-all hover:bg-white/10"
            style={{ borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)" }}>
            Parler à un expert
          </a>
        </div>
      </div>
    </section>
  );
}
