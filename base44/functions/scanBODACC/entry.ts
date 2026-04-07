/**
 * scanBODACC — Scan des annonces BODACC pour détecter de nouvelles entreprises en Pévèle
 * Utilise l'API publique data.inpi.fr / open.bodacc.fr
 * Opérations : scan (fetch + import), list (ProspectionSignal récents), stats
 */
import { base44 } from "@base44/sdk";

const COMMUNES_PEVELE = [
  "Orchies","Templeuve-en-Pévèle","Beuvry-la-Forêt","Wannehain","Thumeries",
  "Pont-à-Marcq","Genech","Bersée","Rosult","Landas","Nomain","Sars-et-Rosières",
  "Cappelle-en-Pévèle","Mons-en-Pévèle","Mérignies","Louvil","Phalempin",
  "Ostricourt","Libercourt","Leforest","Cobrieux","Ennevelin","Avelin","Seclin",
  "Gondecourt","Templemars","Vendeville","Wattignies","Faches-Thumesnil",
  "Ronchin","Lesquin","Fretin","Gruson","Forest-sur-Marque","Bourghelles",
  "Baisieux","Bachy","Cysoing","Saméon","Mouchin","Téteghem-Coudekerque-Village",
  "Wannehain","Louvil","Herrin"
];

const BODACC_API = "https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/";

export default async function handler(req: any) {
  const { operation = "scan", commune, limit = 20 } = req.body ?? {};

  // Auth gate : opérations d'écriture réservées aux admins
  const WRITE_OPS = ["scan"];
  if (WRITE_OPS.includes(operation)) {
    if (!req.user || req.user.role !== "admin") {
      return { success: false, error: "Accès refusé — scan BODACC réservé aux administrateurs" };
    }
  }

  if (operation === "list") {
    const signals = await base44.entities.ProspectionSignal.filter(
      { source: "bodacc" }, "-created_at", Math.min(limit, 100)
    ).catch(() => []);
    return { success: true, data: signals };
  }

  if (operation === "stats") {
    const all = await base44.entities.ProspectionSignal.filter({}, "-created_at", 500).catch(() => []);
    const byStatut = all.reduce((acc: any, s: any) => {
      acc[s.statut] = (acc[s.statut] ?? 0) + 1;
      return acc;
    }, {});
    return { success: true, data: { total: all.length, by_statut: byStatut } };
  }

  if (operation !== "scan") {
    return { success: false, error: "operation invalide (scan|list|stats)" };
  }

  // Scan BODACC pour créations d'entreprises en Pévèle
  const communesList = commune ? [commune] : COMMUNES_PEVELE.slice(0, 10);
  let imported = 0;
  let errors = 0;

  for (const com of communesList.slice(0, 5)) {
    try {
      const url = `${BODACC_API}?dataset=bodacc-a&q=${encodeURIComponent(com)}&refine.commercant=true&sort=dateparution&rows=5`;
      const resp = await fetch(url, { headers: { Accept: "application/json" } });
      if (!resp.ok) continue;

      const json = await resp.json();
      const records = json.records ?? [];

      for (const rec of records) {
        const fields = rec.fields ?? {};
        const siret = fields.registre ?? "";
        const nom = fields.commercant ?? fields.personnemorale?.denominationsociale ?? "Entreprise inconnue";

        // Vérifier doublon
        const existing = await base44.entities.ProspectionSignal.filter({ siret, source: "bodacc" }).catch(() => []);
        if (existing.length > 0) continue;

        await base44.entities.ProspectionSignal.create({
          source: "bodacc",
          type_signal: "creation_entreprise",
          nom_entreprise: nom,
          siret,
          commune: com,
          secteur: fields.activiteprincipale ?? "Non précisé",
          description: `Annonce BODACC ${fields.typeavis ?? ""} — ${fields.ville ?? com}. Publication : ${fields.dateparution ?? ""}`,
          url_source: `https://www.bodacc.fr/annonce/detail-annonce/A/${fields.numerodepartement ?? "59"}/${fields.numeroannonce ?? ""}`,
          score_pertinence: 60,
          statut: "nouveau",
          date_signal: fields.dateparution ? new Date(fields.dateparution).toISOString() : new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        imported++;
      }
    } catch {
      errors++;
    }
  }

  return {
    success: true,
    data: {
      communes_scannees: communesList.slice(0, 5).length,
      signaux_importes: imported,
      erreurs: errors,
    },
    message: `${imported} nouveaux signaux BODACC importés.`,
  };
}
