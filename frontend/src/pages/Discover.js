import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, MapPin, ArrowRight, Search } from "lucide-react";

const CATS = ["Todos", "Barbearia", "Cabeleireira", "Manicure", "Estética"];

export default function Discover() {
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("Todos");
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = cat === "Todos" ? "/professionals" : `/professionals?category=${encodeURIComponent(cat)}`;
    api.get(url).then(({ data }) => setPros(data)).finally(() => setLoading(false));
  }, [cat]);

  const filtered = pros.filter((p) =>
    !q || p.name?.toLowerCase().includes(q.toLowerCase()) ||
    p.business_name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/70 mb-3">Explorar</p>
        <h1 className="font-serif-display text-4xl sm:text-5xl">Encontre seu profissional</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
          <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="discover-search-input"/>
        </div>
        <div className="flex flex-wrap gap-2">
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
      </div>

      {loading ? (
        <div className="text-foreground/60">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-foreground/60 py-12 text-center border border-dashed border-border rounded-xl" data-testid="discover-empty">Nenhum profissional encontrado.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <Link key={p.id} to={`/profissional/${p.id}`} className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary transition-colors" data-testid={`pro-card-${p.id}`}>
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
                    <Star size={14} className="fill-accent text-accent"/> 4,9
                  </div>
                </div>
                {p.bio && <p className="mt-3 text-sm text-foreground/60 line-clamp-2">{p.bio}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-foreground/70">
                    {p.services_count || 0} serviços {p.min_price ? `· a partir de R$ ${p.min_price.toFixed(2)}` : ""}
                  </div>
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
