import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ExternalLink } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// COMPOSANT SponsorSlot — Affiche les placements sponsors actifs
// CDC V4 Supernova §6.3 — Slots natifs dans les pages publiques
// Usage: <SponsorSlot rubrique="emploi" commune="Orchies" />
// ═══════════════════════════════════════════════════════════════════════

export default function SponsorSlot({ rubrique, commune, className = "" }) {
  const [placements, setPlacements] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadPlacements();
  }, [rubrique, commune]);

  const loadPlacements = async () => {
    try {
      const res = await base44.functions.invoke("manageSponsorSlot", {
        operation: "list_active",
        rubrique,
        commune: commune || undefined,
      });
      setPlacements(res.data?.placements || []);
    } catch {
      // Fallback silencieux — pas d'erreur visible pour le user
      setPlacements([]);
    } finally {
      setLoaded(true);
    }
  };

  const handleClick = async (placement) => {
    // Tracker le clic (non-bloquant)
    base44.functions.invoke("manageSponsorSlot", {
      operation: "track_click",
      placement_id: placement.id,
    }).catch(() => {});

    if (placement.cta_url) {
      window.open(placement.cta_url, "_blank", "noopener,noreferrer");
    }
  };

  if (!loaded || placements.length === 0) return null;

  // Afficher le premier placement valide
  const placement = placements[0];

  return (
    <div className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${className}`}
      style={{ borderColor: "rgba(255,106,0,0.2)", backgroundColor: "rgba(255,106,0,0.04)" }}>

      {/* Badge Partenaire */}
      <div className="shrink-0">
        {placement.logo_url ? (
          <img
            src={placement.logo_url}
            alt={placement.sponsor_nom || "Partenaire"}
            className="w-10 h-10 rounded-xl object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
            style={{ backgroundColor: "rgba(255,106,0,0.15)", color: "#FF6A00" }}>
            {(placement.sponsor_nom || placement.titre || "P").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Label Partenaire */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-black uppercase tracking-widest"
            style={{ color: "#FF6A00", opacity: 0.7 }}>
            📣 Partenaire local
          </span>
          {placement.sponsor_nom && (
            <span className="text-xs font-bold" style={{ color: "#1D1836", opacity: 0.5 }}>
              · {placement.sponsor_nom}
            </span>
          )}
        </div>

        <p className="font-black text-sm leading-tight mb-1" style={{ color: "#1D1836" }}>
          {placement.titre}
        </p>

        {placement.contenu && (
          <p className="text-xs leading-relaxed mb-2" style={{ color: "#1D1836", opacity: 0.6 }}>
            {placement.contenu}
          </p>
        )}

        {placement.cta_label && (
          <button
            onClick={() => handleClick(placement)}
            className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: "#FF6A00", color: "white" }}>
            {placement.cta_label}
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
