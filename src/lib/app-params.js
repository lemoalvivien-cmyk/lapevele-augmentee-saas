// ═════════════════════════════════════════════════════════════════════════════
// APP PARAMS — Configuration globale
// ═════════════════════════════════════════════════════════════════════════════

export const appParams = {
  appId: import.meta.env.VITE_APP_ID || '69c6b3f69a0c0e88e2529d4a',
  token: import.meta.env.VITE_TOKEN || '',
  functionsVersion: import.meta.env.VITE_FUNCTIONS_VERSION || 'v1',
  appBaseUrl: import.meta.env.VITE_APP_BASE_URL || '',
};

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS — IA ASSISTANT
// ═════════════════════════════════════════════════════════════════════════════

export const AI_FLAGS = {
  // Master flag
  AI_ENABLED: true, // Default: OFF — activate manually in production

  // Feature-level flags
  AI_PUBLIC_ENABLED: true, // public_help + rewrite_public
  AI_MAIRIE_ENABLED: true, // qualify_dossier + rewrite_mairie
  AI_DIGEST_ENABLED: true, // generate_digest
  AI_VICTORY_ENABLED: true, // generate_victory

  // Technical
  QWEN_TIMEOUT_MS: 8000,
  QWEN_THROTTLE_MIN: 5000, // Min 5s between calls per user per mode
};

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════

export function isAIEnabled(mode) {
  if (!AI_FLAGS.AI_ENABLED) return false;

  const modeMap = {
    public_help: AI_FLAGS.AI_PUBLIC_ENABLED,
    rewrite_public: AI_FLAGS.AI_PUBLIC_ENABLED,
    qualify_dossier: AI_FLAGS.AI_MAIRIE_ENABLED,
    rewrite_mairie: AI_FLAGS.AI_MAIRIE_ENABLED,
    generate_digest: AI_FLAGS.AI_DIGEST_ENABLED,
    generate_victory: AI_FLAGS.AI_VICTORY_ENABLED,
  };

  return modeMap[mode] === true;
}