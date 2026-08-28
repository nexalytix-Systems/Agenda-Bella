import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Calendar, Clock, User } from "lucide-react";

const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function ProfessionalDashboard() {
  const { user, refresh } = useAuth();
  const [services, setServices] = useState([]);
  const [avail, setAvail] = useState([]);
  const [bookings, setBookings] = useState([]);

  // service form
  const [sName, setSName] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sDur, setSDur] = useState("60");
  const [sDesc, setSDesc] = useState("");

  // avail form
  const [aWd, setAWd] = useState("0");
  const [aStart, setAStart] = useState("09:00");
  const [aEnd, setAEnd] = useState("18:00");

  // profile
  const [bio, setBio] = useState(user?.bio || "");
  const [photo, setPhoto] = useState(user?.photo_url || "");

  const loadAll = async () => {
    const [s, a, b] = await Promise.all([
      api.get("/services/mine"),
      api.get("/availability/mine"),
      api.get("/bookings/mine"),
    ]);
    setServices(s.data);
    setAvail(a.data);
    setBookings(b.data);
  };

  useEffect(() => { loadAll(); }, []);

  const addService = async (e) => {
    e.preventDefault();
    try {
      await api.post("/services", {
        name: sName,
        price: parseFloat(sPrice),
        duration_minutes: parseInt(sDur, 10),
        description: sDesc,
      });
      setSName(""); setSPrice(""); setSDur("60"); setSDesc("");
      toast.success("Serviço criado");
      loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const delService = async (id) => {
    try { await api.delete(`/services/${id}`); toast.success("Serviço removido"); loadAll(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const addAvail = async (e) => {
    e.preventDefault();
    try {
      await api.post("/availability", { weekday: parseInt(aWd, 10), start_time: aStart, end_time: aEnd });
      toast.success("Disponibilidade adicionada");
      loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const delAvail = async (id) => {
    try { await api.delete(`/availability/${id}`); loadAll(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.patch("/professionals/me", { bio, photo_url: photo });
      await refresh();
      toast.success("Perfil atualizado");
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary/70 mb-2">Painel do profissional</p>
        <h1 className="font-serif-display text-4xl">Olá, {user?.name}</h1>
      </div>

      <Tabs defaultValue="agenda" className="w-full">
        <TabsList className="mb-6 h-auto">
          <TabsTrigger value="agenda" data-testid="tab-agenda">Agenda</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">Serviços</TabsTrigger>
          <TabsTrigger value="availability" data-testid="tab-availability">Disponibilidade</TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile">Perfil</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda">
          <h2 className="font-serif-display text-2xl mb-4">Próximos atendimentos</h2>
          {bookings.length === 0 ? (
            <div className="text-foreground/60 py-10 text-center border border-dashed rounded-xl">Nenhum agendamento.</div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3" data-testid={`pro-booking-${b.id}`}>
                  <div>
                    <div className="font-medium">{b.service_name}</div>
                    <div className="text-sm text-foreground/70 flex flex-wrap gap-4 mt-1">
                      <span className="flex items-center gap-1"><User size={12}/>{b.client_name}</span>
                      <span className="flex items-center gap-1 font-mono-time"><Calendar size={12}/>{b.date}</span>
                      <span className="flex items-center gap-1 font-mono-time"><Clock size={12}/>{b.start_time}</span>
                    </div>
                  </div>
                  <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "outline" : "secondary"}>
                    {b.status === "pending_payment" ? "Aguardando" : b.status === "confirmed" ? "Confirmado" : "Cancelado"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-serif-display text-2xl mb-4">Novo serviço</h2>
              <form onSubmit={addService} className="space-y-3 p-5 rounded-xl border border-border bg-card">
                <div><Label>Nome</Label><Input value={sName} onChange={(e)=>setSName(e.target.value)} required data-testid="service-name-input"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={sPrice} onChange={(e)=>setSPrice(e.target.value)} required data-testid="service-price-input"/></div>
                  <div><Label>Duração (min)</Label><Input type="number" value={sDur} onChange={(e)=>setSDur(e.target.value)} required data-testid="service-duration-input"/></div>
                </div>
                <div><Label>Descrição</Label><Textarea value={sDesc} onChange={(e)=>setSDesc(e.target.value)} rows={2} data-testid="service-desc-input"/></div>
                <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="service-submit-btn"><Plus size={14} className="mr-1"/>Adicionar</Button>
              </form>
            </div>
            <div>
              <h2 className="font-serif-display text-2xl mb-4">Seus serviços</h2>
              {services.length === 0 && <div className="text-foreground/60">Nenhum serviço.</div>}
              <div className="space-y-2">
                {services.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between" data-testid={`service-item-${s.id}`}>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-foreground/60">{s.duration_minutes} min · R$ {s.price.toFixed(2)}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => delService(s.id)} data-testid={`service-del-${s.id}`}><Trash2 size={14}/></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="availability">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-serif-display text-2xl mb-4">Adicionar horário</h2>
              <form onSubmit={addAvail} className="space-y-3 p-5 rounded-xl border border-border bg-card">
                <div>
                  <Label>Dia da semana</Label>
                  <Select value={aWd} onValueChange={setAWd}>
                    <SelectTrigger data-testid="avail-weekday-select"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((w, i) => <SelectItem key={i} value={String(i)}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início</Label><Input type="time" value={aStart} onChange={(e)=>setAStart(e.target.value)} data-testid="avail-start-input"/></div>
                  <div><Label>Fim</Label><Input type="time" value={aEnd} onChange={(e)=>setAEnd(e.target.value)} data-testid="avail-end-input"/></div>
                </div>
                <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="avail-submit-btn"><Plus size={14} className="mr-1"/>Adicionar</Button>
              </form>
            </div>
            <div>
              <h2 className="font-serif-display text-2xl mb-4">Sua agenda</h2>
              <div className="space-y-2">
                {avail.length === 0 && <div className="text-foreground/60">Nenhum horário cadastrado.</div>}
                {avail.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between" data-testid={`avail-item-${a.id}`}>
                    <div>
                      <div className="font-medium">{WEEKDAYS[a.weekday]}</div>
                      <div className="text-sm text-foreground/60 font-mono-time">{a.start_time} – {a.end_time}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => delAvail(a.id)} data-testid={`avail-del-${a.id}`}><Trash2 size={14}/></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <form onSubmit={saveProfile} className="max-w-xl space-y-4 p-6 rounded-xl border border-border bg-card">
            <div>
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Conte sobre seu trabalho…" data-testid="profile-bio-input"/>
            </div>
            <div>
              <Label>URL da foto</Label>
              <Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" data-testid="profile-photo-input"/>
              {photo && <img src={photo} alt="preview" className="mt-3 rounded-lg w-40 h-40 object-cover border border-border"/>}
            </div>
            <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="profile-save-btn">Salvar</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
