/**
 * generateMandateReport — Génère le rapport de mandat complet (L3 Claude Opus)
 * Rapport stratégique multi-années pour les élus et EPCI.
 * Proxy vers generateObsReport avec type_rapport=mandat.
 */
import { base44 } from "@base44/sdk";

export default async function handler(req: any) {
  const { commune, annee_debut, annee_fin, titre_personnalise } = req.body ?? {};

  if (!commune) return { success: false, error: "commune requis" };

  const anneeDebut = annee_debut ?? new Date().getFullYear() - 2;
  const anneeFin = annee_fin ?? new Date().getFullYear();
  const periode = `${anneeDebut}-${anneeFin}`;

  return base44.functions.invoke("generateObsReport", {
    commune,
    type_rapport: "mandat",
    periode,
    titre_personnalise: titre_personnalise ?? `Rapport de mandat ${anneeDebut}-${anneeFin} — ${commune}`,
  });
}
