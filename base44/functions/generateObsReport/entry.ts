/**
 * generateObsReport — Génère un rapport d'observatoire territorial (L2/L3 selon type)
 * Collecte toutes les données disponibles et appelle aiRouter en mode generate_obs_report.
 * Sauvegarde dans ObservatoryReport.
 */
import { base44 } from "@base44/sdk";

export default async function handler(req: any) {
  const { commune, type_rapport = "mensuel", periode } = req.body ?? {};
  const user_id = req.user?.id ?? "system";

  if (!commune) return { success: false, error: "commune requis" };

  const now = new Date();
  const periodeLabel = periode ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Vérifier doublon
  const existing = await base44.entities.ObservatoryReport.filter({
    commune, periode: periodeLabel, type_rapport
  }).catch(() => []);
  if (existing[0]) {
    return { success: true, data: existing[0], cached: true, message: "Rapport déjà généré pour cette période." };
  }

  // Collecter stats
  const [dossiers, evenements, besoins, introductions, revEvents] = await Promise.all([
    base44.entities.Dossier.filter({ commune_slug: commune }, "-created_at", 200).catch(() => []),
    base44.entities.EvenementLocal.filter({}, "-created_at", 100).catch(() => []),
    base44.entities.BusinessNeed.filter({ commune }, "-created_at", 100).catch(() => []),
    base44.entities.Introduction.filter({}, "-created_at", 100).catch(() => []),
    base44.entities.RevenueEvent.filter({}, "-created_at", 100).catch(() => []),
  ]);

  const resolus = dossiers.filter((d: any) => ["resolu", "clos"].includes(d.statut));
  const tauxResolution = dossiers.length > 0 ? Math.round((resolus.length / dossiers.length) * 100) : 0;
  const mrr = revEvents.reduce((s: number, e: any) => s + (e.amount ?? 0), 0);

  const statsSnapshot = {
    nb_dossiers: dossiers.length,
    nb_resolus: resolus.length,
    taux_resolution: tauxResolution,
    nb_evenements: evenements.length,
    nb_citoyens_actifs: new Set(dossiers.map((d: any) => d.user_id).filter(Boolean)).size,
    nb_entreprises: new Set(besoins.map((b: any) => b.user_id).filter(Boolean)).size,
    nb_introductions: introductions.length,
    mrr,
  };

  const prompt = `Tu es l'assistant IA de la plateforme citoyenne Pévèle Augmentée.
Génère un rapport d'observatoire territorial ${type_rapport} pour ${commune} — période ${periodeLabel}.

DONNÉES :
- Dossiers citoyens : ${statsSnapshot.nb_dossiers} (résolus : ${statsSnapshot.nb_resolus} — taux : ${tauxResolution}%)
- Événements : ${statsSnapshot.nb_evenements}
- Citoyens actifs : ${statsSnapshot.nb_citoyens_actifs}
- Entreprises B2B : ${statsSnapshot.nb_entreprises}
- Introductions B2B : ${statsSnapshot.nb_introductions}
- MRR plateforme : ${mrr}€

STRUCTURE ATTENDUE (Markdown) :
## Résumé exécutif
(2-3 phrases synthèse)

## Dynamiques citoyennes
## Vie économique locale
## Événements & vie sociale
## Signaux faibles & tendances
## Recommandations pour les élus
`;

  // Appel IA via aiRouter (L2 pour mensuel, L3 pour mandat)
  const aiMode = type_rapport === "mandat" ? "generate_mandate_report" : "generate_obs_report";
  let contenuMarkdown = "";
  let resumeExecutif = "";
  let niveauIA: "L1" | "L2" | "L3" = "L2";
  let signauxFaibles: string[] = [];
  let recommandations: string[] = [];

  try {
    const aiRes = await base44.functions.invoke("aiRouter", {
      mode: aiMode,
      user_input: prompt,
      commune,
      type_rapport,
    });
    contenuMarkdown = aiRes.data?.text ?? "";
    niveauIA = aiRes.data?.level_used ?? "L2";

    // Extraire le résumé exécutif
    const resumeMatch = contenuMarkdown.match(/## Résumé exécutif\s*\n([\s\S]*?)(?=\n## |\n#|$)/);
    if (resumeMatch) resumeExecutif = resumeMatch[1].trim().slice(0, 800);

    // Extraire signaux et recommandations
    const signauxMatch = contenuMarkdown.match(/## Signaux faibles[^\n]*\n([\s\S]*?)(?=\n## |\n#|$)/);
    if (signauxMatch) {
      signauxFaibles = signauxMatch[1].split("\n").filter(l => /^[-•*]/.test(l.trim())).map(l => l.replace(/^[-•*]\s*/, "")).slice(0, 5);
    }
    const recosMatch = contenuMarkdown.match(/## Recommandations[^\n]*\n([\s\S]*?)(?=\n## |\n#|$)/);
    if (recosMatch) {
      recommandations = recosMatch[1].split("\n").filter(l => /^[-•*\d]/.test(l.trim())).map(l => l.replace(/^[-•*\d.]\s*/, "")).slice(0, 5);
    }
  } catch {
    contenuMarkdown = `# Rapport ${type_rapport} — ${commune} — ${periodeLabel}\n\n*Génération IA temporairement indisponible. Données statistiques brutes disponibles.*\n\n## Statistiques\n- Dossiers : ${statsSnapshot.nb_dossiers}\n- Taux résolution : ${tauxResolution}%`;
    resumeExecutif = `Rapport ${type_rapport} de ${commune} pour la période ${periodeLabel}. ${statsSnapshot.nb_dossiers} dossiers traités, taux de résolution ${tauxResolution}%.`;
    niveauIA = "L1";
  }

  // Sauvegarder le rapport
  const rapport = await base44.entities.ObservatoryReport.create({
    commune,
    periode: periodeLabel,
    type_rapport,
    titre: `Rapport ${type_rapport === "mandat" ? "de mandat" : type_rapport} — ${commune} — ${periodeLabel}`,
    resume_executif: resumeExecutif,
    contenu_markdown: contenuMarkdown,
    stats_snapshot: statsSnapshot,
    signaux_faibles: signauxFaibles,
    recommandations,
    niveau_ia: niveauIA,
    genere_par: user_id,
    publie: false,
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    data: rapport,
    message: `Rapport ${type_rapport} généré pour ${commune} (${periodeLabel}).`,
  };
}
