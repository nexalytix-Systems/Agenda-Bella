import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, Clock, User, DollarSign } from "lucide-react";

const STATUS_LABEL = {
  pending_payment: { label: "Aguardando pagamento", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

export default function MyBookings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/bookings/mine").then(({ data }) => setItems(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cancel = async (id) => {
    try {
      await api.post(`/bookings/${id}/cancel`);
      toast.success("Agendamento cancelado");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const pay = async (b) => {
    try {
      const { data } = await api.post("/payments/checkout", { booking_id: b.id, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif-display text-4xl mb-8">Meus agendamentos</h1>

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
                    </div>
                    <div className="font-serif-display text-2xl">{b.service_name}</div>
                    <div className="text-sm text-foreground/70 mt-1 flex flex-wrap gap-4">
                      <span className="flex items-center gap-1"><User size={12}/> {b.professional_name}</span>
                      <span className="flex items-center gap-1 font-mono-time"><Calendar size={12}/> {b.date}</span>
                      <span className="flex items-center gap-1 font-mono-time"><Clock size={12}/> {b.start_time}</span>
                      <span className="flex items-center gap-1"><DollarSign size={12}/> R$ {b.price.toFixed(2)} (sinal R$ {b.deposit.toFixed(2)})</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {b.status === "pending_payment" && (
                      <Button size="sm" onClick={() => pay(b)} className="rounded-full bg-primary hover:bg-primary/90" data-testid={`pay-btn-${b.id}`}>Pagar sinal</Button>
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
    </div>
  );
}
