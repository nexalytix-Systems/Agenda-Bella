import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError, ORIGIN_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Star, Clock, DollarSign, Package as PackageIcon, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProfessionalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [service, setService] = useState(null);
  const [date, setDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get(`/professionals/${id}`).then(({ data }) => {
      setData(data);
      if (data.services?.length) setService(data.services[0]);
    });
    api.get(`/portfolio/professional/${id}`).then(({ data }) => setPortfolio(data));
  }, [id]);

  const buyPackage = async (pk) => {
    if (!user) { navigate("/entrar"); return; }
    try {
      const { data } = await api.post("/packages/checkout", { package_id: pk.id, origin_url: ORIGIN_URL });
      window.location.href = data.checkout_url;
    } catch (err) { toast.error(formatApiError(err)); }
  };

  useEffect(() => {
    if (!service || !date) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    api.get(`/professionals/${id}/slots`, { params: { date: toDateStr(date), service_id: service.id } })
      .then(({ data }) => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [service, date, id]);

  const handleBook = async () => {
    if (!user) {
      toast.info("Faça login para agendar");
      navigate("/entrar");
      return;
    }
    if (user.role !== "cliente") {
      toast.error("Somente clientes podem agendar");
      return;
    }
    if (!service || !selectedSlot) return;
    setBooking(true);
    try {
      const { data: b } = await api.post("/bookings", {
        professional_id: id,
        service_id: service.id,
        date: toDateStr(date),
        start_time: selectedSlot,
      });
      // Create Stripe checkout
      const { data: c } = await api.post("/payments/checkout", {
        booking_id: b.id,
        origin_url: ORIGIN_URL,
      });
      window.location.href = c.checkout_url;
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBooking(false);
    }
  };

  if (!data) return <div className="max-w-7xl mx-auto px-6 py-12 text-foreground/60">Carregando…</div>;
  const p = data.professional;
  const deposit = service ? (service.price * 0.3).toFixed(2) : "0.00";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid lg:grid-cols-12 gap-10">
        {/* LEFT — profile */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl overflow-hidden border border-border">
            <div className="aspect-[4/3] bg-secondary">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl font-serif-display text-primary/30">{p.name?.[0]}</div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="font-serif-display text-3xl leading-tight">{p.name}</h1>
                  {p.category && <Badge variant="secondary" className="mt-2">{p.category}</Badge>}
                </div>
                <div className="flex items-center gap-1 text-sm" data-testid="pro-rating">
                  <Star size={14} className="fill-accent text-accent"/>
                  {p.avg_rating ? `${p.avg_rating} (${p.reviews_count})` : "Novo"}
                </div>
              </div>
              {p.bio && <p className="mt-4 text-sm text-foreground/70 leading-relaxed">{p.bio}</p>}
              {data.availabilities?.length > 0 && (
                <div className="mt-5 text-sm text-foreground/60">
                  <div className="font-medium text-foreground mb-1">Horários de atendimento</div>
                  <div className="flex flex-wrap gap-2">
                    {data.availabilities.map((a) => (
                      <span key={a.id} className="font-mono-time text-xs bg-secondary rounded-full px-3 py-1">
                        {WEEKDAYS[a.weekday]} · {a.start_time}–{a.end_time}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — booking */}
        <div className="lg:col-span-7 space-y-8">
          {/* Services */}
          <div>
            <h2 className="font-serif-display text-2xl mb-4">Serviços</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.services.length === 0 && <div className="text-foreground/60">Sem serviços cadastrados.</div>}
              {data.services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setService(s)}
                  className={`text-left p-5 rounded-xl border transition-colors ${service?.id === s.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary"}`}
                  data-testid={`service-${s.id}`}
                >
                  <div className="font-medium">{s.name}</div>
                  {s.description && <div className="text-xs text-foreground/60 mt-1">{s.description}</div>}
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1 text-foreground/70"><Clock size={12}/> {s.duration_minutes} min</span>
                    <span className="flex items-center gap-1 font-medium"><DollarSign size={12}/> R$ {s.price.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <div>
              <h2 className="font-serif-display text-2xl mb-4 flex items-center gap-2"><ImageIcon size={18}/> Portfolio</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {portfolio.map((it) => (
                  <div key={it.id} className="aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={it.image_url} alt={it.caption} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" data-testid={`portfolio-img-${it.id}`}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Packages */}
          {data.packages?.length > 0 && (
            <div>
              <h2 className="font-serif-display text-2xl mb-4 flex items-center gap-2"><PackageIcon size={18}/> Pacotes de fidelidade</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {data.packages.map((pk) => {
                  const save = pk.regular_price - pk.price;
                  return (
                    <div key={pk.id} className="p-5 rounded-xl border border-border bg-card" data-testid={`package-${pk.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{pk.name}</div>
                          <div className="text-xs text-foreground/60 mt-1">{pk.sessions_count}× {pk.service_name}</div>
                        </div>
                        <Badge variant="secondary">-R$ {save.toFixed(2)}</Badge>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div className="text-xs text-foreground/50 line-through">R$ {pk.regular_price.toFixed(2)}</div>
                          <div className="text-lg font-medium">R$ {pk.price.toFixed(2)}</div>
                        </div>
                        <Button size="sm" onClick={() => buyPackage(pk)} className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid={`buy-pkg-${pk.id}`}>Comprar</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews */}
          {data.reviews?.length > 0 && (
            <div>
              <h2 className="font-serif-display text-2xl mb-4 flex items-center gap-2"><Star size={18}/> Avaliações</h2>
              <div className="space-y-3">
                {data.reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-border bg-card" data-testid={`review-${r.id}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {[1,2,3,4,5].map((n) => (
                          <Star key={n} size={12} className={n <= r.rating ? "fill-accent text-accent" : "text-foreground/20"}/>
                        ))}
                      </div>
                      <span className="text-sm font-medium">{r.client_name}</span>
                    </div>
                    {r.comment && <p className="text-sm text-foreground/70">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar + slots */}
          {service && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border p-4 bg-card">
                <div className="text-sm font-medium mb-2">Escolha a data</div>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={{ before: new Date() }}
                  className="rounded-md"
                  data-testid="booking-calendar"
                />
              </div>
              <div className="rounded-2xl border border-border p-5 bg-card">
                <div className="text-sm font-medium mb-3">Horários disponíveis</div>
                {loadingSlots ? (
                  <div className="text-foreground/60 text-sm">Carregando…</div>
                ) : slots.length === 0 ? (
                  <div className="text-foreground/60 text-sm" data-testid="slots-empty">Nenhum horário para esta data.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSlot(s)}
                        className={`time-slot-pill font-mono-time text-sm rounded-full px-4 py-2 border ${selectedSlot === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary"}`}
                        data-testid={`slot-${s}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {selectedSlot && (
                  <div className="mt-6 pt-5 border-t border-border">
                    <div className="text-sm text-foreground/70 mb-3">
                      <div className="flex justify-between"><span>Serviço</span><span>{service.name}</span></div>
                      <div className="flex justify-between"><span>Data</span><span className="font-mono-time">{toDateStr(date)} {selectedSlot}</span></div>
                      <div className="flex justify-between"><span>Valor total</span><span>R$ {service.price.toFixed(2)}</span></div>
                      <div className="flex justify-between font-medium text-foreground"><span>Sinal (30%)</span><span>R$ {deposit}</span></div>
                    </div>
                    <Button onClick={handleBook} disabled={booking} className="w-full rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="booking-confirm-btn">
                      {booking ? "Redirecionando…" : `Pagar sinal R$ ${deposit} e confirmar`}
                    </Button>
                    <div className="text-xs text-foreground/50 text-center mt-2">Pagamento seguro via Stripe. Restante pago no local.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
