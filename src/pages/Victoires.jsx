import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy } from "lucide-react";

export default function Victoires() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.VictoryCard.filter({ statut: "publie" }, "-generated_at")
      .then(setCards)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-10 text-center border-b-2 border-ink/8" style={{ backgroundColor: "#FFD84D" }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-5 border-2 bg-white/60"
            style={{ borderColor: "#1D1836", color: "#1D1836" }}>
            🏆 Pévèle Carembault · Réalisations
          </div>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-3" style={{ color: "#1D1836" }}>
            Ce qu'on a accompli ensemble
          </h1>
          <p className="text-base font-medium" style={{ color: "#1D1836", opacity: 0.7 }}>
            Les victoires concrètes de vos communes — dossiers résolus, projets aboutis.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {cards.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "#FF6A00" }} />
            <p className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Les premières victoires arrivent bientôt</p>
            <p className="text-sm" style={{ color: "#1D1836", opacity: 0.5 }}>Revenez régulièrement pour suivre les avancées de votre territoire.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map(card => (
              <VictoryCardTile key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VictoryCardTile({ card }) {
  return (
    <div className="bg-white rounded-2xl border-2 overflow-hidden hover:shadow-lg transition-shadow"
      style={{ borderColor: "rgba(29,24,54,0.08)", borderTopWidth: "4px", borderTopColor: "#FFD84D" }}>
      {card.image && (
        <img loading="lazy" src={card.image} alt="" className="w-full h-44 object-cover" />
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
            🏆 Victoire
          </span>
          {card.commune && (
            <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.45 }}>📍 {card.commune}</span>
          )}
        </div>
        <h3 className="font-black text-base mb-2 leading-snug" style={{ color: "#1D1836" }}>{card.titre}</h3>
        {card.resume && (
          <p className="text-sm leading-relaxed mb-3" style={{ color: "#1D1836", opacity: 0.65 }}>{card.resume}</p>
        )}
        {card.chiffre_cle && (
          <span className="inline-block text-xs font-black px-3 py-1.5 rounded-full border-2"
            style={{ backgroundColor: "#FFF8F1", borderColor: "#FFD84D", color: "#1D1836" }}>
            ⚡ {card.chiffre_cle}
          </span>
        )}
        {card.generated_at && (
          <p className="text-xs mt-3" style={{ color: "#1D1836", opacity: 0.35 }}>
            {new Date(card.generated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}