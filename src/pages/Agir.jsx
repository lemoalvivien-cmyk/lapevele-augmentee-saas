import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const actions = [
  {
    emoji: "🚨",
    titre: "Je signale un problème",
    desc: "Voirie, éclairage, propreté, danger… La mairie a besoin de le savoir.",
    to: "/signaler",
    bg: "#FFD84D",
  },
  {
    emoji: "💡",
    titre: "Je propose une idée",
    desc: "Un équipement, un événement, une amélioration du quartier…",
    to: "/proposer",
    bg: "#63C7FF",
  },
  {
    emoji: "🤝",
    titre: "Je propose mon aide",
    desc: "Du temps, une compétence, de l'énergie — votre commune a peut-être besoin de vous.",
    to: "/aider",
    bg: "#FF6FB5",
  },
];

import PublicAssistant from "@/components/PublicAssistant";

export default function Agir() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFF8F1" }}>
      <PublicAssistant />
      {/* Header */}
      <div className="text-center px-5 pt-14 pb-10">
        <h1 className="text-3xl md:text-4xl font-black leading-tight mb-3" style={{ color: "#1D1836" }}>
          Que voulez-vous faire<br className="hidden sm:block" /> aujourd'hui ?
        </h1>
        <p className="text-base font-medium" style={{ color: "#1D1836", opacity: 0.65 }}>
          Signaler, proposer, ou aider votre commune.
        </p>
        <p className="text-sm font-bold mt-2 uppercase tracking-widest" style={{ color: "#FF6A00" }}>
          Gratuit · Sans compte · Directement à votre mairie
        </p>
      </div>

      {/* Actions */}
      <div className="flex-1 max-w-xl w-full mx-auto px-4 pb-10 flex flex-col gap-4">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="group flex items-center gap-5 p-6 rounded-2xl border-2 border-ink/10 transition-all hover:scale-102 hover:shadow-lg"
            style={{ backgroundColor: a.bg }}>
            <span className="text-5xl shrink-0">{a.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-black leading-snug mb-1" style={{ color: "#1D1836" }}>{a.titre}</div>
              <div className="text-sm leading-relaxed font-medium" style={{ color: "#1D1836", opacity: 0.7 }}>{a.desc}</div>
            </div>
            <ArrowRight className="w-6 h-6 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: "#1D1836" }} />
          </Link>
        ))}

        {/* No account banner */}
        <div className="bg-white rounded-2xl border-2 border-ink/10 px-5 py-4 text-center mt-2">
          <p className="text-sm font-bold" style={{ color: "#1D1836" }}>
            ✅ Pas besoin de compte pour commencer. Votre contribution est transmise directement à votre mairie.
          </p>
        </div>

        <Link to="/place-du-village"
          className="flex items-center justify-center gap-2 bg-white rounded-2xl border-2 border-ink/10 py-4 font-bold text-sm transition-all hover:border-orange hover:shadow-md"
          style={{ color: "#1D1836" }}>
          🏘️ Voir la Place du Village
        </Link>
      </div>
    </div>
  );
}