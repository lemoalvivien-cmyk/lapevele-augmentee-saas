/**
 * matchOfferDemand — Moteur de matching offres/besoins B2B
 * Opérations :
 *   find_offers_for_need(need_id) → liste d'offres compatibles scorées
 *   find_needs_for_offer(offer_id) → liste de besoins compatibles scorés
 *   auto_suggest(limit) → suggestions automatiques toutes paires
 */
import { base44 } from "@base44/sdk";

function computeMatchScore(need: any, offer: any): number {
  let score = 0;
  // Secteur
  if (need.secteur_cible && offer.secteur && need.secteur_cible.toLowerCase().includes(offer.secteur.toLowerCase())) score += 40;
  // Type compatible
  const typeMap: any = { fournisseur: ["produit","sous_traitance"], prestataire: ["service","formation"], partenariat: ["partenariat"], client: ["service","produit"] };
  if ((typeMap[need.type_besoin] ?? []).includes(offer.type_offre)) score += 30;
  // Commune / périmètre
  if (need.commune && offer.commune && need.commune === offer.commune) score += 20;
  else if (need.perimetre === "pevele" || need.perimetre === "dept") score += 10;
  // Actif
  if (offer.statut === "actif") score += 10;
  return Math.min(score, 100);
}

export default async function handler(req: any) {
  const { operation = "find_offers_for_need", need_id, offer_id, limit = 10 } = req.body ?? {};

  if (operation === "find_offers_for_need") {
    if (!need_id) return { success: false, error: "need_id requis" };

    const needs = await base44.entities.BusinessNeed.filter({ id: need_id }).catch(() => []);
    const need = needs[0];
    if (!need) return { success: false, error: "Besoin introuvable" };

    const offers = await base44.entities.BusinessOffer.filter({ statut: "actif" }, "-created_at", 200).catch(() => []);

    const scored = offers
      .map((o: any) => ({ ...o, _score: computeMatchScore(need, o) }))
      .filter((o: any) => o._score >= 20)
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, limit);

    return { success: true, data: scored, need };
  }

  if (operation === "find_needs_for_offer") {
    if (!offer_id) return { success: false, error: "offer_id requis" };

    const offers = await base44.entities.BusinessOffer.filter({ id: offer_id }).catch(() => []);
    const offer = offers[0];
    if (!offer) return { success: false, error: "Offre introuvable" };

    const needs = await base44.entities.BusinessNeed.filter({ statut: "actif" }, "-created_at", 200).catch(() => []);

    const scored = needs
      .map((n: any) => ({ ...n, _score: computeMatchScore(n, offer) }))
      .filter((n: any) => n._score >= 20)
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, limit);

    return { success: true, data: scored, offer };
  }

  if (operation === "auto_suggest") {
    const needs = await base44.entities.BusinessNeed.filter({ statut: "actif" }, "-created_at", 50).catch(() => []);
    const offers = await base44.entities.BusinessOffer.filter({ statut: "actif" }, "-created_at", 50).catch(() => []);

    const suggestions: any[] = [];
    for (const need of needs.slice(0, 20)) {
      for (const offer of offers.slice(0, 20)) {
        const score = computeMatchScore(need, offer);
        if (score >= 50) suggestions.push({ need_id: need.id, offer_id: offer.id, score, need_titre: need.titre, offer_titre: offer.titre });
      }
    }
    suggestions.sort((a, b) => b.score - a.score);
    return { success: true, data: suggestions.slice(0, limit) };
  }

  return { success: false, error: "operation invalide (find_offers_for_need|find_needs_for_offer|auto_suggest)" };
}
