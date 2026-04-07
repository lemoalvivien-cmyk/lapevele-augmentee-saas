import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Handshake, TrendingUp, ArrowRight } from "lucide-react";
import SponsorSlot from "@/components/SponsorSlot";

const SECTEURS = [
  { key: "agriculture", label: "🌾 Agriculture" },
  { key: "artisanat", label: "🔨 Artisanat" },
  { key: "batiment", label: "🏗️ Bâtiment" },
  { key: "commerce", label: "🛍️ Commerce" },
  { key: "consulting", label: "💼 Consulting" },
  { key: "it_numerique", label: "💻 IT & Numérique" },
  { key: "industrie", label: "⚙️ Industrie" },
  { key: "sante", label: "🏥 Santé" },
  { key: "transport", label: "🚛 Transport" },
  { key: "autre", label: "✨ Autre" },
];

export default function B2B() {
  const [besoins, setBesoins] = useState([]);
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreSecteur, setFiltreSecteur] = useState("tous");
  const [stats, setStats] = useState({ besoins: 0, offres: 0, introductions: 0, entreprises: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, o, p, intro] = await Promise.all([
        base44.entities.BusinessNeed.filter({ statut: "actif" }, "-created_at", 12).catch(() => []),
        base44.entities.BusinessOffer.filter({ statut: "actif" }, "-created_at", 12).catch(() => []),
        base44.entities.BusinessProfile.filter({ visible: true }, "-created_at", 8).catch(() => []),
        base44.entities.Introduction.filter({}, "-created_at", 1).catch(() => []),
      ]);
      setBesoins(b);
      setOffres(o);
      setStats({ besoins: b.length, offres: o.length, entreprises: p.length, introductions: intro.length });
    } finally {
      setLoading(false);
    }
  };

  const filteredBesoins = filtreSecteur === "tous" ? besoins : besoins.filter(b => b.secteur_cible === filtreSecteur);
  const filteredOffres = filtreSecteur === "tous" ? offres : offres.filter(o => o.secteur === filtreSecteur);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* ─── HERO ─── */}
      <section className="border-b-2 border-ink/8" style={{ backgroundColor: "#1D1836" }}>
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-6 border-2 self-start"
            style={{ backgroundColor: "#FFD84D", borderColor: "#FFD84D", color: "#1D1836" }}>
            🤝 WIINUP · Pévèle Carembault
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-5 text-white">
            Business local,<br />
            <span style={{ color: "#FF6A00" }}>connections réelles.</span>
          </h1>
          <p className="text-base md:text-lg font-medium mb-10 max-w-xl" style={{ color: "rgba(255,255,255,0.7)" }}>
            Publiez vos besoins, trouvez des partenaires locaux et faites conclure vos deals par nos facilitateurs WIINUP — sur les 46 communes de la Pévèle Carembault.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/b2b/besoins"
              className="inline-flex items-center gap-2 text-white font-black py-3.5 px-7 rounded-2xl shadow-lg transition-all hover:scale-105 text-sm"
              style={{ backgroundColor: "#FF6A00" }}>
              <Handshake className="w-4 h-4" /> Publier un besoin
            </Link>
            <Link to="/b2b/introductions"
              className="inline-flex items-center gap-2 font-black py-3.5 px-7 rounded-2xl border-2 transition-all hover:bg-white/10 text-sm text-white"
              style={{ borderColor: "rgba(255,255,255,0.3)" }}>
              Mes introductions
            </Link>
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="bg-white border-b-2 border-ink/8">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Besoins actifs", value: stats.besoins, icon: "📋", color: "#FF6A00" },
            { label: "Offres disponibles", value: stats.offres, icon: "✨", color: "#63C7FF" },
            { label: "Entreprises", value: stats.entreprises, icon: "🏢", color: "#FFD84D" },
            { label: "Introductions", value: stats.introductions, icon: "🤝", color: "#B8F5C4" },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-2xl border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black" style={{ color: "#1D1836" }}>{s.value}</div>
              <div className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Sponsor */}
        <SponsorSlot rubrique="emploi" className="mb-8" />

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          <button onClick={() => setFiltreSecteur("tous")}
            className="shrink-0 px-4 py-2 rounded-full text-xs font-black border-2 transition-all"
            style={{ backgroundColor: filtreSecteur === "tous" ? "#FFD84D" : "white", borderColor: filtreSecteur === "tous" ? "#1D1836" : "rgba(29,24,54,0.15)", color: "#1D1836" }}>
            Tous les secteurs
          </button>
          {SECTEURS.map(s => (
            <button key={s.key} onClick={() => setFiltreSecteur(s.key)}
              className="shrink-0 px-4 py-2 rounded-full text-xs font-black border-2 transition-all"
              style={{ backgroundColor: filtreSecteur === s.key ? "#FFD84D" : "white", borderColor: filtreSecteur === s.key ? "#1D1836" : "rgba(29,24,54,0.15)", color: "#1D1836" }}>
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Colonne Besoins */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black" style={{ color: "#1D1836" }}>📋 Besoins ({filteredBesoins.length})</h2>
                <Link to="/b2b/besoins" className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {filteredBesoins.length === 0 && (
                  <div className="text-center py-10 bg-white rounded-2xl border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                    <div className="text-3xl mb-2">📭</div>
                    <p className="text-sm font-medium" style={{ color: "#1D1836", opacity: 0.6 }}>Aucun besoin actif pour ce secteur.</p>
                    <Link to="/b2b/besoins" className="text-sm font-bold text-orange-500 hover:underline mt-2 block">Publier le premier !</Link>
                  </div>
                )}
                {filteredBesoins.map(b => (
                  <div key={b.id} className="bg-white rounded-2xl border-2 p-4 hover:shadow-md transition-shadow" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
                        {b.type_besoin?.replace("_", " ")}
                      </span>
                      <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>{b.commune}</span>
                    </div>
                    <h3 className="font-black text-sm mb-1" style={{ color: "#1D1836" }}>{b.titre}</h3>
                    <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: "#1D1836", opacity: 0.65 }}>{b.description}</p>
                    <Link to={`/b2b/besoins`}
                      className="text-xs font-black text-orange-500 hover:underline flex items-center gap-1">
                      Proposer une offre <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Colonne Offres */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black" style={{ color: "#1D1836" }}>✨ Offres ({filteredOffres.length})</h2>
                <Link to="/b2b/besoins" className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1">
                  Publier <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {filteredOffres.length === 0 && (
                  <div className="text-center py-10 bg-white rounded-2xl border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                    <div className="text-3xl mb-2">💼</div>
                    <p className="text-sm font-medium" style={{ color: "#1D1836", opacity: 0.6 }}>Aucune offre pour ce secteur.</p>
                  </div>
                )}
                {filteredOffres.map(o => (
                  <div key={o.id} className="bg-white rounded-2xl border-2 p-4 hover:shadow-md transition-shadow" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "#63C7FF", color: "#1D1836" }}>
                        {o.type_offre?.replace("_", " ")}
                      </span>
                      {o.prix && (
                        <span className="text-xs font-black" style={{ color: "#FF6A00" }}>
                          {o.prix}€ {o.unite_prix ? `/ ${o.unite_prix}` : ""}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm mb-1" style={{ color: "#1D1836" }}>{o.titre}</h3>
                    <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: "#1D1836", opacity: 0.65 }}>{o.description}</p>
                    <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>{o.commune}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bloc WIINUP CTA */}
        <div className="mt-12 rounded-3xl p-8 text-center" style={{ backgroundColor: "#1D1836" }}>
          <div className="text-4xl mb-3">🤝</div>
          <h2 className="text-2xl font-black text-white mb-3">Le modèle WIINUP</h2>
          <p className="text-sm mb-6 max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.7)" }}>
            Nos facilitateurs locaux mettent en relation les entreprises, coordonnent les rendez-vous et encaissent une commission uniquement sur les deals conclus. <strong className="text-white">0€ si ça ne marche pas.</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/b2b/introductions"
              className="inline-flex items-center gap-2 text-white font-black py-3 px-6 rounded-2xl text-sm transition-all hover:scale-105"
              style={{ backgroundColor: "#FF6A00" }}>
              <Handshake className="w-4 h-4" /> Démarrer une introduction
            </Link>
            <Link to="/b2b/prospection"
              className="inline-flex items-center gap-2 font-black py-3 px-6 rounded-2xl border-2 text-sm text-white transition-all"
              style={{ borderColor: "rgba(255,255,255,0.3)" }}>
              <TrendingUp className="w-4 h-4" /> Signaux de prospection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
