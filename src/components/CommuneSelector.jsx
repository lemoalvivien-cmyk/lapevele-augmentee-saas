import { useState, useEffect, useRef } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

export default function CommuneSelector({ selectedCommune, onSelect, className = "" }) {
  const [communes, setCommunes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    fetch(`${window.location.origin}/api/apps/69c6b3f69a0c0e88e2529d4a/entities/Commune?q=${encodeURIComponent(JSON.stringify({ statut: "active" }))}&sort=nom`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setCommunes(arr);
        if (arr.length > 0 && !initRef.current) {
          initRef.current = true;
          onSelect(arr[0]);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`bg-white border-b-2 border-ink/10 px-4 py-3 flex justify-center ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#FF6A00" }} />
      </div>
    );
  }

  if (error) return null;
  if (communes.length <= 1) return null;

  return (
    <div className={`bg-white border-b-2 border-ink/10 px-4 py-3 flex justify-center ${className}`}>
      <div className="relative">
        <select
          value={selectedCommune?.id || ""}
          onChange={e => onSelect(communes.find(c => c.id === e.target.value))}
          className="appearance-none pr-10 pl-4 py-2.5 rounded-xl border-2 bg-white text-sm font-bold focus:outline-none"
          style={{ borderColor: "#FF6A00", color: "#1D1836" }}>
          {communes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-3 w-4 h-4 pointer-events-none" style={{ color: "#FF6A00" }} />
      </div>
    </div>
  );
}