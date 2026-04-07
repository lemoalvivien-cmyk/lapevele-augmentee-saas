import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function AdminGuard({ children }) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-primary mb-3">Accès réservé aux administrateurs</h1>
          <p className="text-muted-foreground mb-6">
            Cet espace est exclusivement réservé aux super-administrateurs de la plateforme.
          </p>
          <Link to="/" className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl inline-block">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return children;
}