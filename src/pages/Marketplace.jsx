import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, Search } from "lucide-react";
import SponsorSlot from "@/components/SponsorSlot";

const TYPE_LABELS = {
  vente: "🛒 Vente", service: "⚙️ Service", location: "🔑 Location",
  don: "🎁 Don", cours: "📚 Cours", troc: "🔄 Troc"
};
const TYPE_COLORS = {
  vente: "#FFD84D", service: "#63C7FF", location: "#FF6FB5",
  don: "#B8F5C4", cours: "#FF6A00", troc: "#e0e0e0"
};

const CATEGORIES_DEFAULT = [
  { slug: "all", nom: "Tout", emoji: "🌟" },
  { slug: "maison", nom: "Maison", emoji: "🏠" },
  { slug: "vetements", nom: "Vêtements", emoji: "👗" },
  { slug: "electro", nom: "Électronique", emoji: "📱" },
  { slug: "jardin", nom: "Jardin", emoji: "🌱" },
  { slug: "sport", nom: "Sport", emoji: "⚽" },
  { slug: "services", nom: "Services", emoji: "🔧" },
  { slug: "culture", nom: "Culture", emoji: "🎭" },
  { slug: "alimentaire", nom: "Alimentaire", emoji: "🥕" },
];

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreType, setFiltreType] = useState("tous");
  const [filtreCategorie, setFiltreCategorie] = useState("all");
  const [commune, setCommune] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.MarketplaceListing.filter({ statut: "actif" }, "-created_at", 60).catch(() => []);
      setListings(data);
      const cats = await base44.entities.MarketplaceCategory.filter({ actif: true }, "ordre", 20).catch(() => []);
      if (cats.length > 0) setCategories([{ slug: "all", nom: "Tout", emoji: "🌟" }, ...cats]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = listings.filter(l => {
    const matchSearch = !search || l.titre.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = filtreType === "tous" || l.type_annonce === filtreType;
    const matchCat = filtreCategorie === "all" || l.categorie_id === filtreCategorie;
    const matchCommune = !commune || l.commune.toLowerCase().includes(commune.toLowerCase());
    return matchSearch && matchType && matchCat && matchCommune;
  });

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* Hero */}
      <section className="border-b-2 border-ink/8" style={{ backgroundColor: "#63C7FF" }}>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-5 border-2 bg-white/60"
            style={{ borderColor: "#1D1836", color: "#1D1836" }}>
            🛍️ Marketplace · Pévèle Carembault
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-3" style={{ color: "#1D1836" }}>
            Achète, vends, échange<br />
            <span style={{ color: "#FF6A00" }}>entre voisins.</span>
          </h1>
          <p className="text-base font-medium mb-6 max-w-md" style={{ color: "#1D1836", opacity: 0.75 }}>
            La marketplace locale de la Pévèle — vente, services, dons, cours, troc. 8% de commission seulement, reversée à la plateforme citoyenne.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/marketplace"
              onClick={() => alert("Connectez-vous pour publier une annonce.")}
              className="inline-flex items-center gap-2 text-white font-black py-3 px-6 rounded-2xl shadow-lg transition-all hover:scale-105 text-sm"
              style={{ backgroundColor: "#FF6A00" }}>
              <Plus className="w-4 h-4" /> Publier une annonce
            </Link>
          </div>
        </div>
      </section>

      {/* Barre de recherche */}
      <div className="bg-white border-b-2 border-ink/8 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#1D1836", opacity: 0.4 }} />
            <input type="text" placeholder="Rechercher une annonce..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
              style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
          </div>
          <input type="text" placeholder="Commune..."
            value={commune} onChange={e => setCommune(e.target.value)}
            className="w-32 px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
            style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
        </div>
      </div>

      {/* Catégories */}
      <div className="bg-white border-b-2 border-ink/10 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2 flex-nowrap pb-3">
          {categories.map(cat => (
            <button key={cat.slug} onClick={() => setFiltreCategorie(cat.slug)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black border-2 transition-all"
              style={{
                backgroundColor: filtreCategorie === cat.slug ? "#FFD84D" : "white",
                borderColor: filtreCategorie === cat.slug ? "#1D1836" : "rgba(29,24,54,0.15)",
                color: "#1D1836"
              }}>
              {cat.emoji} {cat.nom}
            </button>
          ))}
        </div>
      </div>

      {/* Type filters */}
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-2 flex gap-2 overflow-x-auto">
        <button onClick={() => setFiltreType("tous")}
          className="shrink-0 px-4 py-1.5 rounded-full text-xs font-black border-2 transition-all"
          style={{ backgroundColor: filtreType === "tous" ? "#1D1836" : "white", borderColor: "#1D1836", color: filtreType === "tous" ? "white" : "#1D1836" }}>
          Tout
        </button>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setFiltreType(key)}
            className="shrink-0 px-4 py-1.5 rounded-full text-xs font-black border-2 transition-all"
            style={{
              backgroundColor: filtreType === key ? (TYPE_COLORS[key] ?? "#FFD84D") : "white",
              borderColor: filtreType === key ? "#1D1836" : "rgba(29,24,54,0.15)",
              color: "#1D1836"
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Sponsor */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <SponsorSlot rubrique="services" />
      </div>

      {/* Grille annonces */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-16">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
            <div className="text-4xl mb-3">🛍️</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Aucune annonce</h2>
            <p className="text-sm mb-4" style={{ color: "#1D1836", opacity: 0.6 }}>
              {search ? `Pas de résultat pour "${search}".` : "Soyez le premier à publier sur la marketplace !"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold mb-4" style={{ color: "#1D1836", opacity: 0.5 }}>{filtered.length} annonce{filtered.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map(listing => (
                <Link key={listing.id} to={`/marketplace/listing/${listing.id}`}
                  className="bg-white rounded-2xl border-2 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col"
                  style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                  {listing.images?.[0] ? (
                    <img loading="lazy" src={listing.images[0]} alt={listing.titre} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center text-4xl"
                      style={{ backgroundColor: TYPE_COLORS[listing.type_annonce] ?? "#f5f5f5" }}>
                      {TYPE_LABELS[listing.type_annonce]?.split(" ")[0] ?? "📦"}
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: TYPE_COLORS[listing.type_annonce] ?? "#e0e0e0", color: "#1D1836" }}>
                        {TYPE_LABELS[listing.type_annonce]}
                      </span>
                      <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>
                        {listing.commune}
                      </span>
                    </div>
                    <h3 className="font-black text-sm mb-1 line-clamp-2 flex-1" style={{ color: "#1D1836" }}>{listing.titre}</h3>
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      {listing.type_annonce === "don" ? (
                        <span className="text-base font-black" style={{ color: "#22c55e" }}>Gratuit 🎁</span>
                      ) : listing.prix ? (
                        <span className="text-base font-black" style={{ color: "#FF6A00" }}>
                          {listing.prix}€
                          {listing.prix_type && listing.prix_type !== "fixe" && (
                            <span className="text-xs font-medium ml-1" style={{ color: "#1D1836", opacity: 0.5 }}>/ {listing.prix_type}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm font-bold" style={{ color: "#1D1836", opacity: 0.5 }}>Prix sur demande</span>
                      )}
                      <span className="text-xs" style={{ color: "#1D1836", opacity: 0.4 }}>{listing.nb_vues ?? 0} vues</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
