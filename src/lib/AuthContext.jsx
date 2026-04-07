import React, { createContext, useContext } from 'react';

// ─── Standalone offline AuthContext ────────────────────────────────────────
// La plateforme tourne en mode démo statique, sans backend. L'utilisateur est
// toujours anonyme, aucun appel réseau d'auth n'est effectué.
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const value = {
    user: null,
    isAuthenticated: false,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: { id: "demo", public_settings: {} },
    logout: () => { try { localStorage.removeItem("base44_access_token"); localStorage.removeItem("token"); } catch(_){} },
    navigateToLogin: () => { window.location.href = "/se-connecter"; },
    checkAppState: () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
