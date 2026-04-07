import { base44 } from "@/api/base44Client";

/**
 * Fire-and-forget signal emission to the unified Graphe Territorial.
 * Silently swallows errors so UI flows never break.
 *
 * @param {Object} params
 * @param {string} params.type - one of the 14 signal types
 * @param {string} [params.target_type]
 * @param {string} [params.target_id]
 * @param {string} [params.commune]
 * @param {number} [params.geo_lat]
 * @param {number} [params.geo_lng]
 * @param {string[]} [params.topic_tags]
 * @param {number} [params.weight]
 * @param {Object} [params.meta]
 */
export function emitSignal(params) {
  try {
    return base44.functions
      .invoke("emitSignal", params)
      .catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}
