import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Clock, User, DollarSign, Star, Package as PackageIcon } from "lucide-react";

const STATUS_LABEL = {
  pending_payment: { label: "Aguardando pagamento", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 btn-press"
          data-testid={`star-${n}`}
        >
          <Star size={22} className={n <= value ? "fill-accent text-accent" : "text-foreground/30"} />
        </button>
      ))}
    </div>
  );
}

export default function MyBookings() {
  const [items, setItems] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [activeBooking, setActiveBooking] = useState(null);
  const [rateOpen, setRateOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/bookings/mine"),
      api.get("/packages/my-active").catch(() => ({ data: [] })),
    ]).then(([b, p]) => {
      setItems(b.data);
      setPackages(p.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cancel = async (id) => {
    try { await api.post(`/bookings/${id}/cancel`); toast.success("Cancelado"); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const pay = async (b) => {
    try {
      const { data } = await api.post("/payments/checkout", { booking_id: b.id, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const openRate = (b) => {
    setActiveBooking(b);
    setRating(5);
    setComment("");
    setRateOpen(true);
  };

  const submitRate = async () => {
    try {
      await api.post("/reviews", { booking_id: activeBooking.id, rating, comment });
      toast.success("Avaliação enviada, obrigado!");
      setRateOpen(false);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif-display text-4xl mb-8">Meus agendamentos</h1>

      {packages.length > 0 && (
        <div className="mb-8">
          <h2 className="font-serif-display text-2xl mb-3 flex items-center gap-2"><PackageIcon size={18}/> Meus pacotes</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {packages.map((pk) => (
              <div key={pk.id} className="p-4 rounded-xl border border-border bg-card flex items-center justify-between" data-testid={`my-package-${pk.id}`}>
                <div>
                  <div className="font-medium">{pk.package_name}</div>
                  <div className="text-xs text-foreground/60">{pk.service_name}</div>
                </div>
                <Badge variant="secondary">{pk.sessions_remaining} restantes</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-foreground/60">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="text-foreground/60 py-16 text-center border border-dashed border-border rounded-xl" data-testid="bookings-empty">Nenhum agendamento ainda.</div>
      ) : (
        <div className="space-y-4">
          {items.map((b) => {
            const s = STATUS_LABEL[b.status] || { label: b.status, variant: "secondary" };
            return (
              <div key={b.id} className="rounded-xl border border-border bg-card p-5" data-testid={`booking-item-${b.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={s.variant}>{s.label}</Badge>
                      {b.reviewed && <Badge variant="outline">Avaliado</Badge>}
                    </div>
                    <div className="font-serif-display text-2xl">{b.service_name}</div>
                    <div className="text-sm text-foreground/70 mt-1 flex flex-wrap gap-4">
                      <span className="flex items-center gap-1"><User size={12}/> {b.professional_name}</span>
                      <span className="flex items-center gap-1 font-mono-time"><Calendar size={12}/> {b.date}</span>
                      <span className="flex items-center gap-1 font-mono-time"><Clock size={12}/> {b.start_time}</span>
                      <span className="flex items-center gap-1"><DollarSign size={12}/> R$ {b.price.toFixed(2)} (sinal R$ {b.deposit.toFixed(2)})</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {b.status === "pending_payment" && (
                      <Button size="sm" onClick={() => pay(b)} className="rounded-full bg-primary hover:bg-primary/90" data-testid={`pay-btn-${b.id}`}>Pagar sinal</Button>
                    )}
                    {b.status === "confirmed" && !b.reviewed && (
                      <Button size="sm" variant="outline" onClick={() => openRate(b)} className="rounded-full" data-testid={`rate-btn-${b.id}`}><Star size={12} className="mr-1"/>Avaliar</Button>
                    )}
                    {b.status !== "cancelled" && (
                      <Button size="sm" variant="outline" onClick={() => cancel(b.id)} className="rounded-full" data-testid={`cancel-btn-${b.id}`}>Cancelar</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={rateOpen} onOpenChange={setRateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif-display text-2xl">Avaliar atendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-foreground/70 mb-2">Sua nota</div>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <div>
              <div className="text-sm text-foreground/70 mb-2">Comentário (opcional)</div>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} data-testid="review-comment-input"/>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitRate} className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="review-submit-btn">Enviar avaliação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
