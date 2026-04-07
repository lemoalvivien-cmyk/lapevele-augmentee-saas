import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Connexion() {
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (auth) navigate('/mon-espace', { replace: true });
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ backgroundColor: "#FF6A00" }}>
          <MapPin className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "#1D1836" }}>Connexion</h1>
        <p className="text-base mb-8 leading-relaxed font-medium" style={{ color: "#1D1836", opacity: 0.65 }}>
          Connectez-vous pour personnaliser votre expérience locale et suivre vos contributions.
        </p>
        <button
          onClick={() => base44.auth.redirectToLogin()}
          className="w-full text-white font-black py-5 rounded-2xl text-lg hover:scale-105 transition-all shadow-lg mb-4"
          style={{ backgroundColor: "#FF6A00" }}>
          Se connecter
        </button>
        <p className="text-sm font-medium mb-2" style={{ color: "#1D1836", opacity: 0.55 }}>
          Pas encore de compte ?{" "}
          <Link to="/agir" className="font-black underline underline-offset-4" style={{ color: "#FF6A00" }}>Contribuez sans compte</Link>
        </p>
      </div>
    </div>
  );
}