import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Loader2, Sparkles, Trophy, Users, AlertTriangle, TrendingUp } from "lucide-react";
import MairieGuard from "@/components/MairieGuard";

const typeEmoji = { signaler: "🚨", proposer: "💡", aider: "🤝" };
const prioriteColor = { urgente: "text-red-600", haute: "text-orange-500", normale: "text-blue-600", basse: "text-gray-500" };
const statutLabels = { nouveau: "Nouveau", qualifie: "Qualifié", en_cours: "En cours", resolu: "Résolu", rejete: "Rejeté" };
const statutColors = {
  nouveau: "bg-blue-100 text-blue-700", qualifie: "bg-purple-100 text-purple-700",
  en_cours: "bg-yellow-100 text-yellow-700", resolu: "bg-green-100 text-green-700", rejete: "bg-gray-100 text-gray-600",
};

export default function TableauDeBord() {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState([]);
  const [victories, setVictories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [communeSlug, setCommuneSlug] = useState(null);
  const [digest, setDigest] = useState("");
  const [digestLoading, setDigestLoading] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoadError(null);
    try {
      const [dosRes, vicRes] = await Promise.all([
        base44.functions.invoke('getMairieData', { operation: 'dossiers', params: { sort: '-created_date', limit: 200 } }),
        base44.functions.invoke('getMairieData', { operation: 'victories', params: { statut: 'brouillon', limit: 1 } }),
      ]);
      setDossiers(dosRes.data.dossiers || []);
      setVictories(vicRes.data.victories || []);
      setCommuneSlug(dosRes.data.commune || (user?.role === 'admin' ? 'Toutes communes' : ''));
      // Fire-and-forget : purge RGPD non-bloquante (échoue silencieusement pour les non-admins)
      base44.functions.invoke('purgeExpiredData', {}).catch(() => {});
    } catch {
      setLoadError("Erreur de chargement. Réessayez.");
    }
    setLoading(false);
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    nouveau: dossiers.filter(d => d.statut === "nouveau").length,
    aQualifier: dossiers.filter(d => d.ai_needs_review && d.statut !== "resolu" && d.statut !== "rejete").length,
    enCours: dossiers.filter(d => d.statut === "en_cours").length,
    resolusMois: dossiers.filter(d => d.statut === "resolu" && d.resolved_at && new Date(d.resolved_at) >= startOfMonth).length,
  };

  // Temps moyen résolution (jours)
  const resolus = dossiers.filter(d => d.statut === "resolu" && d.resolved_at && d.created_date);
  const tempsMoyen = resolus.length
    ? Math.round(resolus.reduce((acc, d) => acc + (new Date(d.resolved_at) - new Date(d.created_date)) / 86400000, 0) / resolus.length)
    : null;

  // Satisfaction moyenne
  const avecNote = dossiers.filter(d => d.note_satisfaction);
  const satisfactionMoy = avecNote.length
    ? (avecNote.reduce((acc, d) => acc + d.note_satisfaction, 0) / avecNote.length).toFixed(1)
    : null;

  // Sujets chauds : non résolus, haute/urgente priorité
  const sujetsChauds = dossiers
    .filter(d => ["urgente", "haute"].includes(d.priorite) && !["resolu", "rejete"].includes(d.statut))
    .slice(0, 5);

  // Participation locale (aider + proposer récents)
  const participation = dossiers
    .filter(d => ["proposer", "aider"].includes(d.type_action))
    .slice(0, 4);

  // Dossiers récents
  const recents = dossiers.filter(d => d.statut !== "resolu").slice(0, 6);

  const genererDigest = async () => {
    setDigestLoading(true);
    const lines = dossiers.slice(0, 20).map(d =>
      `- ${typeEmoji[d.type_action]} [${statutLabels[d.statut]}] ${d.titre_public}${d.priorite === "urgente" ? " ⚠️ URGENT" : ""}`
    ).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es assistant pour une mairie française. Voici les derniers dossiers citoyens :\n${lines}\n\nRédige un point du jour en 4-5 phrases, chaleureux et factuel, à destination des agents et élus. Commence par "Bonjour," et reste concis. Mets en avant les urgences si besoin.`,
    });
    setDigest(res);
    setDigestLoading(false);
  };

  return (
    <MairieGuard>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary">Tableau de bord</h1>
              <p className="text-muted-foreground">{communeSlug || (user?.role === "admin" ? "Toutes communes" : "Chargement…")}</p>
            </div>
            <div className="flex gap-3">
              <Link to="/mairie/dossiers" className="border-2 border-border text-foreground font-semibold py-3 px-5 rounded-xl text-sm hover:bg-secondary transition-colors">
                Tous les dossiers
              </Link>
              <Link to="/mairie/place-du-village" className="bg-accent text-accent-foreground font-bold py-3 px-5 rounded-xl text-sm">
                Publier
              </Link>
            </div>
          </div>

          {loadError && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">{loadError}</div>}

          {loading ? (
            <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : (
            <div className="space-y-8">

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KPI label="Nouveaux" val={stats.nouveau} bg="bg-blue-50" color="text-blue-700" />
                <KPI label="À réviser" val={stats.aQualifier} bg={stats.aQualifier > 0 ? "bg-orange-50" : "bg-secondary"} color={stats.aQualifier > 0 ? "text-orange-700" : "text-muted-foreground"} icon={stats.aQualifier > 0 ? "⚠️" : null} />
                <KPI label="En cours" val={stats.enCours} bg="bg-yellow-50" color="text-yellow-700" />
                <KPI label="Résolus ce mois" val={stats.resolusMois} bg="bg-green-50" color="text-green-700" />
                <KPI label="Délai moyen" val={tempsMoyen !== null ? `${tempsMoyen}j` : "–"} bg="bg-secondary" color="text-foreground" />
                <KPI label="Satisfaction" val={satisfactionMoy ? `${satisfactionMoy}/5 ⭐` : "–"} bg="bg-secondary" color="text-foreground" />
              </div>

              {/* Point du jour IA */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <Sparkles className="w-5 h-5" /> Point du jour
                  </div>
                  <button onClick={genererDigest} disabled={digestLoading}
                    className="bg-primary text-primary-foreground font-semibold py-2 px-5 rounded-lg text-sm disabled:opacity-60">
                    {digestLoading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Génération…</span> : "Générer"}
                  </button>
                </div>
                {digest ? (
                  <p className="text-sm leading-relaxed bg-card border border-border rounded-xl p-4 whitespace-pre-line">{digest}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Cliquez sur "Générer" pour obtenir un résumé IA de l'activité du jour.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Sujets chauds */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 font-bold text-primary mb-4">
                    <AlertTriangle className="w-5 h-5 text-orange-500" /> Sujets chauds
                  </div>
                  {sujetsChauds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun sujet urgent en attente. ✅</p>
                  ) : (
                    <div className="space-y-2">
                      {sujetsChauds.map(d => (
                        <Link key={d.id} to={`/mairie/dossiers/${d.id}`}
                          className="flex items-start gap-3 hover:bg-secondary rounded-lg p-2 transition-colors">
                          <span className="text-xl shrink-0">{typeEmoji[d.type_action]}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-primary truncate">{d.titre_public}</p>
                            <p className={`text-xs font-bold ${prioriteColor[d.priorite]}`}>
                              {d.priorite === "urgente" ? "🔴" : "🟡"} {d.priorite} · {d.commune}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dernière victoire publiable */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 font-bold text-primary mb-4">
                    <Trophy className="w-5 h-5 text-yellow-500" /> Dernière victoire publiable
                  </div>
                  {victories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune carte victoire en attente. Résolvez des dossiers pour en générer !</p>
                  ) : (
                    <div>
                      <p className="font-semibold text-primary mb-1">{victories[0].titre}</p>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{victories[0].resume}</p>
                      {victories[0].chiffre_cle && (
                        <span className="inline-block bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
                          {victories[0].chiffre_cle}
                        </span>
                      )}
                      <Link to="/mairie/preuves" className="block text-sm text-accent underline font-medium">
                        Voir toutes les victoires →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Signes de participation locale */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 font-bold text-primary mb-4">
                  <Users className="w-5 h-5 text-accent" /> Derniers signes de participation
                </div>
                {participation.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune idée ou offre d'aide récente.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {participation.map(d => (
                      <Link key={d.id} to={`/mairie/dossiers/${d.id}`}
                        className="flex items-start gap-3 border border-border rounded-xl p-3 hover:bg-secondary transition-colors">
                        <span className="text-2xl shrink-0">{typeEmoji[d.type_action]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary truncate">{d.titre_public}</p>
                          <p className="text-xs text-muted-foreground">{d.commune} · {new Date(d.created_date).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Dossiers actifs récents */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-primary text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" /> Dossiers actifs
                  </h2>
                  <Link to="/mairie/dossiers" className="text-sm text-primary underline font-medium">Voir tout →</Link>
                </div>
                <div className="space-y-2">
                  {recents.map(d => (
                    <Link key={d.id} to={`/mairie/dossiers/${d.id}`}
                      className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <span className="text-2xl shrink-0">{typeEmoji[d.type_action]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statutColors[d.statut]}`}>
                            {statutLabels[d.statut]}
                          </span>
                          {d.priorite === "urgente" && <span className="text-xs font-bold text-red-600">🔴 Urgent</span>}
                          {d.ai_needs_review && <span className="text-xs font-bold text-orange-600">⚠️ À réviser</span>}
                        </div>
                        <p className="font-semibold text-primary truncate">{d.titre_public}</p>
                        <p className="text-xs text-muted-foreground">{d.commune} · {d.categorie} · {new Date(d.created_date).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground shrink-0">#{d.id.slice(-6).toUpperCase()}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MairieGuard>
  );
}

// eslint-disable-next-line no-unused-vars
function KPI({ label, val, bg, color, icon }) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center border border-border`}>
      <div className={`text-2xl font-extrabold ${color}`}>{val}</div>
      <div className="text-xs text-muted-foreground mt-1 font-medium leading-snug">{label}</div>
    </div>
  );
}