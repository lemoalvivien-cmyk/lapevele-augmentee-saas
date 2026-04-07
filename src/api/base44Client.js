// ═════════════════════════════════════════════════════════════════════════════
// base44Client.js — STANDALONE MOCK (zéro dépendance backend)
// La plateforme tourne en mode démo statique : aucune requête réseau Base44.
// Tous les appels résolvent avec des données déterministes "demo" et NE
// REJETTENT JAMAIS pour garantir l'absence d'écran d'erreur.
// ═════════════════════════════════════════════════════════════════════════════

const COMMUNES = [
  "Attiches","Aix","Auchy-lez-Orchies","Avelin","Bachy","Bersée","Beuvry-la-Forêt",
  "Bourghelles","Bouvignies","Camphin-en-Pévèle","Cappelle-en-Pévèle","Cobrieux",
  "Coutiches","Cysoing","Ennevelin","Faumont","Genech","Landas","La Neuville",
  "Louvil","Mérignies","Moncheaux","Mons-en-Pévèle","Mouchin","Néville","Nomain",
  "Orchies","Ostricourt","Pont-à-Marcq","Saméon","Templeuve-en-Pévèle","Thumeries",
  "Tourmignies","Wahagnies","Wannehain","Wasquehal"
].map((nom, i) => ({
  id: `commune_${i+1}`,
  nom,
  code_insee: String(59000 + i),
  statut: "active",
  population: 2000 + (i*137 % 8000),
  created_at: "2024-01-01T00:00:00Z",
}));

const VILLAGE_POSTS = [
  {
    id: "post_1", type_post: "victoire", commune: "Templeuve-en-Pévèle",
    auteur: "Mairie", titre: "Nouvelle aire de jeux inaugurée",
    contenu: "Après 6 mois de chantier, les enfants ont enfin leur aire de jeux flambant neuve dans le parc municipal.",
    created_at: new Date(Date.now() - 86400000*2).toISOString(),
    photo_url: null, statut: "publie",
  },
  {
    id: "post_2", type_post: "merci_local", commune: "Cysoing",
    auteur: "Marie L.", titre: "Merci à la boulangerie du centre",
    contenu: "Toujours un sourire et du pain délicieux. Une vraie belle adresse de notre village.",
    created_at: new Date(Date.now() - 86400000*1).toISOString(),
    statut: "publie",
  },
  {
    id: "post_3", type_post: "appel_aide", commune: "Orchies",
    auteur: "Famille D.", titre: "Cherche covoiturage Orchies → Lille (matin)",
    contenu: "Bonjour, je cherche un covoiturage régulier pour mon stage à Lille, départ 7h30.",
    created_at: new Date(Date.now() - 3600000*5).toISOString(),
    statut: "publie",
  },
  {
    id: "post_4", type_post: "message_maire", commune: "Pont-à-Marcq",
    auteur: "Mairie", titre: "Travaux rue de la République",
    contenu: "La rue sera fermée du 12 au 18 avril pour réfection de la chaussée. Merci de votre compréhension.",
    created_at: new Date(Date.now() - 3600000*12).toISOString(),
    statut: "publie",
  },
  {
    id: "post_5", type_post: "victoire", commune: "Mons-en-Pévèle",
    auteur: "Mairie", titre: "Fibre optique disponible partout",
    contenu: "Le déploiement de la fibre est terminé sur l'ensemble de la commune.",
    created_at: new Date(Date.now() - 86400000*7).toISOString(),
    statut: "publie",
  },
];

const EVENEMENTS = [
  {
    id: "ev_1", titre: "Marché de printemps", commune: "Orchies",
    date_debut: new Date(Date.now()+86400000*7).toISOString(),
    date_fin: new Date(Date.now()+86400000*7+3600000*6).toISOString(),
    lieu: "Place du Général de Gaulle", description: "Producteurs locaux, animations enfants, musique.",
    categorie: "marche", statut: "publie",
  },
  {
    id: "ev_2", titre: "Concert solidaire", commune: "Cysoing",
    date_debut: new Date(Date.now()+86400000*14).toISOString(),
    lieu: "Salle des fêtes", description: "Concert au profit du Téléthon.",
    categorie: "culture", statut: "publie",
  },
  {
    id: "ev_3", titre: "Brocante annuelle", commune: "Templeuve-en-Pévèle",
    date_debut: new Date(Date.now()+86400000*21).toISOString(),
    lieu: "Centre-ville", description: "Plus de 200 exposants attendus.",
    categorie: "brocante", statut: "publie",
  },
];

const VICTOIRES = VILLAGE_POSTS.filter(p => p.type_post === "victoire").map(p => ({
  id: "vic_" + p.id, commune: p.commune, titre: p.titre, contenu: p.contenu,
  date: p.created_at, theme: "amenagement",
}));

// ─── Generic helpers ─────────────────────────────────────────────────────────
const ok  = (data) => Promise.resolve(data);
const okFn = (data) => Promise.resolve({ data, status: 200 });

function entityStub(emptyList = []) {
  return {
    list:    (..._a) => ok(emptyList),
    filter:  (..._a) => ok(emptyList),
    get:     (..._a) => ok(null),
    create:  (payload) => ok({ id: "demo_" + Date.now(), ...(payload || {}) }),
    update:  (id, payload) => ok({ id, ...(payload || {}) }),
    delete:  (..._a) => ok({ success: true }),
    bulkCreate: (arr) => ok((arr || []).map((p, i) => ({ id: "demo_" + Date.now() + "_" + i, ...p }))),
  };
}

// ─── Entities ────────────────────────────────────────────────────────────────
const entities = {
  Commune: {
    ...entityStub(COMMUNES),
    list:   () => ok(COMMUNES),
    filter: (q) => ok(q && q.statut ? COMMUNES.filter(c => c.statut === q.statut) : COMMUNES),
    get:    (id) => ok(COMMUNES.find(c => c.id === id) || null),
  },
  VillagePost:           { ...entityStub(VILLAGE_POSTS), list: () => ok(VILLAGE_POSTS), filter: () => ok(VILLAGE_POSTS) },
  VillageReaction:       entityStub([]),
  EvenementLocal:        { ...entityStub(EVENEMENTS), list: () => ok(EVENEMENTS), filter: () => ok(EVENEMENTS) },
  PropositionEvenement:  entityStub([]),
  ParticipationEvenement:entityStub([]),
  UserProfile:           entityStub([]),
  AllowedUser:           entityStub([]),
  User:                  entityStub([]),
  UserInterest:          entityStub([]),
  DashboardConfig:       entityStub([]),
  DailyDigest:           entityStub([]),
  Dossier:               entityStub([]),
  VictoryCard:           { ...entityStub(VICTOIRES), list: () => ok(VICTOIRES), filter: () => ok(VICTOIRES) },
  ServiceMunicipal:      entityStub([]),
  MarketplaceCategory:   entityStub([]),
  MarketplaceListing:    entityStub([]),
  ObservatoryReport:     entityStub([]),
  SponsorPlacement:      entityStub([]),
  SubscriptionSnapshot:  entityStub([]),
  AIUsageMetric:         entityStub([]),
  BusinessNeed:          entityStub([]),
  BusinessOffer:         entityStub([]),
  BusinessProfile:       entityStub([]),
  Introduction:          entityStub([]),
  ProspectionSignal:     entityStub([]),
  FlashDateEvent:        entityStub([]),
  MatchProfile:          entityStub([]),
  LeadDemo: {
    ...entityStub([]),
    create: (payload) => {
      try {
        const all = JSON.parse(localStorage.getItem("demo_leads") || "[]");
        const lead = { id: "lead_" + Date.now(), ...(payload || {}), created_at: new Date().toISOString() };
        all.push(lead);
        localStorage.setItem("demo_leads", JSON.stringify(all));
        return ok(lead);
      } catch (_e) { return ok({ id: "lead_" + Date.now(), ...(payload || {}) }); }
    },
  },
};

// ─── Functions (server-side stubs) ───────────────────────────────────────────
const FUNCTIONS = {
  getPublicVillagePosts: () => okFn(VILLAGE_POSTS),
  getPublicEvenements:   () => okFn(EVENEMENTS),
  getReactionCounts:     ({ post_ids } = {}) => okFn(
    Object.fromEntries((post_ids || []).map(id => [id, { coeur: 0, bravo: 0, soutien: 0 }]))
  ),
  checkReactionExists:   () => okFn({ exists: false }),
  rateLimitCheck:        () => okFn({ allowed: true, remaining: 100 }),
  detectIntent:          () => okFn({ intent: "info", confidence: 0.5 }),
  qwenAssist:            ({ prompt } = {}) => okFn({ text: "Mode démo : l'assistant IA est désactivé. " + (prompt ? "Votre question : " + prompt : "") }),
  validateImageUpload:   () => okFn({ valid: true }),
  createDossierWithToken:() => okFn({ id: "demo_dossier", token: "demo_token", status: "received" }),
  getMairieData:         () => okFn({ commune: null, dossiers: [], digests: [], reactions: {}, stats: {} }),
  getObservatoireStats:  () => okFn({
    communes_actives: COMMUNES.length, dossiers_total: 0, satisfaction: 0,
    timeseries: [], top_themes: [], heatmap: [],
  }),
  getAiStats:            () => okFn({ calls_today: 0, errors_today: 0, by_mode: {} }),
  purgeExpiredData:      () => okFn({ purged: 0 }),
  getSuiviDossier:       () => okFn({ dossier: null, updates: [] }),
  submitSatisfaction:    () => okFn({ success: true }),
  scanBODACC:            () => okFn({ data: [] }),
  advanceIntroState:     () => okFn({ success: true }),
  createDossierUpdate:   () => okFn({ success: true }),
  updateDossier:         () => okFn({ success: true }),
  updateCommuneConfig:   () => okFn({ success: true }),
  sendLeadEmail:         () => okFn({ success: true, sent: true }),
};

const functions = {
  invoke: (name, payload) => {
    const fn = FUNCTIONS[name];
    if (fn) return fn(payload);
    return okFn(null);
  },
};

// ─── Auth (anonymous mode) ───────────────────────────────────────────────────
const auth = {
  isAuthenticated: () => ok(false),
  me: () => Promise.reject({ status: 401, message: "anonymous" }),
  logout: () => { try { localStorage.removeItem("base44_access_token"); localStorage.removeItem("token"); } catch(_){} },
  redirectToLogin: () => { window.location.href = "/se-connecter"; },
};

export const base44 = { entities, functions, auth };
export default base44;
