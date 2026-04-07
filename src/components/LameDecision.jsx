/**
 * LameDecision — Le composant Zero-Interface
 *
 * Affiche UNE seule action à l'utilisateur, calculée par le backend
 * computeActionQueue à partir du Graphe d'Intérêt Territorial.
 *
 * Principe : pas de menu, pas de paralysie. Un verbe, un CTA, point.
 * Cache local 15 min + invalidation sur emitSignal.
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CACHE_KEY = "lame_decision_cache_v1";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expires_at || parsed.expires_at < Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function saveToCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, expires_at: Date.now() + CACHE_TTL_MS })
    );
  } catch {
    /* ignore quota errors */
  }
}

export default function LameDecision({ commune, geo_lat, geo_lng, compact = false }) {
  const [data, setData] = useState(() => loadFromCache());
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);

  const fetchLame = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadFromCache();
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("computeActionQueue", {
        commune,
        geo_lat,
        geo_lng,
      });
      const payload = res?.data ?? res;
      if (!payload?.success) throw new Error(payload?.error ?? "Erreur");
      setData(payload);
      saveToCache(payload);
    } catch (e) {
      setError(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }, [commune, geo_lat, geo_lng]);

  useEffect(() => {
    fetchLame(false);
  }, [fetchLame]);

  if (loading && !data) {
    return (
      <div className={`bg-white rounded-3xl border-2 border-ink/10 p-6 ${compact ? "" : "shadow-lg"}`}>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#FF6A00" }} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white rounded-3xl border-2 border-ink/10 p-6">
        <p className="text-sm font-medium text-center" style={{ color: "#1D1836", opacity: 0.6 }}>
          Aucune action prioritaire pour le moment.
        </p>
      </div>
    );
  }

  const lame = data?.lame;
  if (!lame) return null;

  return (
    <div
      className={`bg-white rounded-3xl border-2 p-6 transition-all hover:scale-[1.01] ${compact ? "" : "shadow-lg"}`}
      style={{ borderColor: "#FF6A0033" }}
    >
      {/* Badge IA */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4" style={{ color: "#FF6A00" }} />
        <span className="text-xs font-black uppercase tracking-wider" style={{ color: "#FF6A00" }}>
          Pour vous, maintenant
        </span>
        <button
          type="button"
          onClick={() => fetchLame(true)}
          className="ml-auto text-xs opacity-50 hover:opacity-100"
          aria-label="Rafraîchir la suggestion"
          title="Rafraîchir"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Verbe + icône */}
      <div className="flex items-start gap-4 mb-4">
        <div className="text-4xl shrink-0" aria-hidden="true">{lame.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.45 }}>
            {lame.verb}
          </p>
          <p className="text-lg font-black leading-tight" style={{ color: "#1D1836" }}>
            {lame.title}
          </p>
        </div>
      </div>

      {/* CTA + ignore */}
      <div className="flex items-center gap-3">
        <Link
          to={lame.href}
          className="flex-1 text-center text-white font-black py-3 px-5 rounded-2xl shadow"
          style={{ backgroundColor: "#FF6A00" }}
        >
          {lame.cta}
        </Link>
        <button
          type="button"
          onClick={() => fetchLame(true)}
          className="text-xs font-bold underline opacity-60 hover:opacity-100"
          style={{ color: "#1D1836" }}
        >
          Plus tard
        </button>
      </div>

      {/* Fallbacks discrets — affichés en mode non-compact */}
      {!compact && data?.fallbacks?.length > 0 && (
        <div className="mt-5 pt-4 border-t border-ink/10">
          <p className="text-xs font-bold mb-2" style={{ color: "#1D1836", opacity: 0.4 }}>
            Sinon :
          </p>
          <div className="flex flex-col gap-2">
            {data.fallbacks.map((f) => (
              <Link
                key={f.id}
                to={f.href}
                className="text-sm font-bold underline opacity-70 hover:opacity-100"
                style={{ color: "#1D1836" }}
              >
                {f.icon} {f.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
