import { Link } from "react-router-dom";
import SponsorSlot from "@/components/SponsorSlot";

const services = [
  {
    id: "mobilite",
    emoji: "🚌",
    titre: "Mobilité",
    description: "Transports, stationnement, accessibilité, pistes cyclables.",
    actions: [
      { label: "Signaler un problème", to: "/signaler" },
      { label: "Proposer une amélioration", to: "/proposer" },
      { label: "Offrir son aide", to: "/aider" },
    ],
  },
  {
    id: "dechets",
    emoji: "♻️",
    titre: "Déchets & Réemploi",
    description: "Collecte, tri, réemploi, compostage, propreté des espaces publics.",
    actions: [
      { label: "Signaler un problème", to: "/signaler" },
      { label: "Proposer une idée", to: "/proposer" },
      { label: "Participer", to: "/aider" },
    ],
  },
  {
    id: "emploi",
    emoji: "💼",
    titre: "Emploi & Business local",
    description: "Offres d'emploi, stages, collaboration, fournisseurs locaux.",
    actions: [
      { label: "Trouver une opportunité", to: "/emploi-business-local" },
      { label: "Proposer un poste", to: "/proposer" },
      { label: "Chercher des partenaires", to: "/emploi-business-local" },
    ],
  },
  {
    id: "associations",
    emoji: "🤝",
    titre: "Associations & Bénévolat",
    description: "Organisations locales, bénévolat, événements communautaires.",
    actions: [
      { label: "Découvrir les associations", to: "/associations" },
      { label: "Proposer mon aide", to: "/aider" },
      { label: "Voir les événements", to: "/agenda" },
    ],
  },
  {
    id: "familles",
    emoji: "👨‍👩‍👧‍👦",
    titre: "Familles, Jeunesse & Seniors",
    description: "Activités, services pour enfants, soutien aux seniors, loisirs.",
    actions: [
      { label: "Voir les événements", to: "/agenda" },
      { label: "Signaler un besoin", to: "/signaler" },
      { label: "S'engager comme bénévole", to: "/aider" },
    ],
  },
  {
    id: "habitat",
    emoji: "🏠",
    titre: "Habitat & Urbanisme",
    description: "Logement, travaux publics, urbanisme, aménagements du quartier.",
    actions: [
      { label: "Signaler un problème", to: "/signaler" },
      { label: "Proposer une amélioration", to: "/proposer" },
      { label: "Voir les chantiers", to: "/place-du-village" },
    ],
  },
  {
    id: "culture",
    emoji: "🎭",
    titre: "Culture, Sport & Tourisme",
    description: "Événements culturels, activités sportives, lieux à visiter.",
    actions: [
      { label: "Voir les événements", to: "/agenda" },
      { label: "Proposer un événement", to: "/proposer" },
      { label: "Trouver des opportunités", to: "/place-du-village" },
    ],
  },
  {
    id: "nature",
    emoji: "🌿",
    titre: "Nature, Climat & Eau",
    description: "Environnement, espaces verts, énergie, gestion de l'eau.",
    actions: [
      { label: "Signaler un problème", to: "/signaler" },
      { label: "Proposer une action", to: "/proposer" },
      { label: "S'engager", to: "/aider" },
    ],
  },
];

export default function Services() {
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* Hero */}
      <section className="px-4 pt-20 pb-14 text-center border-b-2 border-ink/8">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "#FF6A00" }}>Territoire de la Pévèle Carembault</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4" style={{ color: "#1D1836" }}>
            Les services<br />de votre territoire
          </h1>
          <p className="text-base font-medium" style={{ color: "#1D1836", opacity: 0.6 }}>
            Signalez, proposez, participez — par thème, directement à votre mairie.
          </p>
        </div>
      </section>

      {/* Sponsor slot services */}
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <SponsorSlot rubrique="services" />
      </div>

      {/* Grille services */}
      <section className="px-4 py-14 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div key={svc.id} className="bg-white rounded-2xl border-2 border-ink/10 p-6 hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl shrink-0">{svc.emoji}</span>
                <h2 className="text-base font-black leading-snug" style={{ color: "#1D1836" }}>{svc.titre}</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#1D1836", opacity: 0.65 }}>{svc.description}</p>
              <div className="flex flex-wrap gap-2 mt-auto">
                {svc.actions.map((action, idx) => (
                  <Link
                    key={idx}
                    to={action.to}
                    className="text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all hover:shadow-sm"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-4 py-14 text-center border-t-2 border-ink/8">
        <div className="max-w-xl mx-auto">
          <p className="text-sm font-medium mb-5" style={{ color: "#1D1836", opacity: 0.75 }}>
            Vous ne trouvez pas ce que vous cherchez ?
          </p>
          <Link to="/agir"
            className="inline-block text-white font-black py-3 px-8 rounded-full shadow-md transition-all hover:scale-105"
            style={{ backgroundColor: "#FF6A00" }}>
            Agir maintenant
          </Link>
        </div>
      </section>

      <div className="h-8"></div>
    </div>
  );
}