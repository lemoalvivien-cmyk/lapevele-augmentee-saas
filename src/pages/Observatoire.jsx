import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

export default function Observatoire() {
  const [stats, setStats] = useState(null);
  const [communes, setCommunes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [statsRes, comRes] = await Promise.all([
        base44.functions.invoke('getObservatoireStats', {}).catch(() => ({ data: {} })),
        base44.entities.Commune.filter({ statut: "active" }, "nom").catch(() => []),
      ]);
      setStats(statsRes.data || {});
      setCommunes(comRes);
    } finally {
      setLoading(false);
    }
  };

  const s = stats || {};
  const topCats = Object.entries(s.topCats || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = topCats[0]?.[1] || 1;
  const topCommunes = Object.entries(s.topCommunes || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCom = topCommunes[0]?.[1] || 1;
  const appelsActifs = s.appelsActifs || [];
  const appelsRecents = appelsActifs;
  const victoiresMois = s.victoiresMois || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* ─── HEADER ─── */}
      <div className="px-4 pt-14 pb-10 text-center border-b-2 border-ink/8">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-5 border-2"
            style={{ backgroundColor: "#FFD84D", borderColor: "#1D1836", color: "#1D1836" }}>
            📊 Observatoire du territoire · Pévèle Carembault
          </div>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-3" style={{ color: "#1D1836" }}>
            Ce qui se passe vraiment<br className="hidden sm:block" /> dans votre territoire
          </h1>
          <p className="text-base font-medium" style={{ color: "#1D1836", opacity: 0.55 }}>
            Données publiques réelles · Aucune promesse sans preuve.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-14">

        {/* ─── SECTION 1 : VUE D'ENSEMBLE ─── */}
        <section>
          <SectionHeader emoji="🔭" title="Vue d'ensemble" subtitle="Chiffres issus des publications publiques" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatTile val={s.total ?? 0} label="Publications publiques" color="#63C7FF" />
            <StatTile val={s.victoires ?? 0} label="Victoires publiées" color="#B8F5C4" />
            <StatTile val={s.appelsAide ?? 0} label="Appels d'aide" color="#FFD84D" />
            <StatTile val={communes.length} label="Communes actives" color="#FF6FB5" />
            <StatTile val={s.postsMois ?? 0} label="Publications ce mois" color="#FFF0E0" small />
            <StatTile val={s.postsSemaine ?? 0} label="Cette semaine" color="#FFF0E0" small />
          </div>
        </section>

        {/* ─── SECTION 2 : CE QUI REMONTE ─── */}
        <section>
          <SectionHeader emoji="📌" title="Ce qui remonte le plus" subtitle="Sujets les plus représentés dans les publications" />
          {topCats.length === 0 ? (
            <EmptyNote msg="Pas encore assez de données pour identifier des tendances." />
          ) : (
            <div className="bg-white rounded-2xl border-2 border-ink/10 p-5 space-y-3">
              {topCats.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm font-bold w-36 shrink-0 capitalize" style={{ color: "#1D1836" }}>{cat}</span>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(29,24,54,0.06)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(4, (count / maxCat) * 100)}%`, backgroundColor: "#FF6A00" }} />
                  </div>
                  <span className="text-sm font-black w-8 text-right shrink-0" style={{ color: "#FF6A00" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── SECTION 3 : CE QUI AVANCE ─── */}
        <section>
          <SectionHeader emoji="🙋" title="Appels à l'aide actifs" subtitle={`${appelsActifs.length} appel${appelsActifs.length !== 1 ? "s" : ""} en attente de réponse`} />
          {appelsActifs.length === 0 ? (
            <EmptyNote msg="Aucun appel à l'aide publié en ce moment." />
          ) : (
            <div className="space-y-3">
              {appelsActifs.map(post => (
                <div key={post.id} className="bg-white rounded-2xl border-2 border-ink/10 p-4 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xs font-black px-2 py-1 rounded-full shrink-0"
                      style={{ backgroundColor: "#63C7FF", color: "#1D1836" }}>🙋 En attente</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-snug truncate" style={{ color: "#1D1836" }}>{post.titre}</p>
                      {post.commune && <p className="text-xs mt-0.5" style={{ color: "#1D1836", opacity: 0.45 }}>📍 {post.commune}</p>}
                    </div>
                  </div>
                  <Link to="/place-du-village"
                    className="text-xs font-bold px-3 py-2 rounded-lg shrink-0 transition-all hover:shadow-sm"
                    style={{ backgroundColor: "#FF6A00", color: "white" }}>
                    Voir →
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-center">
            <Link to="/place-du-village"
              className="inline-block text-sm font-bold px-5 py-2.5 rounded-full border-2 bg-white transition-all hover:shadow-md"
              style={{ borderColor: "#FF6A00", color: "#FF6A00" }}>
              Voir toutes les actions en cours
            </Link>
          </div>
        </section>

        {/* ─── SECTION 4 : CE QUI A ABOUTI ─── */}
        <section>
          <SectionHeader emoji="🏆" title="Ce qui a abouti" subtitle={`${s.victoires ?? 0} victoire${(s.victoires ?? 0) !== 1 ? "s" : ""} publiées · ${victoiresMois.length} ce mois`} />
          {(s.victoires ?? 0) === 0 ? (
            <EmptyNote msg="Les premières réussites seront visibles ici dès qu'elles seront publiées." />
          ) : (
            <>
              {victoiresMois.length > 0 && (
                <div className="space-y-3 mb-4">
                  {victoiresMois.slice(0, 4).map(post => (
                    <div key={post.id} className="bg-white rounded-2xl border-2 border-ink/10 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                      <span className="text-xl shrink-0">🏆</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black leading-snug" style={{ color: "#1D1836" }}>{post.titre}</p>
                        {post.commune && <p className="text-xs mt-0.5" style={{ color: "#1D1836", opacity: 0.45 }}>📍 {post.commune}</p>}
                      </div>
                      {post.published_at && (
                        <span className="text-xs shrink-0" style={{ color: "#1D1836", opacity: 0.35 }}>
                          {new Date(post.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-white rounded-2xl border-2 border-ink/10 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-3xl font-black" style={{ color: "#FF6A00" }}>{s.victoires ?? 0}</p>
                  <p className="text-sm font-medium" style={{ color: "#1D1836", opacity: 0.65 }}>
                    victoires publiées depuis le lancement
                  </p>
                </div>
                <Link to="/place-du-village"
                  className="text-sm font-bold px-4 py-2.5 rounded-xl border-2 shrink-0"
                  style={{ borderColor: "#FFD84D", color: "#1D1836", backgroundColor: "#FFD84D" }}>
                  Voir les victoires
                </Link>
              </div>
            </>
          )}
        </section>

        {/* ─── SECTION 5 : OÙ ÇA BOUGE ─── */}
        <section>
          <SectionHeader emoji="📍" title="Où ça bouge le plus" subtitle="Communes les plus actives (volume de publications)" />
          {topCommunes.length === 0 ? (
            <EmptyNote msg="Pas encore assez de données géographiques." />
          ) : (
            <div className="bg-white rounded-2xl border-2 border-ink/10 p-5 space-y-3">
              {topCommunes.map(([slug, count], i) => {
                const com = communes.find(c => c.slug === slug);
                const nom = com?.nom || slug;
                return (
                  <div key={slug} className="flex items-center gap-3">
                    <span className="text-sm font-black w-5 shrink-0 text-right" style={{ color: "#1D1836", opacity: 0.35 }}>
                      {i + 1}
                    </span>
                    <Link to={`/commune/${slug}`}
                      className="text-sm font-bold w-32 shrink-0 hover:underline truncate"
                      style={{ color: "#1D1836" }}>
                      {nom}
                    </Link>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(29,24,54,0.06)" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.max(4, (count / maxCom) * 100)}%`, backgroundColor: "#FFD84D" }} />
                    </div>
                    <span className="text-sm font-black w-8 text-right shrink-0" style={{ color: "#1D1836" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── SECTION 6 : CE QUI MÉRITE UNE ACTION ─── */}
        <section>
          <SectionHeader emoji="⚠️" title="Ce qui mérite une réponse" subtitle="Appels à l'aide récents sans suite connue" />
          {appelsRecents.length === 0 ? (
            <EmptyNote msg="Aucun appel sans réponse en ce moment. Bonne nouvelle." />
          ) : (
            <div className="space-y-3">
              {appelsRecents.map(post => (
                <div key={post.id} className="bg-white rounded-2xl border-2 p-4"
                  style={{ borderColor: "rgba(29,24,54,0.1)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-black px-2 py-0.5 rounded-full inline-block mb-1"
                        style={{ backgroundColor: "#63C7FF", color: "#1D1836" }}>
                        🙋 Cherche un coup de main
                      </span>
                      <p className="text-sm font-black leading-snug" style={{ color: "#1D1836" }}>{post.titre}</p>
                      {post.commune && <p className="text-xs mt-0.5 capitalize" style={{ color: "#1D1836", opacity: 0.45 }}>📍 {post.commune}</p>}
                    </div>
                    <Link to="/agir"
                      className="text-xs font-bold px-3 py-2 rounded-lg shrink-0 text-white"
                      style={{ backgroundColor: "#FF6A00" }}>
                      Aider
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 bg-white rounded-2xl border-2 border-ink/10 p-5 text-center">
            <p className="text-sm font-bold mb-1" style={{ color: "#1D1836" }}>
              Vous voyez quelque chose qui manque ?
            </p>
            <p className="text-xs mb-4" style={{ color: "#1D1836", opacity: 0.55 }}>
              Signalez, proposez, aidez — directement à votre commune.
            </p>
            <Link to="/agir"
              className="inline-block text-white font-black py-3 px-6 rounded-full shadow-md transition-all hover:scale-105"
              style={{ backgroundColor: "#FF6A00" }}>
              Agir maintenant 🙋
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}

function StatTile({ val, label, color, small }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-ink/10 p-4 text-center hover:shadow-sm transition-shadow"
      style={{ borderTopWidth: "3px", borderTopColor: color }}>
      <p className={`font-black ${small ? "text-2xl" : "text-3xl"} mb-1`} style={{ color: "#1D1836" }}>{val}</p>
      <p className="text-xs font-medium leading-snug" style={{ color: "#1D1836", opacity: 0.55 }}>{label}</p>
    </div>
  );
}

function EmptyNote({ msg }) {
  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-ink/10 p-6 text-center">
      <p className="text-sm" style={{ color: "#1D1836", opacity: 0.45 }}>{msg}</p>
    </div>
  );
}