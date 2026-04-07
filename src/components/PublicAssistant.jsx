import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { isAIEnabled } from '@/lib/app-params';

const FIXED_SUGGESTIONS = [
  { q: 'Comment signaler un problème ?', a: 'Pour signaler un problème dans votre commune, allez sur /signaler. C\'est simple et sans compte requis.' },
  { q: 'Où voir les événements ?', a: 'Pour voir les événements locaux de votre commune, allez sur /agenda. Vous verrez tout ce qui se passe près de chez vous.' },
  { q: 'Ai-je besoin d\'un compte ?', a: 'Non, vous n\'avez pas besoin de compte pour signaler, proposer une idée ou aider. La plateforme est gratuite et accessible à tous.' },
  { q: 'Comment suivre ma demande ?', a: 'Après envoi de votre demande, vous recevez un lien sécurisé pour suivre votre dossier en temps réel. Zéro tracas.' },
  { q: 'Quels services sont disponibles ?', a: 'La plateforme couvre 8 thèmes : mobilité, déchets, emploi, associations, familles, habitat, culture et nature. Rendez-vous sur /services pour trouver le bon thème.' },
  { q: 'Comment ma mairie peut rejoindre ?', a: 'Votre mairie peut activer la plateforme gratuitement. Rendez-vous sur /mairie-candidature ou contactez-nous à contact@vlmconsulting.fr.' },
];

export default function PublicAssistant() {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [freeForm, setFreeForm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [intentCta, setIntentCta] = useState(null); // { label, url } from detectIntent
  const aiPublicEnabled = isAIEnabled('public_help');
  const navigate = useNavigate();

  const detectAndSetIntent = async (text) => {
    try {
      const res = await base44.functions.invoke('detectIntent', { text, source: 'assistant' });
      const data = res.data;
      if (data?.show_cta && data?.cta_label && data?.cta_url) {
        setIntentCta({ label: data.cta_label, url: data.cta_url });
      }
    } catch {
      // Non-bloquant — intent scoring best effort
    }
  };

  const handleSuggestion = (s) => {
    setAnswer(s.a);
    setError(null);
    setFreeForm('');
    setIntentCta(null);
    detectAndSetIntent(s.q);
  };

  const handleFreeForm = async (e) => {
    e.preventDefault();
    if (!freeForm.trim()) return;

    setLoading(true);
    setError(null);
    setIntentCta(null);
    const query = freeForm;

    // Lancer intent scoring en parallèle (non-bloquant)
    detectAndSetIntent(query);

    try {
      const res = await base44.functions.invoke('qwenAssist', {
        mode: 'public_help',
        user_input: query,
      });

      if (res.data?.success && res.data?.data?.text) {
        setAnswer(res.data.data.text);
        setFreeForm('');
      } else {
        setError('Service temporairement indisponible. Veuillez réessayer.');
      }
    } catch {
      setError('Service temporairement indisponible. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center font-black text-sm text-center leading-tight px-1"
          style={{ backgroundColor: '#FF6A00', color: 'white' }}
          title="Ouvrir l'assistant"
        >
          Besoin<br />d'aide ?
        </button>
      )}

      {/* Panneau assistant */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl shadow-2xl bg-white border-2 border-ink/10 flex flex-col max-h-96 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b-2 border-ink/5 shrink-0">
            <h3 className="font-black text-base" style={{ color: '#1D1836' }}>Besoin d'aide ?</h3>
            <button
              onClick={() => {
                setOpen(false);
                setAnswer(null);
                setFreeForm('');
                setError(null);
                setIntentCta(null);
              }}
              className="p-1 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#1D1836' }} />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div className="overflow-y-auto flex-1 p-5 space-y-3">
            
            {/* Réponse affichée */}
            {answer && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm leading-relaxed text-blue-900">{answer}</p>
              </div>
            )}

            {/* CTA contextuel detectIntent */}
            {intentCta && (
              <button
                onClick={() => {
                  setOpen(false);
                  if (intentCta.url.startsWith('/')) {
                    navigate(intentCta.url);
                  } else {
                    window.open(intentCta.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="w-full flex items-center justify-between gap-2 text-white font-black py-3 px-5 rounded-2xl text-sm transition-all hover:scale-105"
                style={{ backgroundColor: '#FF6A00' }}>
                <span>{intentCta.label}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Suggestions fixes (affichées si pas de réponse) */}
            {!answer && !error && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1D1836', opacity: 0.5 }}>Questions fréquentes</p>
                <div className="space-y-2">
                  {FIXED_SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(s)}
                      className="w-full text-left text-sm font-medium px-4 py-3 rounded-xl border-2 transition-all hover:shadow-sm"
                      style={{
                        borderColor: '#FF6A00',
                        color: '#FF6A00',
                        backgroundColor: 'white',
                      }}
                    >
                      {s.q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Champ libre */}
            {aiPublicEnabled && !answer && !error && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest mt-5" style={{ color: '#1D1836', opacity: 0.5 }}>Autre question</p>
                <form onSubmit={handleFreeForm} className="space-y-2">
                  <textarea
                    value={freeForm}
                    onChange={(e) => setFreeForm(e.target.value)}
                    placeholder="Posez votre question sur la plateforme ou votre commune..."
                    rows={3}
                    className="w-full text-sm border-2 rounded-xl p-3 focus:outline-none font-medium resize-none"
                    style={{
                      borderColor: 'rgba(29,24,54,0.15)',
                      color: '#1D1836',
                      backgroundColor: '#FFF8F1',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !freeForm.trim()}
                    className="w-full text-white font-black py-3 rounded-xl text-sm disabled:opacity-60 transition-all hover:scale-105 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#FF6A00' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Recherche…
                      </>
                    ) : (
                      'Envoyer'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Bouton retour après réponse */}
            {(answer || error) && (
              <button
                onClick={() => {
                  setAnswer(null);
                  setError(null);
                  setFreeForm('');
                  setIntentCta(null);
                }}
                className="w-full text-sm font-bold px-4 py-2 rounded-xl border-2 transition-colors"
                style={{
                  borderColor: '#FF6A00',
                  color: '#FF6A00',
                  backgroundColor: 'white',
                }}
              >
                ← Retour
              </button>
            )}
          </div>

          {/* Footer discret */}
          <div className="px-5 py-3 border-t-2 border-ink/5 bg-secondary text-center shrink-0">
            <p className="text-xs" style={{ color: '#1D1836', opacity: 0.4 }}>
              Assistant sans compte, sans historique
            </p>
          </div>
        </div>
      )}
    </>
  );
}