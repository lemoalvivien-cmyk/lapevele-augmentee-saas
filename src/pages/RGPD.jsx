import { Link } from "react-router-dom";

export default function RGPD() {
  return (
    <div className="min-h-screen py-16 px-5" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-sm underline" style={{ color: "#1D1836" }}>← Retour</Link>
        <h1 className="text-4xl font-black mt-4 mb-6" style={{ color: "#1D1836" }}>
          Politique de confidentialité (RGPD)
        </h1>

        <div className="prose prose-sm max-w-none space-y-5" style={{ color: "#1D1836" }}>
          <section>
            <h2 className="text-xl font-black">1. Responsable du traitement</h2>
            <p>
              Vivien Le Moal, entrepreneur individuel domicilié à Bourghelles (59830),
              SIREN <strong>835125089</strong>, éditeur de la plateforme « La Pévèle Augmentée ».
              Contact : <a className="underline" href="mailto:contact@lapeveleaugmentee.fr">contact@lapeveleaugmentee.fr</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">2. Données collectées</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Email, nom, commune (compte utilisateur)</li>
              <li>Signalements, messages, participations aux événements</li>
              <li>Signaux anonymisés d'usage (« Graphe Territorial ») pour améliorer la pertinence de la Lame de Décision</li>
              <li>Cookies techniques et de mesure (voir <Link to="/cookies" className="underline">politique cookies</Link>)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black">3. Finalités</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Fournir les services de la plateforme (signalements, marketplace, événements)</li>
              <li>Améliorer la personnalisation via l'intelligence territoriale</li>
              <li>Assurer la sécurité et prévenir la fraude</li>
              <li>Communiquer les informations légales et contractuelles</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black">4. Base légale</h2>
            <p>
              Exécution contractuelle (fourniture des services), intérêt légitime (mesure d'audience,
              sécurité), consentement (cookies non essentiels, newsletters).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">5. Durée de conservation</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Compte utilisateur : pendant toute la durée d'utilisation + 3 ans</li>
              <li>Signaux Graphe Territorial : 24 mois maximum</li>
              <li>Journaux techniques : 12 mois</li>
              <li>Données de facturation : 10 ans (obligation légale)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black">6. Hébergement</h2>
            <p>
              Les données sont hébergées en <strong>Union Européenne</strong>.
              Aucun transfert hors UE sans clause contractuelle type validée.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">7. Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement,
              de limitation, d'opposition et de portabilité. Vous pouvez exercer ces droits via votre
              espace personnel (<em>Paramètres → Mes données</em>) ou par email à
              <a className="underline" href="mailto:contact@lapeveleaugmentee.fr"> contact@lapeveleaugmentee.fr</a>.
            </p>
            <p>
              En cas de difficulté, vous pouvez introduire une réclamation auprès de la CNIL
              (<a className="underline" href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">8. Mise à jour</h2>
            <p>Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
