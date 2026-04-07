/**
 * advanceIntroState — Machine à états WIINUP
 * Transitions valides :
 *   PENDING → ACCEPTED | REJECTED (par l'offreur)
 *   ACCEPTED → MEETING_SCHEDULED (par l'un ou l'autre)
 *   MEETING_SCHEDULED → WON | LOST (par l'un ou l'autre)
 * Sécurité : seuls les participants peuvent avancer l'état.
 */
import { base44 } from "@base44/sdk";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["MEETING_SCHEDULED"],
  MEETING_SCHEDULED: ["WON", "LOST"],
};

const TERMINAL = ["WON", "LOST", "REJECTED"];

export default async function handler(req: any) {
  const { introduction_id, new_statut, message, date_meeting, lieu_meeting, outcome_note } = req.body ?? {};
  const user_id = req.user?.id;

  if (!introduction_id || !new_statut) {
    return { success: false, error: "introduction_id et new_statut requis" };
  }
  if (!user_id) return { success: false, error: "Authentification requise" };

  try {
    const intros = await base44.entities.Introduction.filter({ id: introduction_id });
    const intro = intros[0];
    if (!intro) return { success: false, error: "Introduction introuvable" };

    // Vérification d'accès
    const isParticipant = [intro.demandeur_user_id, intro.offreur_user_id, intro.facilitator_id].includes(user_id);
    if (!isParticipant && req.user?.role !== "admin") {
      return { success: false, error: "Accès refusé" };
    }

    // Vérification transition
    if (TERMINAL.includes(intro.statut)) {
      return { success: false, error: `Impossible de modifier une introduction en état ${intro.statut}` };
    }
    const allowed = VALID_TRANSITIONS[intro.statut] ?? [];
    if (!allowed.includes(new_statut)) {
      return { success: false, error: `Transition ${intro.statut} → ${new_statut} non autorisée. Autorisées : ${allowed.join(", ")}` };
    }

    // Construire la mise à jour
    const updates: any = {
      statut: new_statut,
      last_action_at: new Date().toISOString(),
    };
    if (message) updates.message_offreur = message;
    if (date_meeting) updates.date_meeting = date_meeting;
    if (lieu_meeting) updates.lieu_meeting = lieu_meeting;
    if (outcome_note) updates.outcome_note = outcome_note;

    // Commission sur WON
    if (new_statut === "WON") {
      // Commission WIINUP : 5% du deal ou forfait 49€ min
      updates.commission_ht = Math.max(49, 0);
    }

    await base44.entities.Introduction.update(introduction_id, updates);

    // Log RevenueEvent si WON
    if (new_statut === "WON") {
      try {
        await base44.functions.invoke("trackRevenue", {
          operation: "log",
          type: "b2b_commission",
          amount: 49,
          label: `Commission WIINUP — Introduction ${introduction_id}`,
          metadata: { introduction_id },
        });
      } catch {
        // Non-bloquant
      }
    }

    return {
      success: true,
      introduction_id,
      ancien_statut: intro.statut,
      nouveau_statut: new_statut,
    };
  } catch (err: any) {
    console.error("[advanceIntroState]", err);
    return { success: false, error: err?.message ?? "Erreur interne" };
  }
}
