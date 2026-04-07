import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// ═══════════════════════════════════════════════════════════════════════
// PAGE /onboarding-interets — Sélection centres d'intérêt post-inscription
// CDC V4 Supernova §2.1 — Phase 1
// ═══════════════════════════════════════════════════════════════════════

const CENTRES = [
  { id: "emploi", emoji: "💼", label: "Emploi & Recrutement", desc: "Offres d'emploi, stages, alertes matching" },
  { id: "entrepreneuriat", emoji: "🚀", label: "Créer mon entreprise", desc: "Aides, accompagnement, mise en réseau" },
  { id: "evenements", emoji: "🎉", label: "Événements & Loisirs", desc: "Agenda local, concerts, associations" },
  { id: "associations", emoji: "🤝", label: "Bénévolat & Associations", desc: "Appels à volontaires, projets locaux" },
  { id: "services", emoji: "🏛️", label: "Services municipaux", desc: "Démarches, infos mairie, signalements" },
  { id: "b2b", emoji: "🤝", label: "Réseau B2B local", desc: "Mise en relation professionnelle, WIINUP" },
  { id: "environnement", emoji: "🌿", label: "Environnement & Nature", desc: "Initiatives écologiques, circuits courts" },
  { id: "culture", emoji: "🎭", label: "Culture & Patrimoine", desc: "Sorties culturelles, patrimoine local" },
  { id: "sport", emoji: "⚽", label: "Sport & Bien-être", desc: "Clubs sportifs, activités physiques" },
  { id: "solidarite", emoji: "❤️", label: "Solidarité & Entraide", desc: "Aide aux voisins, lien social" },
];

const OBJECTIFS = [
  { id: "chercher_emploi", emoji: "🔍", label: "Je cherche un emploi" },
  { id: "creer_entreprise", emoji: "🏗️", label: "Je crée mon entreprise" },
  { id: "developper_business", emoji: "📈", label: "Je développe mon business" },
  { id: "rencontres_sociales", emoji: "👥", label: "Je cherche des liens sociaux" },
  { id: "aider_voisins", emoji: "🏘️", label: "Je veux aider ma communauté" },
  { id: "suivre_mairie", emoji: "📋", label: "Je veux suivre ma mairie" },
  { id: "b2b_wiinup", emoji: "🤜", label: "Je facilite des mises en relation B2B" },
];

export default function OnboardingInterets() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const [step, setStep] = useState(1);
  const [selectedCentres, setSelectedCentres] = useState([]);
  const [selectedObjectifs, setSelectedObjectifs] = useState([]);
  const [commune, setCommune] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleCentre = (id) => {
    setSelectedCentres(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleObjectif = (id) => {
    setSelectedObjectifs(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    try {
      const email = user?.email || localStorage.getItem("user_email") || "";

      // Détecter profil_type automatiquement
      let profil_type = "citoyen";
      if (selectedObjectifs.includes("creer_entreprise") || selectedObjectifs.includes("developper_business")) {
        profil_type = "entrepreneur";
      } else if (selectedObjectifs.includes("chercher_emploi")) {
        profil_type = "demandeur_emploi";
      } else if (selectedObjectifs.includes("b2b_wiinup")) {
        profil_type = "facilitateur_b2b";
      } else if (selectedObjectifs.includes("aider_voisins") && selectedCentres.includes("associations")) {
        profil_type = "association";
      }

      // Sauvegarder UserInterest
      await base44.entities.UserInterest.create({
        user_id: user?.id || email,
        email,
        commune: commune || null,
        centres_interet: selectedCentres,
        objectifs: selectedObjectifs,
        profil_type,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      });

      // Créer DashboardConfig de base
      const widgets = buildWidgets(selectedCentres, selectedObjectifs);
      await base44.entities.DashboardConfig.create({
        user_id: user?.id || email,
        email,
        commune: commune || null,
        widgets_actifs: widgets,
        notifications_email: true,
        digest_hebdo: true,
        updated_at: new Date().toISOString(),
      });

      navigate("/mon-dashboard");
    } catch (err) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  function buildWidgets(centres, objectifs) {
    const widgets = ["place_village", "signalements"];
    if (centres.includes("emploi") || objectifs.includes("chercher_emploi")) widgets.push("emploi_offres");
    if (centres.includes("evenements")) widgets.push("evenements");
    if (centres.includes("associations") || centres.includes("solidarite")) widgets.push("associations");
    if (centres.includes("services")) widgets.push("services");
    if (objectifs.includes("developper_business") || centres.includes("b2b")) widgets.push("b2b_besoins");
    widgets.push("mairie_news");
    return [...new Set(widgets)];
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200">
        <div className="h-1.5 transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%`, backgroundColor: "#FF6A00" }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#FF6A00" }}>
            Étape {step} / 3
          </p>
          <h1 className="text-3xl font-black" style={{ color: "#1D1836" }}>
            {step === 1 && "Quels sont vos centres d'intérêt ?"}
            {step === 2 && "Quels sont vos objectifs ?"}
            {step === 3 && "Votre commune"}
          </h1>
          <p className="mt-2 text-base" style={{ color: "#1D1836", opacity: 0.6 }}>
            {step === 1 && "Choisissez au moins 2 thèmes. Votre dashboard sera personnalisé en conséquence."}
            {step === 2 && "Aidez-nous à comprendre ce que vous cherchez."}
            {step === 3 && "Dernière étape — pour personnaliser les infos locales."}
          </p>
        </div>

        {error && (
          <div className="mb-6 px-5 py-3 rounded-xl text-sm font-bold border-2 border-red-300 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        {/* Step 1 : Centres d'intérêt */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {CENTRES.map((c) => {
              const selected = selectedCentres.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCentre(c.id)}
                  className="relative text-left p-4 rounded-2xl border-2 transition-all hover:scale-105"
                  style={{
                    borderColor: selected ? "#FF6A00" : "rgba(29,24,54,0.12)",
                    backgroundColor: selected ? "rgba(255,106,0,0.06)" : "white",
                  }}>
                  {selected && (
                    <CheckCircle className="absolute top-3 right-3 w-4 h-4" style={{ color: "#FF6A00" }} />
                  )}
                  <span className="text-2xl mb-2 block">{c.emoji}</span>
                  <span className="font-black text-sm block mb-1" style={{ color: "#1D1836" }}>{c.label}</span>
                  <span className="text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>{c.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2 : Objectifs */}
        {step === 2 && (
          <div className="grid grid-cols-1 gap-3">
            {OBJECTIFS.map((o) => {
              const selected = selectedObjectifs.includes(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => toggleObjectif(o.id)}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all"
                  style={{
                    borderColor: selected ? "#FF6A00" : "rgba(29,24,54,0.12)",
                    backgroundColor: selected ? "rgba(255,106,0,0.06)" : "white",
                  }}>
                  <span className="text-2xl">{o.emoji}</span>
                  <span className="font-black text-base flex-1 text-left" style={{ color: "#1D1836" }}>{o.label}</span>
                  {selected && <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "#FF6A00" }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3 : Commune */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <label className="block text-xs font-black mb-2 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>
              Votre commune (optionnel)
            </label>
            <input
              type="text"
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              placeholder="Ex: Orchies, Cysoing, Templeuve…"
              className="w-full px-4 py-3 rounded-xl border-2 text-base focus:outline-none"
              style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}
            />
            <p className="mt-3 text-sm" style={{ color: "#1D1836", opacity: 0.5 }}>
              Permet d'afficher les informations spécifiques à votre commune sur votre dashboard.
            </p>

            {/* Récap */}
            <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <p className="text-xs font-black mb-3 uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.5 }}>
                Récapitulatif
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCentres.map(id => {
                  const c = CENTRES.find(x => x.id === id);
                  return c ? (
                    <span key={id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: "rgba(255,106,0,0.1)", color: "#FF6A00" }}>
                      {c.emoji} {c.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className="px-8 py-3 rounded-xl font-bold border-2 transition-all"
              style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836" }}>
              ← Retour
            </button>
          )}
          <button
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else handleFinish();
            }}
            disabled={(step === 1 && selectedCentres.length < 1) || loading}
            className="flex-1 py-3 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#FF6A00", color: "white" }}>
            {loading ? "Création en cours…" : step === 3 ? "Accéder à mon dashboard →" : "Continuer"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {step === 1 && selectedCentres.length === 0 && (
          <button onClick={() => navigate("/mon-dashboard")}
            className="w-full mt-3 text-center text-sm font-medium underline"
            style={{ color: "#1D1836", opacity: 0.4 }}>
            Passer cette étape
          </button>
        )}
      </div>
    </div>
  );
}
