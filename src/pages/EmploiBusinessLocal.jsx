import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import ModalAide from "@/components/ModalAide";
import CommuneSelector from "@/components/CommuneSelector";
import SectionHeader from "@/components/SectionHeader";
import SponsorSlot from "@/components/SponsorSlot";

export default function EmploiBusinessLocal() {
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [appels, setAppels] = useState([]);
  const [victoires, setVictoires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interetModal, setInteretModal] = useState(null);
  const [interetSent, setInteretSent] = useState({});

  useEffect(() => { if (selectedCommune) loadData(); }, [selectedCommune]);

  const loadData = async () => {
    setLoading(true);
    try {
      const posts = await base44.entities.VillagePost.filter(
        { commune: selectedCommune.slug, est_public: true }, "-published_at", 80
      ).catch(() => []);

      setAppels(posts.filter(p => p.type_post === "appel_aide"));
      setVictoires(posts.filter(p => ["victoire", "merci_local"].includes(p.type_post)));
    } finally {
      setLoading(false);
    }
  };

  const hasContent = appels.length + victoires.length > 0;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      <CommuneSelector selectedCommune={selectedCommune} onSelect={setSelectedCommune} />

      {/* ─── HERO ─── */}
      <section className="border-b-2 border-ink/8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row">
          <div className="flex-1 px-6 pt-14 pb-12 flex flex-col justify-center md:pr-12">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-5 border-2 self-start"
              style={{ backgroundColor: "#FFD84D", borderColor: "#1D1836", color: "#1D1836" }}>
              💼 Pévèle Carembault
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4" style={{ color: "#1D1836" }}>
              Recruter, collaborer,<br />
              <span style={{ color: "#FF6A00" }}>trouver près de chez vous.</span>
            </h1>
            <p className="text-base font-medium mb-8 max-w-md" style={{ color: "#1D1836", opacity: 0.7 }}>
              Offres d'emploi, stages, partenariats et acteurs économiques locaux — tout ce qui bouge sur le territoire.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/proposer"
                className="inline-block text-white font-black py-3 px-6 rounded-full shadow-md transition-all hover:scale-105"
                style={{ backgroundColor: "#FF6A00" }}>
                Publier une offre
              </Link>
              <Link to="/place-du-village"
                className="inline-block font-bold py-3 px-6 rounded-full border-2 bg-white transition-all hover:shadow-md"
                style={{ borderColor: "#1D1836", color: "#1D1836" }}>
                Toutes les opportunités
              </Link>
            </div>
          </div>
          <div className="md:w-80 lg:w-96 shrink-0 overflow-hidden" style={{ minHeight: "260px" }}>
            <img
              src="https://media.base44.com/images/public/69c6b3f69a0c0e88e2529d4a/fdd88c010_generated_image.png"
              alt="Collaboration locale en Pévèle"
              className="w-full h-full object-cover"
              style={{ minHeight: "260px" }}
            />
          </div>
        </div>
      </section>

      {/* Sponsor slot emploi */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <SponsorSlot rubrique="emploi" commune={selectedCommune?.slug} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
        </div>
      ) : !hasContent ? (
        /* ─── EMPTY STATE ─── */
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-5">💼</div>
          <h2 className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>
            Aucune opportunité publiée pour l'instant dans cette commune.
          </h2>
          <p className="text-base mb-8 font-medium" style={{ color: "#1D1836", opacity: 0.6 }}>
            Soyez le premier à publier une offre d'emploi, un stage ou une collaboration locale.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/proposer"
              className="inline-block text-white font-black py-3 px-6 rounded-full shadow-md transition-all hover:scale-105"
              style={{ backgroundColor: "#FF6A00" }}>
              Proposer une opportunité
            </Link>
            <Link to="/place-du-village"
              className="inline-block font-bold py-3 px-6 rounded-full border-2 bg-white transition-all hover:shadow-md"
              style={{ borderColor: "#1D1836", color: "#1D1836" }}>
              Voir la place du village
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-14">

          {/* ─── SECTION A : APPELS D'AIDE ACTIFS ─── */}
          {appels.length > 0 && (
            <section>
              <SectionHeader
                emoji="🙋"
                title="Appels d'aide actifs"
                subtitle="Emplois, missions, coups de main — ce qui cherche preneur maintenant"
                accentColor="#63C7FF"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appels.map(item => (
                  <OpportuniteCard
                    key={item.id}
                    item={item}
                    sent={!!interetSent[item.id]}
                    onInteret={() => setInteretModal(item)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ─── SECTION B : VICTOIRES ET SUCCÈS LOCAUX ─── */}
          {victoires.length > 0 && (
            <section>
              <SectionHeader
                emoji="🏆"
                title="Victoires et succès locaux"
                subtitle="Ce que le territoire a accompli — entreprises, associations, initiatives"
                accentColor="#FFD84D"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {victoires.map(item => (
                  <VictoireCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* ─── CTA ACTION ─── */}
          <section className="bg-white rounded-2xl border-2 border-ink/10 p-8 text-center">
            <h2 className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>Vous avez une opportunité à partager ?</h2>
            <p className="text-sm mb-6 font-medium" style={{ color: "#1D1836", opacity: 0.65 }}>
              Offre d'emploi, stage, partenariat, collaboration — publiez en quelques minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/proposer"
                className="inline-block text-white font-black py-3 px-6 rounded-full shadow-md transition-all hover:scale-105"
                style={{ backgroundColor: "#FF6A00" }}>
                Proposer une offre
              </Link>
              <Link to="/aider"
                className="inline-block font-bold py-3 px-6 rounded-full border-2 bg-white transition-all hover:shadow-md"
                style={{ borderColor: "#1D1836", color: "#1D1836" }}>
                Proposer mes compétences
              </Link>
            </div>
          </section>

        </div>
      )}

      {interetModal && (
        <ModalAide
          post={interetModal}
          onClose={() => setInteretModal(null)}
          onSuccess={(id) => setInteretSent(prev => ({ ...prev, [id]: true }))}
        />
      )}
    </div>
  );
}

/* ─── Composants locaux ─── */

function OpportuniteCard({ item, sent, onInteret }) {
  const date = item.published_at || item.created_date
    ? new Date(item.published_at || item.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;
  const description = item.resume || item.contenu?.slice(0, 120);

  return (
    <div className="bg-white rounded-2xl border-2 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
      style={{ borderColor: "rgba(29,24,54,0.08)", borderLeftWidth: "4px", borderLeftColor: "#63C7FF" }}>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "#E8F5FF", color: "#1D1836" }}>
            🙋 Coup de main cherché
          </span>
          {date && <span className="text-xs shrink-0 font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>{date}</span>}
        </div>
        <h3 className="font-black text-base mb-2 flex-1 leading-snug" style={{ color: "#1D1836" }}>{item.titre}</h3>
        {item.type_aide && (
          <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "#FF6A00" }}>{item.type_aide}</p>
        )}
        {description && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#1D1836", opacity: 0.65 }}>
            {description.length > 120 ? description.slice(0, 120) + "…" : description}
          </p>
        )}
        <div className="flex gap-2 flex-wrap mt-auto">
          <button onClick={onInteret} disabled={sent}
            className="text-xs font-bold px-4 py-2 rounded-full border-2 transition-all disabled:opacity-60"
            style={{
              backgroundColor: sent ? "#B8F5C4" : "#63C7FF",
              borderColor: sent ? "#4CAF50" : "#63C7FF",
              color: "#1D1836"
            }}>
            {sent ? "Envoyé ✓" : "✉️ Je suis intéressé"}
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

function VictoireCard({ item }) {
  const date = item.published_at
    ? new Date(item.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  return (
    <div className="bg-white rounded-2xl border-2 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
      style={{ borderColor: "rgba(29,24,54,0.08)", borderLeftWidth: "4px", borderLeftColor: "#FFD84D" }}>
      {item.image && <img loading="lazy" src={item.image} alt="" className="w-full h-32 object-cover" />}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
            🏆 Victoire
          </span>
          {date && <span className="text-xs shrink-0 font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>{date}</span>}
        </div>
        <h3 className="font-black text-base mb-2 flex-1 leading-snug" style={{ color: "#1D1836" }}>{item.titre}</h3>
        {item.resume && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#1D1836", opacity: 0.65 }}>
            {item.resume.length > 120 ? item.resume.slice(0, 120) + "…" : item.resume}
          </p>
        )}
        <Link to="/place-du-village"
          className="inline-block text-xs font-bold px-4 py-2 rounded-full self-start transition-all hover:shadow-sm"
          style={{ borderWidth: 2, borderStyle: "solid", borderColor: "rgba(29,24,54,0.12)", color: "#1D1836", backgroundColor: "white" }}>
          Découvrir
        </Link>
      </div>
    </div>
  );
}