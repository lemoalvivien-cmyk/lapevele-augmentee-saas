import { Link } from "react-router-dom";
import PublicAssistant from "@/components/PublicAssistant";

export default function APropos() {
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      <PublicAssistant />
      
      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 1 — HERO */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="px-4 pt-20 pb-16 text-center" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight" style={{ color: "#1D1836" }}>
            Un mois, une conviction,<br className="hidden sm:block" /> une plateforme pour la Pévèle
          </h1>
          <p className="text-lg md:text-xl font-medium mb-3 max-w-lg mx-auto" style={{ color: "#1D1836", opacity: 0.85 }}>
            Nous vivons à Bourghelles depuis un mois. Nous avons créé La Pévèle Augmentée parce que notre territoire mérite mieux : des connexions utiles, pas du bruit. De vraies rencontres, pas des écrans qui nous isolent.
          </p>
          <p className="text-base mb-10 max-w-lg mx-auto" style={{ color: "#1D1836", opacity: 0.65 }}>
            Voici notre histoire et pourquoi nous y croyons.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/agir"
              className="inline-flex items-center justify-center gap-2 text-white font-black py-4 px-8 rounded-2xl shadow-lg transition-all hover:scale-105 text-sm"
              style={{ backgroundColor: "#FF6A00" }}>
              Découvrir la plateforme
            </Link>
            <Link to="/place-du-village"
              className="inline-flex items-center justify-center gap-2 font-black py-4 px-8 rounded-2xl border-2 bg-white transition-all hover:shadow-md text-sm"
              style={{ borderColor: "#1D1836", color: "#1D1836" }}>
              Voir ce qui se passe près de vous
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 2 — POURQUOI NOUS AVONS CRÉÉ LA PÉVÈLE AUGMENTÉE */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#FF6A00" }}>Notre constat</p>
          <h2 className="text-3xl font-black" style={{ color: "#1D1836" }}>Pourquoi nous avons créé La Pévèle Augmentée</h2>
        </div>
        <div className="bg-white rounded-3xl border-2 border-ink/10 p-10 space-y-6">
          <p className="text-lg leading-relaxed" style={{ color: "#1D1836", opacity: 0.85 }}>
            Nous nous sommes installés à Bourghelles depuis un mois. Rapidement, nous avons vu une évidence : <strong>la Pévèle a tous les ingrédients pour une vie locale riche, mais ils restent séparés, invisibles, déconnectés.</strong>
          </p>
          <p className="text-base leading-relaxed" style={{ color: "#1D1836", opacity: 0.8 }}>
            Les bons plans ne circulent que par bouche à oreille. Les talents locaux restent cachés. Les associations cherchent désespérément des bénévoles. Les entrepreneurs du coin ne trouvent pas les clients et collaborateurs à proximité. Les mairies veulent mieux communiquer mais manquent d'outils simples. Les citoyens cherchent des connexions utiles, pas du bruit numérique.
          </p>
          <p className="text-base leading-relaxed" style={{ color: "#1D1836", opacity: 0.8 }}>
            <strong>C'est pourquoi nous avons décidé de créer un espace où la vie réelle et le numérique se renforcent vraiment.</strong> Pas une app de plus. Un outil concret, utile au quotidien, gratuit, pensé pour nos besoins réels. Une plateforme qui met en lumière ce qui compte : les gens, les idées, les initiatives, les rencontres qui transforment un territoire.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 3 — CE QUE NOUS VOULONS RENDRE POSSIBLE */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#FF6A00" }}>Concrètement</p>
          <h2 className="text-3xl font-black" style={{ color: "#1D1836" }}>Ce que nous voulons rendre possible</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { emoji: "💬", title: "Communication ciblée", desc: "Parler à qui vous voulez vraiment atteindre, sans bruit, sans perte." },
            { emoji: "💼", title: "Emploi & opportunités", desc: "Trouver du travail, des stages, des collaborations proches de chez soi." },
            { emoji: "🎉", title: "Événements utiles", desc: "Créer, découvrir et participer aux activités qui font vivre votre quartier." },
            { emoji: "👁️", title: "Visibilité locale", desc: "Rendre visibles les idées, les projets et les actions qui changent le quotidien." },
            { emoji: "🤲", title: "Entraide directe", desc: "Proposer votre aide ou chercher un coup de main sans intermédiaire." },
            { emoji: "🧠", title: "Intelligence collective", desc: "Quand les gens peuvent vraiment se rencontrer, les bonnes idées émergent." },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border-2 border-ink/10 p-7 hover:shadow-lg transition-all">
              <div className="text-3xl mb-3">{item.emoji}</div>
              <h3 className="font-black text-lg mb-2" style={{ color: "#1D1836" }}>{item.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#1D1836", opacity: 0.75 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 4 — LES FONDATEURS */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-black mb-12 text-center" style={{ color: "#1D1836" }}>Les fondateurs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Emilie Varnier */}
          <div className="bg-white rounded-3xl border-2 border-ink/10 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="w-full h-96 overflow-hidden" style={{ backgroundColor: "#FF6A00" }}>
              <img loading="lazy" src="https://media.base44.com/images/public/69c6b3f69a0c0e88e2529d4a/9883b5759_ChatGPTImage29mars202620_40_42.png" 
                alt="Emilie Varnier" 
                className="w-full h-full object-cover object-center" />
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-black mb-1" style={{ color: "#1D1836" }}>Emilie Varnier</h3>
              <p className="text-sm font-bold mb-5" style={{ color: "#FF6A00" }}>Cofondatrice</p>
              <p className="text-base leading-relaxed" style={{ color: "#1D1836", opacity: 0.85 }}>
                J'ai dirigé les ressources humaines d'une grande société pendant plusieurs années. J'ai vu comment les vraies transformations naissent quand les gens se connaissent vraiment. Les schémas qui nous bloquent — souvent enracinés dans notre histoire personnelle ou familiale — peuvent se dépasser par la compréhension et les connexions authentiques. Je veux créer ici un espace où chacun trouve sa place, contribue à sa mesure et se sent utile. C'est ça pour moi, une vie locale riche.
              </p>
            </div>
          </div>

          {/* Vivien Le Moal */}
          <div className="bg-white rounded-3xl border-2 border-ink/10 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="w-full h-96 overflow-hidden" style={{ backgroundColor: "#FFD84D" }}>
              <img loading="lazy" src="https://media.base44.com/images/public/69c6b3f69a0c0e88e2529d4a/4ff7e4834_ChatGPTImage26mars202620_44_15.png" 
                alt="Vivien Le Moal" 
                className="w-full h-full object-cover object-center" />
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-black mb-1" style={{ color: "#1D1836" }}>Vivien Le Moal</h3>
              <p className="text-sm font-bold mb-5" style={{ color: "#FF6A00" }}>Fondateur & CEO</p>
              <p className="text-base leading-relaxed" style={{ color: "#1D1836", opacity: 0.85 }}>
                J'ai passé 20 ans à construire des réseaux, des communautés d'entreprises, à conseiller en digital et cybersécurité. Je sais une chose : une vrai plateforme utile rend possible ce qui semblait impossible. Que les gens se rencontrent, se découvrent, créent ensemble, trouvent ce qu'ils cherchent localement. Sans bruit algorithmique. Juste de vraies connexions. Ici, à Bourghelles, dans la Pévèle, c'est exactement ce qu'on veut construire.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center bg-white rounded-3xl border-2 border-ink/10 p-10">
          <p className="text-lg leading-relaxed" style={{ color: "#1D1836", opacity: 0.88 }}>
            <strong>Dans la vie comme dans ce projet, nous avançons ensemble.</strong> Nos expériences et sensibilités se complètent, mais nous partageons une conviction simple : un territoire a besoin d'outils qui remettent les gens et l'utile au centre. C'est ce que nous construisons ici.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 5 — NOTRE VISION */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#FF6A00" }}>L'idée</p>
          <h2 className="text-3xl font-black" style={{ color: "#1D1836" }}>Ce que le numérique peut vraiment faire</h2>
        </div>
        <div className="bg-white rounded-3xl border-2 border-ink/10 p-10 space-y-6">
          <p className="text-lg leading-relaxed" style={{ color: "#1D1836", opacity: 0.85 }}>
            <strong>Le numérique doit rapprocher, pas éloigner.</strong> La vie locale mérite mieux que des informations dispersées, des canaux fragmentés, du bruit permanent qui nous isole.
          </p>
          <p className="text-base leading-relaxed" style={{ color: "#1D1836", opacity: 0.8 }}>
            La Pévèle Augmentée est un espace où la réalité et le digital se renforcent. Quand vous partagez une idée ici, vous ne parlez pas à un algorithme : vous parlez à vos voisins. Quand vous cherchez de l'aide, vous trouvez quelqu'un de confiance, pas une machine.
          </p>
          <p className="text-base leading-relaxed" style={{ color: "#1D1836", opacity: 0.8 }}>
            <strong>Nous voulons que cette plateforme rende visible ce qui compte vraiment :</strong> vos talents, vos idées, vos initiatives, vos envies. Et qu'elle facilite les rencontres utiles qui transforment réellement un territoire.
          </p>
          <p className="text-base leading-relaxed" style={{ color: "#1D1836", opacity: 0.8 }}>
            Pas d'algorithme addictif. Pas de publicités cachées. Pas d'exploitation de vos données. Juste une plateforme honnête qui met en lumière ce qui compte pour la Pévèle.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* SECTION 6 — CTA FINAL */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl border-2 border-ink/10 p-12 text-center space-y-6">
          <h2 className="text-3xl font-black" style={{ color: "#1D1836" }}>Prêt à vous connecter ?</h2>
          <p className="text-lg leading-relaxed max-w-xl mx-auto" style={{ color: "#1D1836", opacity: 0.8 }}>
            La plateforme est gratuite et accessible dès maintenant. Rejoignez les habitants, associations et entrepreneurs de la Pévèle qui créent déjà des liens utiles.
          </p>
          <Link to="/agir"
            className="inline-flex items-center justify-center gap-2 text-white font-black py-4 px-10 rounded-2xl shadow-lg transition-all hover:scale-105"
            style={{ backgroundColor: "#FF6A00" }}>
            Découvrir La Pévèle Augmentée
          </Link>
        </div>

        {/* Collectivités — discret en bas */}
        <div className="mt-14 pt-14 border-t-2 border-ink/10 text-center">
          <p className="text-sm font-medium mb-4" style={{ color: "#1D1836", opacity: 0.6 }}>Vous représentez une mairie ou une collectivité ?</p>
          <Link to="/mairie-candidature"
            className="inline-block text-base font-bold px-6 py-3 rounded-full border-2 bg-white transition-all hover:shadow-md"
            style={{ borderColor: "#1D1836", color: "#1D1836" }}>
            Nous rejoindre
          </Link>
        </div>
      </div>

      <div className="h-16"></div>
    </div>
  );
}