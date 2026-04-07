import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, Eye, ArrowLeft, ShoppingCart, MessageCircle, AlertCircle } from "lucide-react";
import { emitSignal } from "@/lib/emitSignal";

const TYPE_LABELS = {
  vente: "🛒 Vente", service: "⚙️ Service", location: "🔑 Location",
  don: "🎁 Don", cours: "📚 Cours", troc: "🔄 Troc"
};
const TYPE_COLORS = {
  vente: "#FFD84D", service: "#63C7FF", location: "#FF6FB5",
  don: "#B8F5C4", cours: "#FF6A00", troc: "#e0e0e0"
};

export default function MarketplaceListingPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState([]);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [contactForm, setContactForm] = useState({ email: "", message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.MarketplaceListing.filter({ id }).catch(() => []);
      const item = items[0];
      setListing(item);
      if (item) {
        // Incrémenter vues
        await base44.entities.MarketplaceListing.update(id, { nb_vues: (item.nb_vues ?? 0) + 1 }).catch(() => {});
        // Annonces similaires
        const sim = await base44.entities.MarketplaceListing.filter(
          { type_annonce: item.type_annonce, statut: "actif" }, "-created_at", 4
        ).catch(() => []);
        setSimilar(sim.filter(s => s.id !== id).slice(0, 3));
        emitSignal({
          type: "consulte",
          target_type: "marketplace_listing",
          target_id: id,
          commune: item.commune,
          topic_tags: [item.type_annonce].filter(Boolean),
          weight: 0.2,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    setBuying(true);
    setBuyError(null);
    try {
      const res = await base44.functions.invoke("processMarketplaceTx", {
        operation: "create_checkout",
        listing_id: id,
        buyer_email: contactForm.email || undefined,
      });
      if (res.data?.checkout_url) {
        emitSignal({
          type: "achete",
          target_type: "marketplace_listing",
          target_id: id,
          commune: listing?.commune,
          topic_tags: [listing?.type_annonce].filter(Boolean),
          weight: 0.9,
        });
        window.location.href = res.data.checkout_url;
      } else if (res.data?.degraded) {
        setBuyError("Paiement en ligne non disponible. Contactez directement le vendeur via le formulaire ci-dessous.");
      } else {
        setBuyError(res.data?.error ?? "Erreur lors de la création du paiement.");
      }
    } catch (err) {
      setBuyError(err.message);
    } finally {
      setBuying(false);
    }
  };

  const handleContact = async (e) => {
    e.preventDefault();
    if (!contactForm.email || !contactForm.message) return;
    setContactSending(true);
    try {
      await base44.functions.invoke("sendLeadEmail", {
        to: listing.user_id,
        subject: `💬 Message via Marketplace — "${listing.titre}"`,
        body: `Email acheteur : ${contactForm.email}\n\nMessage :\n${contactForm.message}`,
        template: "marketplace_contact",
      }).catch(() => {});
      await base44.entities.MarketplaceListing.update(id, { nb_contacts: (listing.nb_contacts ?? 0) + 1 }).catch(() => {});
      setContactSent(true);
    } finally {
      setContactSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
    </div>;
  }

  if (!listing) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="text-center p-8">
        <div className="text-4xl mb-3">😕</div>
        <h2 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Annonce introuvable</h2>
        <Link to="/marketplace" className="text-sm font-bold text-orange-500 hover:underline">← Retour à la marketplace</Link>
      </div>
    </div>;
  }

  const images = listing.images ?? [];
  const isFree = listing.type_annonce === "don" || !listing.prix || listing.prix === 0;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-bold mb-6 hover:underline" style={{ color: "#FF6A00" }}>
          <ArrowLeft className="w-4 h-4" /> Marketplace
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Photos */}
          <div>
            {images.length > 0 ? (
              <>
                <img loading="lazy" src={images[activeImage]} alt={listing.titre}
                  className="w-full aspect-square object-cover rounded-2xl border-2"
                  style={{ borderColor: "rgba(29,24,54,0.08)" }} />
                {images.length > 1 && (
                  <div className="flex gap-2 mt-3">
                    {images.map((img, i) => (
                      <button key={i} onClick={() => setActiveImage(i)}
                        className="w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
                        style={{ borderColor: i === activeImage ? "#FF6A00" : "rgba(29,24,54,0.1)" }}>
                        <img loading="lazy" src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full aspect-square rounded-2xl border-2 flex items-center justify-center text-6xl"
                style={{ borderColor: "rgba(29,24,54,0.08)", backgroundColor: TYPE_COLORS[listing.type_annonce] ?? "#f5f5f5" }}>
                {TYPE_LABELS[listing.type_annonce]?.split(" ")[0] ?? "📦"}
              </div>
            )}
          </div>

          {/* Infos & CTA */}
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-black px-3 py-1 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[listing.type_annonce] ?? "#e0e0e0", color: "#1D1836" }}>
                {TYPE_LABELS[listing.type_annonce]}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>
                <Eye className="w-3 h-3" /> {listing.nb_vues ?? 0} vues
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black mb-2" style={{ color: "#1D1836" }}>{listing.titre}</h1>

            <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: "#1D1836", opacity: 0.6 }}>
              <MapPin className="w-4 h-4" /> {listing.commune}
            </div>

            {/* Prix */}
            {isFree ? (
              <div className="text-3xl font-black mb-4" style={{ color: "#22c55e" }}>Gratuit 🎁</div>
            ) : (
              <div className="mb-4">
                <span className="text-3xl font-black" style={{ color: "#FF6A00" }}>{listing.prix}€</span>
                {listing.prix_type && listing.prix_type !== "fixe" && (
                  <span className="text-base font-medium ml-2" style={{ color: "#1D1836", opacity: 0.6 }}>/ {listing.prix_type}</span>
                )}
                {listing.prix_type === "negociable" && (
                  <span className="ml-2 text-xs font-black px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Négociable</span>
                )}
              </div>
            )}

            {/* Description */}
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#1D1836", opacity: 0.8 }}>{listing.description}</p>

            {/* Tags */}
            {listing.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {listing.tags.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100" style={{ color: "#1D1836", opacity: 0.7 }}>#{tag}</span>
                ))}
              </div>
            )}

            {buyError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{buyError}</p>
              </div>
            )}

            {/* CTA achat / contact */}
            {listing.statut === "actif" && (
              <div className="space-y-3">
                {!isFree && (
                  <button onClick={handleBuy} disabled={buying}
                    className="w-full flex items-center justify-center gap-2 text-white font-black py-4 rounded-2xl text-sm transition-all hover:scale-105 disabled:opacity-60 shadow-lg"
                    style={{ backgroundColor: "#FF6A00" }}>
                    {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    {buying ? "Chargement..." : `Acheter — ${listing.prix}€`}
                  </button>
                )}
                {!contactSent ? (
                  <form onSubmit={handleContact} className="bg-white rounded-2xl border-2 p-4 space-y-3"
                    style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                    <p className="text-xs font-bold" style={{ color: "#1D1836" }}>
                      <MessageCircle className="w-3 h-3 inline mr-1" />
                      {isFree ? "Contacter pour récupérer" : "Poser une question"}
                    </p>
                    <input type="email" required placeholder="Votre email" value={contactForm.email}
                      onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border-2 rounded-xl p-2.5 text-sm focus:outline-none"
                      style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                    <textarea rows={3} required placeholder="Votre message..." value={contactForm.message}
                      onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full border-2 rounded-xl p-2.5 text-sm focus:outline-none resize-none"
                      style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                    <button type="submit" disabled={contactSending}
                      className="w-full font-black py-2.5 rounded-xl text-sm border-2 transition-all hover:shadow-md disabled:opacity-60"
                      style={{ borderColor: "#1D1836", color: "#1D1836" }}>
                      {contactSending ? "Envoi..." : "Envoyer le message"}
                    </button>
                  </form>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-sm font-bold text-green-800">✅ Message envoyé ! Le vendeur vous répondra par email.</p>
                  </div>
                )}
              </div>
            )}

            {listing.statut !== "actif" && (
              <div className="bg-gray-100 rounded-2xl p-4 text-center">
                <p className="text-sm font-bold" style={{ color: "#1D1836", opacity: 0.6 }}>
                  Cette annonce n'est plus disponible.
                </p>
              </div>
            )}

            <p className="text-xs text-center mt-4" style={{ color: "#1D1836", opacity: 0.4 }}>
              Commission 8% plateforme · Paiement sécurisé Stripe
            </p>
          </div>
        </div>

        {/* Annonces similaires */}
        {similar.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-black mb-4" style={{ color: "#1D1836" }}>Annonces similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {similar.map(s => (
                <Link key={s.id} to={`/marketplace/listing/${s.id}`}
                  className="bg-white rounded-2xl border-2 p-4 hover:shadow-md transition-all flex flex-col gap-2"
                  style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full self-start"
                    style={{ backgroundColor: TYPE_COLORS[s.type_annonce] ?? "#e0e0e0", color: "#1D1836" }}>
                    {TYPE_LABELS[s.type_annonce]}
                  </span>
                  <h3 className="font-black text-sm" style={{ color: "#1D1836" }}>{s.titre}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black" style={{ color: "#FF6A00" }}>
                      {s.type_annonce === "don" ? "Gratuit" : s.prix ? `${s.prix}€` : "Sur demande"}
                    </span>
                    <span className="text-xs" style={{ color: "#1D1836", opacity: 0.4 }}>{s.commune}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
