import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Mail, Building2 } from "lucide-react";

export default function ServicesMairie() {
  const [services, setServices] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommune, setSelectedCommune] = useState("tous");

  useEffect(() => {
    Promise.all([
      base44.entities.ServiceMunicipal.filter({ actif: true }, "nom"),
      base44.entities.Commune.filter({ statut: "active" }, "nom"),
    ]).then(([svc, com]) => {
      setServices(svc);
      setCommunes(com);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = selectedCommune === "tous"
    ? services
    : services.filter(s => s.commune === selectedCommune);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-10 text-center border-b-2 border-ink/8">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-5 border-2"
            style={{ backgroundColor: "#63C7FF", borderColor: "#1D1836", color: "#1D1836" }}>
            🏛️ Services municipaux
          </div>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-3" style={{ color: "#1D1836" }}>
            Les services de votre mairie
          </h1>
          <p className="text-base font-medium" style={{ color: "#1D1836", opacity: 0.55 }}>
            Retrouvez les services municipaux disponibles dans votre commune.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Filtre commune */}
        {communes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCommune("tous")}
              className="px-4 py-2 rounded-full text-xs font-black border-2 transition-all"
              style={{
                backgroundColor: selectedCommune === "tous" ? "#63C7FF" : "white",
                borderColor: selectedCommune === "tous" ? "#1D1836" : "rgba(29,24,54,0.15)",
                color: "#1D1836",
              }}>
              Toutes les communes
            </button>
            {communes.map(c => (
              <button key={c.id}
                onClick={() => setSelectedCommune(c.nom)}
                className="px-4 py-2 rounded-full text-xs font-black border-2 transition-all"
                style={{
                  backgroundColor: selectedCommune === c.nom ? "#63C7FF" : "white",
                  borderColor: selectedCommune === c.nom ? "#1D1836" : "rgba(29,24,54,0.15)",
                  color: "#1D1836",
                }}>
                {c.nom}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: "#1D1836" }} />
            <p className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Aucun service disponible</p>
            <p className="text-sm" style={{ color: "#1D1836", opacity: 0.5 }}>Les services municipaux seront affichés ici dès leur publication.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(service => (
              <div key={service.id} className="bg-white rounded-2xl border-2 p-5 hover:shadow-sm transition-shadow"
                style={{ borderColor: "rgba(29,24,54,0.08)", borderLeftWidth: "4px", borderLeftColor: "#63C7FF" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-black text-base" style={{ color: "#1D1836" }}>{service.nom}</h3>
                      {service.commune && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: "#63C7FF20", color: "#1D1836" }}>
                          📍 {service.commune}
                        </span>
                      )}
                    </div>
                    {service.code && (
                      <p className="text-xs font-medium mb-2" style={{ color: "#1D1836", opacity: 0.4 }}>
                        Code : {service.code}
                      </p>
                    )}
                    {service.email_notification && (
                      <a href={`mailto:${service.email_notification}`}
                        className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                        style={{ color: "#FF6A00" }}>
                        <Mail className="w-3.5 h-3.5" />
                        {service.email_notification}
                      </a>
                    )}
                  </div>
                  <span className="text-xs font-black px-3 py-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: "#B8F5C4", color: "#1D1836" }}>
                    ✓ Actif
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}