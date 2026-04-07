import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, UserPlus, ArrowLeft } from "lucide-react";

export default function CreerUnCompte() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      base44.auth.redirectToLogin("/mon-profil");
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold mb-8 hover:underline" style={{ color: "#FF6A00" }}>
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl border-2 border-ink/10 p-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: "#FFD84D" }}>
            <UserPlus className="w-7 h-7" style={{ color: "#1D1836" }} />
          </div>

          <h1 className="text-3xl font-black mb-2" style={{ color: "#1D1836" }}>Créer mon compte</h1>
          <p className="text-base mb-8 font-medium" style={{ color: "#1D1836", opacity: 0.55 }}>
            Rejoignez la communauté. Aucun mot de passe — juste un lien par email.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2" style={{ color: "#1D1836", opacity: 0.5 }}>
                Votre email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                required
                className="w-full rounded-xl px-4 py-3.5 text-base font-medium border-2 focus:outline-none transition-colors"
                style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "white" }}
              />
            </div>

            {error && (
              <p className="text-sm font-bold" style={{ color: "#FF6A00" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full text-white font-black py-4 text-base rounded-2xl shadow-lg transition-all hover:scale-105 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#FF6A00" }}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Redirection…</> : "Créer mon compte"}
            </button>
          </form>

          <div className="mt-6 rounded-2xl p-4 border-2" style={{ backgroundColor: "#FFD84D22", borderColor: "#FFD84D" }}>
            <p className="text-xs font-medium leading-relaxed" style={{ color: "#1D1836", opacity: 0.7 }}>
              🔒 Aucun mot de passe. Nous vous envoyons un lien de connexion sécurisé par email. Gratuit, sans engagement.
            </p>
          </div>

          <p className="text-center text-sm mt-6 font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>
            Déjà un compte ?{" "}
            <Link to="/se-connecter" className="font-black underline" style={{ color: "#FF6A00" }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}