/**
 * matchAffinity — Calcule et stocke les scores d'affinité entre profils MatchProfile
 * Opérations :
 *   compute(profile_a_id, profile_b_id) → calcule et upsert AffinityScore
 *   top_matches(user_id, limit) → meilleures affinités pour un profil
 *   compute_batch(limit) → calcule toutes les paires (tâche de fond)
 */
import { base44 } from "@base44/sdk";

function sectorAffinity(a: string, b: string): number {
  if (!a || !b) return 20;
  if (a === b) return 15; // Même secteur = concurrence, moins d'affinité
  const complementaires: [string, string][] = [
    ["it_numerique", "commerce"], ["consulting", "industrie"], ["batiment", "habitat"],
    ["agriculture", "commerce"], ["sante", "familles"], ["artisanat", "batiment"],
    ["transport", "industrie"], ["transport", "commerce"],
  ];
  for (const [s1, s2] of complementaires) {
    if ((a === s1 && b === s2) || (a === s2 && b === s1)) return 40;
  }
  return 20;
}

function sharedInterests(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a.map((x: string) => x.toLowerCase()));
  const shared = b.filter((x: string) => setA.has(x.toLowerCase())).length;
  return Math.min(shared * 10, 30);
}

export default async function handler(req: any) {
  const { operation = "top_matches", profile_a_id, profile_b_id, user_id, limit = 10 } = req.body ?? {};

  if (operation === "compute") {
    if (!profile_a_id || !profile_b_id) return { success: false, error: "profile_a_id et profile_b_id requis" };

    const [profilesA, profilesB] = await Promise.all([
      base44.entities.MatchProfile.filter({ user_id: profile_a_id }).catch(() => []),
      base44.entities.MatchProfile.filter({ user_id: profile_b_id }).catch(() => []),
    ]);
    const pa = profilesA[0], pb = profilesB[0];
    if (!pa || !pb) return { success: false, error: "Un ou deux profils introuvables" };

    const facteurs = {
      secteur_complementaire: sectorAffinity(pa.secteur, pb.secteur),
      commune_proche: pa.commune === pb.commune ? 20 : 10,
      interets_communs: sharedInterests(pa.centres_interet ?? [], pb.centres_interet ?? []),
      offre_besoin_match: (pa.recherche && pb.offre) || (pb.recherche && pa.offre) ? 20 : 0,
    };
    const score = Math.min(Object.values(facteurs).reduce((s, v) => s + v, 0), 100);

    // Upsert AffinityScore
    const existing = await base44.entities.AffinityScore.filter({ profile_a_id, profile_b_id }).catch(() => []);
    if (existing[0]) {
      await base44.entities.AffinityScore.update(existing[0].id, { score, facteurs, computed_at: new Date().toISOString() });
    } else {
      await base44.entities.AffinityScore.create({ profile_a_id, profile_b_id, score, facteurs, computed_at: new Date().toISOString() });
    }

    return { success: true, data: { score, facteurs } };
  }

  if (operation === "top_matches") {
    const uid = user_id ?? req.user?.id;
    if (!uid) return { success: false, error: "user_id requis" };

    const scores = await base44.entities.AffinityScore.filter({ profile_a_id: uid }, "-score", limit).catch(() => []);
    const scoresB = await base44.entities.AffinityScore.filter({ profile_b_id: uid }, "-score", limit).catch(() => []);

    const combined = [...scores, ...scoresB]
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    return { success: true, data: combined };
  }

  if (operation === "compute_batch") {
    const profiles = await base44.entities.MatchProfile.filter({ visible: true, open_to_match: true }, "-created_at", 50).catch(() => []);
    let computed = 0;
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length && j < i + 5; j++) {
        try {
          await handler({ body: { operation: "compute", profile_a_id: profiles[i].user_id, profile_b_id: profiles[j].user_id }, user: req.user });
          computed++;
        } catch {}
      }
    }
    return { success: true, data: { paires_calculees: computed } };
  }

  return { success: false, error: "operation invalide (compute|top_matches|compute_batch)" };
}
