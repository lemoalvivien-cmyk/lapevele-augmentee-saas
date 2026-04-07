import { Link } from "react-router-dom";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm font-bold underline underline-offset-4 mb-8 inline-block" style={{ color: "#FF6A00" }}>
          ← Retour à l'accueil
        </Link>

        <h1 className="text-3xl font-black mb-8" style={{ color: "#1D1836" }}>Mentions légales & Confidentialité</h1>

        <div className="space-y-8 text-base leading-relaxed" style={{ color: "#1D1836" }}>

          {/* ÉDITEUR */}
          <section>
            <h2 className="text-xl font-black mb-3">Éditeur du site</h2>
            <div className="space-y-1 opacity-70">
              <p><strong>Raison sociale :</strong> VLM Consulting</p>
              <p><strong>SIRET :</strong> 835 125 089 000 28</p>
              <p><strong>Forme juridique :</strong> Auto-entrepreneur</p>
              <p><strong>Adresse :</strong> Croix, 59170, France</p>
              <p><strong>Responsable de la publication :</strong> Vivien Lemoal</p>
              <p><strong>Email :</strong> <a href="mailto:contact@lapeveleaugmentee.fr" className="underline" style={{ color: "#FF6A00" }}>contact@lapeveleaugmentee.fr</a></p>
              <p><strong>Plateforme :</strong> La Pévèle Augmentée — lapeveleaugmentee.fr</p>
            </div>
          </section>

          {/* HÉBERGEMENT */}
          <section>
            <h2 className="text-xl font-black mb-3">Hébergement</h2>
            <div className="space-y-1 opacity-70">
              <p><strong>Plateforme :</strong> Base44 (<a href="https://base44.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#FF6A00" }}>base44.com</a>)</p>
              <p><strong>Infrastructure :</strong> Cloud — données hébergées en Europe.</p>
            </div>
          </section>

          {/* RGPD */}
          <section>
            <h2 className="text-xl font-black mb-3">Données personnelles (RGPD)</h2>

            <div className="space-y-4 opacity-70">

              <div>
                <p className="font-semibold mb-1">Responsable du traitement</p>
                <p>VLM Consulting — contact@lapeveleaugmentee.fr</p>
              </div>

              <div>
                <p className="font-semibold mb-1">Pourquoi on collecte vos données</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Gérer vos contributions citoyennes (signalements, idées, offres d'aide)</li>
                  <li>Personnaliser votre expérience locale (commune, quartier)</li>
                  <li>Gérer les accès des agents et élus à l'espace mairie</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-1">Base légale</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Contributions citoyennes :</strong> intérêt légitime</li>
                  <li><strong>Compte citoyen (optionnel) :</strong> consentement</li>
                  <li><strong>Accès mairie :</strong> exécution contractuelle</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-1">Données collectées</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Formulaires de contribution :</strong> email (optionnel), prénom (optionnel), commune, quartier, description, adresse du lieu, photo</li>
                  <li><strong>Compte citoyen :</strong> email, prénom, commune, quartier, téléphone, centres d'intérêt</li>
                  <li><strong>Accès mairie :</strong> email professionnel, rôle, commune rattachée</li>
                </ul>
                <p className="mt-2">Aucune donnée n'est revendue ni partagée à des fins commerciales.</p>
              </div>

              <div>
                <p className="font-semibold mb-1">Durée de conservation</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Données de compte et contributions : 3 ans après la dernière activité</li>
                  <li>Tokens de suivi : 90 jours, puis suppression automatique</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-1">Vos droits</p>
                <p className="mb-1">Vous pouvez à tout moment demander l'accès, la rectification, l'effacement, la limitation, la portabilité ou vous opposer au traitement de vos données.</p>
                <p>Contactez-nous : <a href="mailto:contact@lapeveleaugmentee.fr" className="underline" style={{ color: "#FF6A00" }}>contact@lapeveleaugmentee.fr</a> — réponse sous 30 jours.</p>
              </div>

              <div>
                <p className="font-semibold mb-1">Réclamation</p>
                <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une plainte auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#FF6A00" }}>CNIL (cnil.fr)</a>.</p>
              </div>

            </div>
          </section>

          {/* COOKIES */}
          <section>
            <h2 className="text-xl font-black mb-3">Cookies et traceurs</h2>
            <div className="space-y-2 opacity-70">
              <p>Ce site n'utilise <strong>aucun cookie publicitaire</strong>, aucun traceur tiers, aucun outil d'analytics externe.</p>
              <p>Le <strong>sessionStorage</strong> du navigateur est utilisé uniquement pour prévenir le spam sur les formulaires (limite d'envoi, protection anti-doublon). Ces données restent dans votre navigateur, ne sont jamais transmises à nos serveurs en dehors de la soumission normale du formulaire, et disparaissent à la fermeture de l'onglet. Il ne s'agit pas de cookies au sens de la réglementation RGPD.</p>
              <p>Aucune donnée n'est transmise à des tiers.</p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t-2 border-ink/10 text-xs opacity-40" style={{ color: "#1D1836" }}>
          Dernière mise à jour : mars 2026
        </div>
      </div>
    </div>
  );
}