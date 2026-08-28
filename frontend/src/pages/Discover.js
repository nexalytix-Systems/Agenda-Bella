import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ArrowRight, Search, Zap, Award, Locate } from "lucide-react";
import { toast } from "sonner";

const CATS = ["Todos", "Barbearia", "Cabeleireira", "Manicure", "Estética", "Massagem", "Spa", "Yoga", "Pilates", "Nutrição"];

export default function Discover() {
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("Todos");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat !== "Todos") params.set("category", cat);
    if (city.trim()) params.set("city", city.trim());
    if (q.trim()) params.set("q", q.trim());
    if (coords) { params.set("client_lat", coords.lat); params.set("client_lng", coords.lng); }
    const url = `/professionals${params.toString() ? "?" + params.toString() : ""}`;
    const t = setTimeout(() => {
      api.get(url).then(({ data }) => setPros(data)).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [cat, city, q, coords]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocalização não suportada."); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        toast.success("Ordenando por proximidade");
      },
      (err) => { setGeoLoading(false); toast.error("Não foi possível obter sua localização"); }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-primary/70 mb-3">Explorar</p>
          <h1 className="font-serif-display text-4xl sm:text-5xl">Encontre profissionais perto de você</h1>
        </div>
        <Button variant={coords ? "default" : "outline"} onClick={useMyLocation} disabled={geoLoading} className="rounded-full btn-press" data-testid="geo-btn">
          <Locate size={14} className="mr-2"/> {coords ? "Localização ativa" : geoLoading ? "..." : "Perto de mim"}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
          <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="discover-search-input"/>
        </div>
        <div className="relative sm:w-64">
          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
          <Input placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} className="pl-9" data-testid="discover-city-input"/>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-4 py-2 text-sm border transition-colors ${cat === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}
            data-testid={`discover-cat-${c.toLowerCase()}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-foreground/60">Carregando…</div>
      ) : pros.length === 0 ? (
        <div className="text-foreground/60 py-12 text-center border border-dashed border-border rounded-xl" data-testid="discover-empty">Nenhum profissional encontrado.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pros.map((p) => (
            <Link key={p.id} to={`/profissional/${p.id}`} className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary transition-colors relative" data-testid={`pro-card-${p.id}`}>
              {(p.is_boosted || p.is_featured) && (
                <div className="absolute top-3 left-3 z-10 flex gap-1">
                  {p.is_boosted && <Badge className="bg-accent text-accent-foreground" data-testid={`badge-boost-${p.id}`}><Zap size={10} className="mr-1"/>Patrocinado</Badge>}
                  {p.is_featured && <Badge className="bg-primary text-primary-foreground"><Award size={10} className="mr-1"/>Destaque</Badge>}
                </div>
              )}
              <div className="aspect-[4/3] overflow-hidden bg-secondary">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-serif-display text-primary/40">{p.name?.[0]}</div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-serif-display text-2xl leading-tight">{p.name}</div>
                    {p.category && <Badge variant="secondary" className="mt-1">{p.category}</Badge>}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star size={14} className="fill-accent text-accent"/>
                    {p.avg_rating ? `${p.avg_rating} (${p.reviews_count})` : "Novo"}
                  </div>
                </div>
                {p.bio && <p className="mt-3 text-sm text-foreground/60 line-clamp-2">{p.bio}</p>}
                <div className="mt-2 flex items-center justify-between text-xs text-foreground/60">
                  <span className="flex items-center gap-1"><MapPin size={12}/>
                    {p.distance_km !== null ? `${p.distance_km} km` : [p.city, p.state].filter(Boolean).join(", ") || "—"}
                  </span>
                  <span>{p.services_count || 0} serviços {p.min_price ? `· a partir de R$ ${p.min_price.toFixed(2)}` : ""}</span>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <ArrowRight size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity"/>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
