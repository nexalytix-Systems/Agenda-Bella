import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const session_id = params.get("session_id");
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    if (!session_id) return;
    let tries = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${session_id}`);
        if (data.payment_status === "paid") setStatus("paid");
        else if (tries++ < 15) setTimeout(poll, 2000);
        else setStatus("timeout");
      } catch { setStatus("error"); }
    };
    poll();
  }, [session_id]);

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      {status === "checking" && <Clock className="mx-auto text-primary mb-4" size={48} />}
      {status === "paid" && <CheckCircle2 className="mx-auto text-primary mb-4" size={48} />}
      {(status === "timeout" || status === "error") && <XCircle className="mx-auto text-destructive mb-4" size={48} />}

      <h1 className="font-serif-display text-4xl mb-3">
        {status === "checking" && "Confirmando pagamento…"}
        {status === "paid" && "Pagamento confirmado"}
        {status === "timeout" && "Processando…"}
        {status === "error" && "Erro ao verificar"}
      </h1>
      <p className="text-foreground/70 mb-8">
        {status === "paid" ? "Seu horário está garantido. Nos vemos em breve!" : "Isso pode levar alguns segundos."}
      </p>
      <Link to="/meus-agendamentos">
        <Button className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="payment-success-cta">Ver meus agendamentos</Button>
      </Link>
    </div>
  );
}

export function PaymentCancel() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <XCircle className="mx-auto text-destructive mb-4" size={48} />
      <h1 className="font-serif-display text-4xl mb-3">Pagamento cancelado</h1>
      <p className="text-foreground/70 mb-8">Você pode tentar novamente pela página de agendamentos.</p>
      <Link to="/meus-agendamentos">
        <Button className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="payment-cancel-cta">Voltar</Button>
      </Link>
    </div>
  );
}
