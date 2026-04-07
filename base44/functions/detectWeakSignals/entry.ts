/**
 * detectWeakSignals — Détection de signaux faibles territoriaux via analyse IA (L2)
 * Analyse les dossiers, événements, besoins B2B, ProspectionSignals pour détecter
 * des tendances émergentes et des opportunités pour les communes.
 */
import { base44 } from "@base44/sdk";

export default async function handler(req: any) {
  const { commune, periode_jours = 30 } = req.body ?? {};

  const since = new Date(Date.now() - periode_jours * 86400000).toISOString();

  // Collecte des données
  const [dossiers, besoins, signaux, evenements] = await Promise.all([
    base44.entities.Dossier.filter(
      commune ? { commune_slug: commune } : {}, "-created_at", 100
    ).catch(() => []),
    base44.entities.BusinessNeed.filter(
      commune ? { commune } : {}, "-created_at", 50
    ).catch(() => []),
    base44.entities.ProspectionSignal.filter(
      commune ? { commune } : {}, "-created_at", 50
    ).catch(() => []),
    base44.entities.EvenementLocal.filter({}, "-created_at", 50).catch(() => []),
  ]);

  // Analyse statistique locale (sans IA — L0)
  const dossiersRecents = dossiers.filter((d: any) => d.created_at >= since);
  const themesCounts: Record<string, number> = {};
  for (const d of dossiersRecents) {
    const t = d.theme ?? d.categorie ?? "autre";
    themesCounts[t] = (themesCounts[t] ?? 0) + 1;
  }
  const topThemes = Object.entries(themesCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const secteursBesoins = besoins.reduce((acc: any, b: any) => {
    acc[b.type_besoin] = (acc[b.type_besoin] ?? 0) + 1;
    return acc;
  }, {});

  const contexteSynthetise = `
Territoire: ${commune ?? "Pévèle Carembault"} — Analyse sur ${periode_jours} jours.
Dossiers récents: ${dossiersRecents.length} (top thèmes: ${topThemes.map(([t, n]) => `${t}:${n}`).join(", ")})
Besoins B2B actifs: ${besoins.length} (types: ${Object.entries(secteursBesoins).map(([k, v]) => `${k}:${v}`).join(", ")})
Nouveaux signaux BODACC: ${signaux.filter((s: any) => s.created_at >= since).length}
Événements planifiés: ${evenements.filter((e: any) => new Date(e.date_debut ?? e.date_heure) >= new Date()).length}
`.trim();

  // L2 — Claude Sonnet pour l'analyse des signaux faibles
  let signauxFaibles: string[] = [];
  let recommandations: string[] = [];

  try {
    const aiRes = await base44.functions.invoke("aiRouter", {
      mode: "detect_weak_signals",
      user_input: contexteSynthetise,
      commune: commune ?? "Pévèle Carembault",
    });
    const text = aiRes.data?.text ?? "";
    // Parse les sections du résultat IA
    const lignes = text.split("\n").filter((l: string) => l.trim());
    let section = "";
    for (const ligne of lignes) {
      if (ligne.toLowerCase().includes("signal")) { section = "signaux"; continue; }
      if (ligne.toLowerCase().includes("recommand")) { section = "recommandations"; continue; }
      const item = ligne.replace(/^[-•*\d.]\s*/, "").trim();
      if (!item) continue;
      if (section === "signaux") signauxFaibles.push(item);
      else if (section === "recommandations") recommandations.push(item);
    }
  } catch {
    // Fallback L0
    signauxFaibles = topThemes.map(([theme, count]) => `Hausse des signaux sur le thème "${theme}" (${count} dossiers récents)`);
    recommandations = ["Renforcer la communication sur les thèmes émergents", "Contacter les nouvelles entreprises BODACC pour leur proposer la plateforme"];
  }

  return {
    success: true,
    data: {
      commune: commune ?? "Pévèle Carembault",
      periode_jours,
      stats: {
        dossiers_recents: dossiersRecents.length,
        besoins_actifs: besoins.length,
        signaux_bodacc: signaux.length,
        top_themes: topThemes,
      },
      signaux_faibles: signauxFaibles.slice(0, 5),
      recommandations: recommandations.slice(0, 5),
    },
  };
}
