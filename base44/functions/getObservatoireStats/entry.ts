import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const posts = await sr.entities.VillagePost.filter({ est_public: true }, "-published_at", 500);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfWeek = new Date(now.getTime() - 7 * 86400000).toISOString();

    const victoires = posts.filter(p => ["victoire", "merci_local"].includes(p.type_post));
    const appelsAide = posts.filter(p => p.type_post === "appel_aide");
    const postsMois = posts.filter(p => p.published_at && p.published_at >= startOfMonth);
    const postsSemaine = posts.filter(p => p.published_at && p.published_at >= startOfWeek);

    // Top catégories
    const catCount = {};
    posts.forEach(p => {
      const cat = p.categorie || "Non catégorisé";
      catCount[cat] = (catCount[cat] || 0) + 1;
    });

    // Top communes
    const comCount = {};
    posts.forEach(p => { if (p.commune) comCount[p.commune] = (comCount[p.commune] || 0) + 1; });

    return Response.json({
      total: posts.length,
      victoires: victoires.length,
      appelsAide: appelsAide.length,
      postsMois: postsMois.length,
      postsSemaine: postsSemaine.length,
      topCats: catCount,
      topCommunes: comCount,
      appelsActifs: appelsAide.slice(0, 5),
      victoiresMois: victoires.filter(p => p.published_at && p.published_at >= startOfMonth).slice(0, 4),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});