import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Eye, MousePointer, TrendingUp, MapPin, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { emitSignal } from "@/lib/emitSignal";

// ═══════════════════════════════════════════════════════════════════════
// PAGE /sponsor — Landing + formulaire sponsor avec paiement
// CDC V4 Supernova §4 — Phase 1 immédiat
// ═══════════════════════════════════════════════════════════════════════

const SPONSOR_PLANS = [
  {
    id: "basic",
    nom: "Partenaire Local",
    prix: 97,
    tagline: "Visibilité locale essentielle",
    color: "#1D1836",
    highlight: false,
    rubriques: ["1 rubrique au choix"],
    features: [
      "1 emplacement sponsor (rubrique au choix)",
      "Badge \"Partenaire local\" vérifié",
      "Logo + accroche + CTA",
      "Stats mensuelles (impressions, clics)",
      "Présence sur 1 commune",
    ],
  },
  {
    id: "premium",
    nom: "Sponsor Premium",
    prix: 297,
    tagline: "Maximum de visibilité",
    color: "#FF6A00",
    highlight: true,
    rubriques: ["3 rubriques au choix"],
    features: [
      "3 emplacements sponsors (rubriques au choix)",
      "Badge \"Partenaire officiel\"",
      "Logo + description + CTA personnalisé",
      "Stats hebdomadaires détaillées",
      "Présence sur toutes les communes",
      "Newsletter mensuelle (mention)",
    ],
  },
  {
    id: "exclusif",
    nom: "Sponsor Exclusif",
    prix: 790,
    tagline: "Exclusivité & impact maximum",
    color: "#1D1836",
    highlight: false,
    rubriques: ["Toutes les rubriques"],
    features: [
      "Toutes les rubriques en exclusivité",
      "Badge \"Partenaire Exclusif\" + page dédiée",
      "Contenu éditorial co-créé",
      "Stats en temps réel",
      "Présence intercommunale",
      "Accès direct à l'audience qualifiée",
      "Rapport d'impact mensuel",
    ],
  },
];

const RUBRIQUES = [
  { id: "emploi", label: "Emploi & Business", audience: "actifs locaux, entreprises" },
  { id: "services", label: "Services municipaux", audience: "habitants, familles" },
  { id: "agenda", label: "Agenda local", audience: "tous profils" },
  { id: "place_village", label: "Place du village", audience: "communauté active" },
  { id: "observatoire", label: "Observatoire", audience: "élus, professionnels" },
];

export default function Sponsor() {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get("success") === "1";

  return (
    <div className="font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      {success && (
        <div className="px-4 py-4 text-center font-black text-white text-base" style={{ backgroundColor: "#16A34A" }}>
          🎉 Candidature reçue ! Notre équipe vous contacte sous 24h pour finaliser votre contrat.
        </div>
      )}
      <HeroSponsor />
      <ArgumentsSection />
      <PlansSection />
      <RubriquesSection />
      <FormulaireSection />
    </div>
  );
}

function HeroSponsor() {
  return (
    <section style={{ backgroundColor: "#1D1836" }} className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-8"
          style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
          📣 Régie publicitaire locale
        </div>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 text-white">
          Touchez 46 communes.<br />
          <span style={{ color: "#FF6A00" }}>Audience qualifiée.</span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
          La Pévèle Augmentée regroupe citoyens actifs, entrepreneurs et familles de la Pévèle Carembault.
          Votre message, au bon endroit, au bon moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#formulaire"
            className="font-black text-lg py-4 px-10 rounded-2xl transition-all hover:scale-105"
            style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
            Devenir partenaire <ArrowRight className="inline w-5 h-5 ml-1" />
          </a>
          <a href="#plans"
            className="font-bold text-base py-4 px-8 rounded-2xl border-2 transition-all hover:bg-white/10"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}>
            Voir les tarifs
          </a>
        </div>
      </div>
    </section>
  );
}

function ArgumentsSection() {
  const args = [
    { icon: Eye, titre: "Audience ciblée", desc: "Habitants engagés, entreprises locales, associations — une audience qualifiée et locale." },
    { icon: MapPin, titre: "Ancrage territorial", desc: "Votre marque associée à la vie locale de la Pévèle. Confiance et proximité maximales." },
    { icon: MousePointer, titre: "CTA direct", desc: "Chaque placement inclut un lien vers votre site, boutique ou formulaire de contact." },
    { icon: TrendingUp, titre: "Stats en temps réel", desc: "Impressions, clics, CTR — suivez la performance de votre placement depuis votre espace." },
  ];

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-6">
        {args.map(({ icon: Icon, titre, desc }, i) => (
          <div key={i} className="text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#FF6A00" }}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-black mb-2" style={{ color: "#1D1836" }}>{titre}</h3>
            <p className="text-sm" style={{ color: "#1D1836", opacity: 0.6 }}>{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlansSection() {
  return (
    <section id="plans" className="py-20 px-4" style={{ backgroundColor: "#F5F4F2" }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-4" style={{ color: "#1D1836" }}>Formules de sponsoring</h2>
        <p className="text-center mb-10" style={{ color: "#1D1836", opacity: 0.6 }}>
          Engagement mensuel · Sans frais cachés · Résiliation en 1 clic
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {SPONSOR_PLANS.map((plan) => (
            <div key={plan.id}
              className={`rounded-3xl p-8 flex flex-col ${plan.highlight ? "shadow-2xl" : "shadow-md"}`}
              style={{
                backgroundColor: plan.highlight ? plan.color : "white",
                border: `2px solid ${plan.highlight ? plan.color : "rgba(29,24,54,0.1)"}`,
                transform: plan.highlight ? "scale(1.03)" : "none",
              }}>
              {plan.highlight && (
                <div className="inline-flex items-center gap-1 text-xs font-black mb-4 rounded-full px-3 py-1 self-start"
                  style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
                  <Star className="w-3 h-3" /> Le plus populaire
                </div>
              )}
              <h3 className={`text-xl font-black mb-1 ${plan.highlight ? "text-white" : ""}`}
                style={plan.highlight ? {} : { color: "#1D1836" }}>
                {plan.nom}
              </h3>
              <p className={`text-sm mb-4 ${plan.highlight ? "text-white/60" : "text-gray-500"}`}>{plan.tagline}</p>
              <div className="mb-6">
                <span className={`text-4xl font-black ${plan.highlight ? "text-white" : ""}`}
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
              <a href="#formulaire"
                className="block text-center py-3 rounded-xl font-black text-base transition-all hover:scale-105"
                style={{
                  backgroundColor: plan.highlight ? "#FFD84D" : "#1D1836",
                  color: plan.highlight ? "#1D1836" : "white",
                }}>
                Choisir cette formule
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RubriquesSection() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-black text-center mb-8" style={{ color: "#1D1836" }}>
          Choisissez votre rubrique
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {RUBRIQUES.map((r) => (
            <div key={r.id} className="rounded-2xl p-5 border-2" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <h3 className="font-black mb-1" style={{ color: "#1D1836" }}>{r.label}</h3>
              <p className="text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>Audience : {r.audience}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FormulaireSection() {
  const [form, setForm] = useState({
    nom: "", email: "", telephone: "", siret: "",
    commune: "", plan: "basic", rubrique: "emploi",
    site_web: "", message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.email || !form.commune) {
      setError("Nom, email et commune sont requis.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await base44.functions.invoke("manageSponsorSlot", {
        operation: "create",
        ...form,
        sponsor_nom: form.nom,
        titre: `${form.nom} — ${RUBRIQUES.find(r => r.id === form.rubrique)?.label || form.rubrique}`,
        contenu: form.message,
        cta_url: form.site_web,
      });

      // Envoyer email de notification (non-bloquant)
      base44.functions.invoke("sendLeadEmail", {
        type: "sponsor_candidature",
        data: form,
      }).catch(() => {});

      emitSignal({
        type: "sponsorise",
        target_type: "sponsor_slot",
        commune: form.commune,
        topic_tags: [form.rubrique].filter(Boolean),
        weight: 0.95,
        meta: { sponsor_nom: form.nom },
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section id="formulaire" className="py-20 px-4" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "#16A34A" }}>
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black mb-4" style={{ color: "#1D1836" }}>Candidature envoyée !</h2>
          <p className="mb-6" style={{ color: "#1D1836", opacity: 0.7 }}>
            Notre équipe vous contactera sous 24h pour finaliser votre contrat de partenariat.
          </p>
          <Link to="/" className="font-bold text-sm underline" style={{ color: "#FF6A00" }}>
            Retour à l'accueil
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section id="formulaire" className="py-20 px-4" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-4" style={{ color: "#1D1836" }}>
          Devenir partenaire local
        </h2>
        <p className="text-center mb-10" style={{ color: "#1D1836", opacity: 0.6 }}>
          Remplissez ce formulaire. Notre équipe vous recontacte sous 24h.
        </p>

        {error && (
          <div className="mb-6 px-5 py-3 rounded-xl text-sm font-bold border-2 border-red-300 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-md space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black mb-1.5 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>
                Nom de l'entreprise *
              </label>
              <input name="nom" value={form.nom} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}
                placeholder="Mon Entreprise SARL" />
            </div>
            <div>
              <label className="block text-xs font-black mb-1.5 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>
                Email *
              </label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}
                placeholder="contact@monentreprise.fr" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black mb-1.5 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>
                Commune *
              </label>
              <input name="commune" value={form.commune} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}
                placeholder="Nom de la commune" />
            </div>
            <div>
              <label className="block text-xs font-black mb-1.5 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>
                SIRET
              </label>
              <input name="siret" value={form.siret} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}
                placeholder="12345678901234" maxLength={14} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black mb-1.5 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>
                Formule
              </label>
              <select name="plan" value={form.plan} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
                <option value="basic">Partenaire Local — 97€/mois</option>
                <option value="premium">Sponsor Premium — 297€/mois</option>
                <option value="exclusif">Sponsor Exclusif — 790€/mois</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black mb-1.5 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>
                Rubrique souhaitée
              </label>
              <select name="rubrique" value={form.rubrique} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
                {RUBRIQUES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black mb-1.5 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>
              Site web
            </label>
            <input name="site_web" value={form.site_web} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none"
              style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}
              placeholder="https://monentreprise.fr" />
          </div>

          <div>
            <label className="block text-xs font-black mb-1.5 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>
              Message (optionnel)
            </label>
            <textarea name="message" value={form.message} onChange={handleChange} rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none resize-none"
              style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}
              placeholder="Décrivez votre activité et vos objectifs de communication locale…" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-lg transition-all hover:scale-105 disabled:opacity-60"
            style={{ backgroundColor: "#FF6A00", color: "white" }}>
            {loading ? "Envoi en cours…" : "Envoyer ma candidature →"}
          </button>

          <p className="text-xs text-center" style={{ color: "#1D1836", opacity: 0.4 }}>
            Aucun paiement à ce stade. Notre équipe vous contacte pour finaliser.
          </p>
        </form>
      </div>
    </section>
  );
}
