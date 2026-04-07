import { Link } from "react-router-dom";

export default function Cookies() {
  const resetConsent = () => {
    try {
      localStorage.removeItem("cookie_consent_v1");
      window.location.reload();
    } catch {}
  };

  return (
    <div className="min-h-screen py-16 px-5" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-sm underline" style={{ color: "#1D1836" }}>← Retour</Link>
        <h1 className="text-4xl font-black mt-4 mb-6" style={{ color: "#1D1836" }}>
          Politique cookies
        </h1>

        <div className="space-y-5" style={{ color: "#1D1836" }}>
          <section>
            <h2 className="text-xl font-black">1. Qu'est-ce qu'un cookie ?</h2>
            <p>
              Un cookie est un petit fichier déposé sur votre appareil par le navigateur lors
              de votre visite sur un site. La Pévèle Augmentée utilise des cookies techniques
              et, après votre consentement, des signaux de mesure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">2. Cookies techniques (toujours actifs)</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Session d'authentification (base44)</li>
              <li>Préférences d'affichage et cache local de la Lame de Décision</li>
              <li>Protection CSRF et sécurité</li>
            </ul>
            <p className="text-sm opacity-70 mt-1">
              Ces cookies sont strictement nécessaires au fonctionnement du service et ne
              nécessitent pas de consentement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">3. Signaux territoriaux (consentement requis)</h2>
            <p>
              Pour améliorer la pertinence de la Lame de Décision, nous enregistrons des
              « signaux » anonymisés : pages consultées, catégories d'intérêt, commune
              approximative. Ces signaux sont <strong>agrégés</strong> et alimentent le
              Graphe Territorial, jamais revendus.
            </p>
            <p className="text-sm opacity-70">
              Vous pouvez refuser ces signaux : les services continueront à fonctionner
              mais sans personnalisation fine.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">4. Gérer votre consentement</h2>
            <p>
              Vous pouvez à tout moment modifier votre choix en cliquant sur le bouton ci-dessous.
            </p>
            <button onClick={resetConsent}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 font-black border-2 shadow-[3px_3px_0_0_#1D1836]"
              style={{ backgroundColor: "#FFD84D", color: "#1D1836", borderColor: "#1D1836" }}>
              Réinitialiser mon consentement cookies
            </button>
          </section>

          <section>
            <h2 className="text-xl font-black">5. Durée</h2>
            <p>Consentement : 6 mois. Cookies techniques : durée de session.</p>
          </section>

          <section>
            <p className="text-sm opacity-70">
              Voir aussi notre <Link to="/rgpd" className="underline">politique RGPD</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
