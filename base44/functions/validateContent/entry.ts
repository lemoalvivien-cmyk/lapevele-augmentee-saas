Deno.serve(async (req) => {
  try {
    const { text, field_name } = await req.json();

    if (typeof text !== 'string' || text === undefined) {
      return Response.json({ clean_text: '', warnings: [] });
    }
    // Tronque l'entrée brute avant tout traitement (protection ressources)
    const truncatedInput = text.slice(0, 10000);

    const warnings = [];
    let clean = truncatedInput;

    // 1. Longueur max par champ
    const maxLen = field_name === 'titre_public' ? 200
      : field_name === 'commentaire' ? 500
      : 5000; // description_brute et autres
    if (clean.length > maxLen) {
      clean = clean.slice(0, maxLen);
      warnings.push(`Contenu tronqué à ${maxLen} caractères (champ: ${field_name})`);
    }

    // 2. Strip balises HTML (ne pas rejeter, nettoyer)
    const htmlTagRegex = /<[^>]+>/g;
    if (htmlTagRegex.test(clean)) {
      clean = clean.replace(/<[^>]+>/g, '');
      warnings.push('Balises HTML supprimées');
    }

    // 3. URLs externes suspectes (hors lapeveleaugmentee.fr)
    const urlRegex = /https?:\/\/(?!lapeveleaugmentee\.fr)[^\s"'<>]+/gi;
    if (urlRegex.test(clean)) {
      clean = clean.replace(urlRegex, '[lien supprimé]');
      warnings.push('URL(s) externe(s) supprimée(s)');
    }

    // 4. Contenu répétitif (même phrase/segment > 3 fois)
    // Découpe par ponctuation ou saut de ligne, cherche les doublons
    const segments = clean.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 10);
    const counts = {};
    for (const seg of segments) {
      const key = seg.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    const repeated = Object.entries(counts).filter(([, c]) => c > 3);
    if (repeated.length > 0) {
      warnings.push('Contenu répétitif détecté');
    }

    return Response.json({ clean_text: clean, warnings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});