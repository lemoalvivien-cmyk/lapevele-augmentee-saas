import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import MairieGuard from "@/components/MairieGuard";
import { RefreshCw, Eye, MousePointer, CheckCircle, XCircle, TrendingUp } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// PAGE /mairie/sponsors — Gestion slots sponsors de la commune
// CDC V4 Supernova §4 — Phase 1
// ═══════════════════════════════════════════════════════════════════════

const STATUT_COLORS = {
  actif: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  en_attente: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  suspendu: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  expire: { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" },
};

const RUBRIQUES_LABELS = {
  emploi: "Emploi & Business",
  services: "Services",
  agenda: "Agenda",
  place_village: "Place du village",
  observatoire: "Observatoire",
  landing: "Landing page",
};

export default function SponsorsMairie() {
  const [placements, setPlacements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("manageSponsorSlot", { operation: "stats" });
      setStats(res.data?.stats);
      setPlacements(res.data?.placements || []);
    } catch (err) {
      // Fallback direct
      try {
        const list = await base44.entities.SponsorPlacement.filter({});
        setPlacements(list);
      } catch {}
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id) => {
    setActionLoading(id);
    try {
      await base44.functions.invoke("manageSponsorSlot", { operation: "validate", placement_id: id });
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (id) => {
    setActionLoading(id);
    try {
      await base44.functions.invoke("manageSponsorSlot", { operation: "suspend", placement_id: id });
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <MairieGuard>
      <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="max-w-5xl mx-auto px-4 py-10">

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1D1836" }}>Gestion des sponsors</h1>
              <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.5 }}>
                Validez et gérez les placements de partenaires locaux
              </p>
            </div>
            <button onClick={loadData} disabled={loading}
              className="p-2.5 rounded-xl border-2 transition-all hover:scale-105"
              style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836" }}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {error && (
            <div className="mb-6 px-5 py-3 rounded-xl text-sm font-bold border-2 border-red-300 bg-red-50 text-red-700">
              {error}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total placements" value={stats.total_placements} icon={<TrendingUp className="w-5 h-5" />} />
              <StatCard label="Actifs" value={stats.actifs} icon={<CheckCircle className="w-5 h-5 text-green-500" />} color="green" />
              <StatCard label="En attente" value={stats.en_attente} icon={<Eye className="w-5 h-5 text-yellow-500" />} color="yellow" />
              <StatCard label="Clics totaux" value={stats.total_clics} icon={<MousePointer className="w-5 h-5" />} />
            </div>
          )}

          {/* Placements en attente */}
          {placements.filter(p => p.statut === 'en_attente').length > 0 && (
            <div className="mb-6">
              <h2 className="font-black mb-3 flex items-center gap-2" style={{ color: "#1D1836" }}>
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
                En attente de validation ({placements.filter(p => p.statut === 'en_attente').length})
              </h2>
              <div className="space-y-3">
                {placements.filter(p => p.statut === 'en_attente').map(p => (
                  <PlacementCard
                    key={p.id} placement={p}
                    onValidate={() => handleValidate(p.id)}
                    onSuspend={() => handleSuspend(p.id)}
                    loading={actionLoading === p.id}
                    showActions
                  />
                ))}
              </div>
            </div>
          )}

          {/* Placements actifs */}
          <h2 className="font-black mb-3" style={{ color: "#1D1836" }}>
            Placements actifs ({placements.filter(p => p.statut === 'actif').length})
          </h2>
          {loading ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto" style={{ color: "#FF6A00" }} />
            </div>
          ) : placements.filter(p => p.statut === 'actif').length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border-2" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
              <p className="font-bold" style={{ color: "#1D1836", opacity: 0.5 }}>Aucun placement actif</p>
              <p className="text-sm mt-1" style={{ color: "#1D1836", opacity: 0.4 }}>
                Les candidatures sponsors arrivent via /sponsor
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {placements.filter(p => p.statut === 'actif').map(p => (
                <PlacementCard
                  key={p.id} placement={p}
                  onSuspend={() => handleSuspend(p.id)}
                  loading={actionLoading === p.id}
                />
              ))}
            </div>
          )}

          {/* Tous les autres */}
          {placements.filter(p => p.statut !== 'actif' && p.statut !== 'en_attente').length > 0 && (
            <div className="mt-6">
              <h2 className="font-black mb-3" style={{ color: "#1D1836", opacity: 0.6 }}>
                Historique ({placements.filter(p => p.statut !== 'actif' && p.statut !== 'en_attente').length})
              </h2>
              <div className="space-y-3">
                {placements.filter(p => p.statut !== 'actif' && p.statut !== 'en_attente').map(p => (
                  <PlacementCard key={p.id} placement={p} loading={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MairieGuard>
  );
}

function StatCard({ label, value, icon, color }) {
  const colorMap = { green: "bg-green-50", yellow: "bg-yellow-50" };
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${colorMap[color] || "bg-white"} border-2`}
      style={{ borderColor: "rgba(29,24,54,0.08)" }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: "#1D1836", opacity: 0.5 }}>
        {icon}
        <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl font-black" style={{ color: "#1D1836" }}>{value ?? "—"}</p>
    </div>
  );
}

function PlacementCard({ placement: p, onValidate, onSuspend, loading, showActions }) {
  const statut = p.statut || 'en_attente';
  const colors = STATUT_COLORS[statut] || STATUT_COLORS.en_attente;
  const ctr = p.impressions > 0 ? Math.round((p.clics / p.impressions) * 10000) / 100 : 0;

  return (
    <div className="bg-white rounded-2xl p-5 border-2 shadow-sm" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-sm" style={{ color: "#1D1836" }}>{p.titre || "Sans titre"}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
              {statut}
            </span>
          </div>
          <p className="text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>
            {RUBRIQUES_LABELS[p.rubrique] || p.rubrique} · {p.commune || "Toutes communes"}
            {p.sponsor_nom && ` · ${p.sponsor_nom}`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0 ml-4">
          <div className="text-center">
            <p className="font-black" style={{ color: "#1D1836" }}>{p.impressions || 0}</p>
            <p style={{ color: "#1D1836", opacity: 0.4 }}>Impressions</p>
          </div>
          <div className="text-center">
            <p className="font-black" style={{ color: "#1D1836" }}>{p.clics || 0}</p>
            <p style={{ color: "#1D1836", opacity: 0.4 }}>Clics</p>
          </div>
          <div className="text-center">
            <p className="font-black" style={{ color: "#FF6A00" }}>{ctr}%</p>
            <p style={{ color: "#1D1836", opacity: 0.4 }}>CTR</p>
          </div>
        </div>
      </div>

      {p.contenu && (
        <p className="text-sm mb-3" style={{ color: "#1D1836", opacity: 0.6 }}>{p.contenu}</p>
      )}

      {showActions && (
        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
          <button onClick={onValidate} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black text-white transition-all hover:scale-105 disabled:opacity-60"
            style={{ backgroundColor: "#16A34A" }}>
            <CheckCircle className="w-4 h-4" />
            {loading ? "…" : "Valider & Activer"}
          </button>
          <button onClick={onSuspend} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all hover:scale-105 disabled:opacity-60"
            style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836" }}>
            <XCircle className="w-4 h-4" />
            Rejeter
          </button>
        </div>
      )}

      {!showActions && statut === 'actif' && (
        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
          <button onClick={onSuspend} disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all hover:scale-105 disabled:opacity-60"
            style={{ borderColor: "rgba(220,38,38,0.3)", color: "#DC2626", backgroundColor: "rgba(220,38,38,0.05)" }}>
            Suspendre
          </button>
        </div>
      )}
    </div>
  );
}
