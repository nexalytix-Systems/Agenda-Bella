import { useEffect, useState } from "react";
import api, { formatApiError, ORIGIN_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Calendar, Clock, User, Image as ImageIcon, Package as PackageIcon, Zap, Ticket, Award } from "lucide-react";

const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function ProfessionalDashboard() {
  const { user, refresh } = useAuth();
  const [services, setServices] = useState([]);
  const [avail, setAvail] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [packages, setPackages] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [plans, setPlans] = useState({});
  const [coCode, setCoCode] = useState("");
  const [coPct, setCoPct] = useState("15");
  const [coUses, setCoUses] = useState("100");

  // service form
  const [sName, setSName] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sDur, setSDur] = useState("60");
  const [sDesc, setSDesc] = useState("");

  // avail form
  const [aWd, setAWd] = useState("0");
  const [aStart, setAStart] = useState("09:00");
  const [aEnd, setAEnd] = useState("18:00");

  // portfolio form
  const [imgUrl, setImgUrl] = useState("");
  const [imgCap, setImgCap] = useState("");

  // package form
  const [pkName, setPkName] = useState("");
  const [pkService, setPkService] = useState("");
  const [pkCount, setPkCount] = useState("5");
  const [pkPrice, setPkPrice] = useState("");

  // profile
  const [bio, setBio] = useState(user?.bio || "");
  const [photo, setPhoto] = useState(user?.photo_url || "");
  const [city, setCity] = useState(user?.city || "");
  const [stateVal, setStateVal] = useState(user?.state || "");
  const [business, setBusiness] = useState(user?.business_name || "");
  const [address, setAddress] = useState(user?.address || "");

  const loadAll = async () => {
    const [s, a, b, pf, pk, co, pl] = await Promise.all([
      api.get("/services/mine"),
      api.get("/availability/mine"),
      api.get("/bookings/mine"),
      api.get(`/portfolio/professional/${user.id}`).catch(() => ({ data: [] })),
      api.get("/packages/mine").catch(() => ({ data: [] })),
      api.get("/coupons/mine").catch(() => ({ data: [] })),
      api.get("/subscription/plans").catch(() => ({ data: {} })),
    ]);
    setServices(s.data); setAvail(a.data); setBookings(b.data);
    setPortfolio(pf.data); setPackages(pk.data);
    setCoupons(co.data); setPlans(pl.data);
  };

  useEffect(() => { if (user?.id) loadAll(); /* eslint-disable-next-line */ }, [user?.id]);

  const addService = async (e) => {
    e.preventDefault();
    try {
      await api.post("/services", { name: sName, price: parseFloat(sPrice), duration_minutes: parseInt(sDur, 10), description: sDesc });
      setSName(""); setSPrice(""); setSDur("60"); setSDesc("");
      toast.success("Serviço criado"); loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
  };
  const delService = async (id) => {
    try { await api.delete(`/services/${id}`); loadAll(); } catch (err) { toast.error(formatApiError(err)); }
  };
  const addAvail = async (e) => {
    e.preventDefault();
    try {
      await api.post("/availability", { weekday: parseInt(aWd, 10), start_time: aStart, end_time: aEnd });
      toast.success("Adicionado"); loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
  };
  const delAvail = async (id) => { try { await api.delete(`/availability/${id}`); loadAll(); } catch (err) { toast.error(formatApiError(err)); } };

  const addImg = async (e) => {
    e.preventDefault();
    try {
      await api.post("/portfolio", { image_url: imgUrl, caption: imgCap });
      setImgUrl(""); setImgCap(""); toast.success("Foto adicionada"); loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
  };
  const delImg = async (id) => { try { await api.delete(`/portfolio/${id}`); loadAll(); } catch (err) { toast.error(formatApiError(err)); } };

  const addPkg = async (e) => {
    e.preventDefault();
    try {
      await api.post("/packages", { name: pkName, service_id: pkService, sessions_count: parseInt(pkCount, 10), price: parseFloat(pkPrice) });
      setPkName(""); setPkService(""); setPkCount("5"); setPkPrice("");
      toast.success("Pacote criado"); loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
  };
  const delPkg = async (id) => { try { await api.delete(`/packages/${id}`); loadAll(); } catch (err) { toast.error(formatApiError(err)); } };

  const addCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.post("/coupons", { code: coCode, discount_percent: parseInt(coPct, 10), max_uses: parseInt(coUses, 10) });
      setCoCode(""); setCoPct("15"); setCoUses("100");
      toast.success("Cupom criado"); loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
  };
  const delCoupon = async (id) => { try { await api.delete(`/coupons/${id}`); loadAll(); } catch (err) { toast.error(formatApiError(err)); } };

  const buyBoost = async (plan) => {
    try {
      const { data } = await api.post("/boost/checkout", { plan, origin_url: ORIGIN_URL });
      window.location.href = data.checkout_url;
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const subscribe = async (plan) => {
    try {
      const { data } = await api.post("/subscription/checkout", { plan, origin_url: ORIGIN_URL });
      window.location.href = data.checkout_url;
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.patch("/professionals/me", { bio, photo_url: photo, city, state: stateVal, business_name: business, address });
      await refresh(); toast.success("Perfil atualizado");
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary/70 mb-2">Painel do profissional</p>
        <h1 className="font-serif-display text-4xl">Olá, {user?.name}</h1>
      </div>

      <Tabs defaultValue="agenda" className="w-full">
        <TabsList className="mb-6 h-auto flex-wrap">
          <TabsTrigger value="agenda" data-testid="tab-agenda">Agenda</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">Serviços</TabsTrigger>
          <TabsTrigger value="availability" data-testid="tab-availability">Disponibilidade</TabsTrigger>
          <TabsTrigger value="portfolio" data-testid="tab-portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="packages" data-testid="tab-packages">Pacotes</TabsTrigger>
          <TabsTrigger value="coupons" data-testid="tab-coupons">Cupons</TabsTrigger>
          <TabsTrigger value="boost" data-testid="tab-boost">Boost</TabsTrigger>
          <TabsTrigger value="subscription" data-testid="tab-subscription">Assinatura</TabsTrigger>
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
              <div className="space-y-2">
                {services.length === 0 && <div className="text-foreground/60">Nenhum serviço.</div>}
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
                    <SelectContent>{WEEKDAYS.map((w, i) => <SelectItem key={i} value={String(i)}>{w}</SelectItem>)}</SelectContent>
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

        <TabsContent value="portfolio">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-serif-display text-2xl mb-4 flex items-center gap-2"><ImageIcon size={18}/> Adicionar foto</h2>
              <form onSubmit={addImg} className="space-y-3 p-5 rounded-xl border border-border bg-card">
                <div><Label>URL da imagem</Label><Input value={imgUrl} onChange={(e)=>setImgUrl(e.target.value)} required placeholder="https://…" data-testid="portfolio-url-input"/></div>
                <div><Label>Legenda</Label><Input value={imgCap} onChange={(e)=>setImgCap(e.target.value)} data-testid="portfolio-caption-input"/></div>
                <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="portfolio-submit-btn"><Plus size={14} className="mr-1"/>Publicar</Button>
              </form>
              <p className="text-xs text-foreground/50 mt-3">Dica: cole URLs do Instagram, Unsplash ou qualquer host de imagens públicas.</p>
            </div>
            <div>
              <h2 className="font-serif-display text-2xl mb-4">Sua galeria</h2>
              {portfolio.length === 0 && <div className="text-foreground/60">Nenhuma foto ainda.</div>}
              <div className="grid grid-cols-3 gap-2">
                {portfolio.map((p) => (
                  <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border group" data-testid={`portfolio-item-${p.id}`}>
                    <img src={p.image_url} alt="" className="w-full h-full object-cover"/>
                    <button onClick={() => delImg(p.id)} className="absolute top-1 right-1 bg-background/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`portfolio-del-${p.id}`}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="packages">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-serif-display text-2xl mb-4 flex items-center gap-2"><PackageIcon size={18}/> Novo pacote</h2>
              <form onSubmit={addPkg} className="space-y-3 p-5 rounded-xl border border-border bg-card">
                <div><Label>Nome</Label><Input value={pkName} onChange={(e)=>setPkName(e.target.value)} required placeholder="Ex: Combo 5 Cortes" data-testid="pkg-name-input"/></div>
                <div>
                  <Label>Serviço</Label>
                  <Select value={pkService} onValueChange={setPkService}>
                    <SelectTrigger data-testid="pkg-service-select"><SelectValue placeholder="Selecione"/></SelectTrigger>
                    <SelectContent>
                      {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nº sessões</Label><Input type="number" min="2" value={pkCount} onChange={(e)=>setPkCount(e.target.value)} required data-testid="pkg-count-input"/></div>
                  <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={pkPrice} onChange={(e)=>setPkPrice(e.target.value)} required data-testid="pkg-price-input"/></div>
                </div>
                <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="pkg-submit-btn"><Plus size={14} className="mr-1"/>Criar pacote</Button>
              </form>
            </div>
            <div>
              <h2 className="font-serif-display text-2xl mb-4">Seus pacotes</h2>
              <div className="space-y-2">
                {packages.length === 0 && <div className="text-foreground/60">Nenhum pacote.</div>}
                {packages.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between" data-testid={`pkg-item-${p.id}`}>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-foreground/60">{p.sessions_count}× {p.service_name} · R$ {p.price.toFixed(2)}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => delPkg(p.id)} data-testid={`pkg-del-${p.id}`}><Trash2 size={14}/></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="coupons">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-serif-display text-2xl mb-4 flex items-center gap-2"><Ticket size={18}/> Novo cupom</h2>
              <form onSubmit={addCoupon} className="space-y-3 p-5 rounded-xl border border-border bg-card">
                <div><Label>Código</Label><Input value={coCode} onChange={(e)=>setCoCode(e.target.value.toUpperCase())} required placeholder="Ex: BEMVINDO15" data-testid="coupon-code-input"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Desconto (%)</Label><Input type="number" min="5" max="100" value={coPct} onChange={(e)=>setCoPct(e.target.value)} required data-testid="coupon-pct-input"/></div>
                  <div><Label>Nº usos</Label><Input type="number" min="1" value={coUses} onChange={(e)=>setCoUses(e.target.value)} required data-testid="coupon-uses-input"/></div>
                </div>
                <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="coupon-submit-btn"><Plus size={14} className="mr-1"/>Criar cupom</Button>
              </form>
              <p className="text-xs text-foreground/50 mt-3">Compartilhe o código nas suas redes sociais. Clientes aplicam no checkout do sinal.</p>
            </div>
            <div>
              <h2 className="font-serif-display text-2xl mb-4">Seus cupons</h2>
              <div className="space-y-2">
                {coupons.length === 0 && <div className="text-foreground/60">Nenhum cupom.</div>}
                {coupons.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between" data-testid={`coupon-item-${c.id}`}>
                    <div>
                      <div className="font-mono-time font-medium">{c.code}</div>
                      <div className="text-xs text-foreground/60">{c.discount_percent}% OFF · {c.used_count}/{c.max_uses} usos</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => delCoupon(c.id)} data-testid={`coupon-del-${c.id}`}><Trash2 size={14}/></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="boost">
          <h2 className="font-serif-display text-2xl mb-2 flex items-center gap-2"><Zap size={18}/> Turbine sua visibilidade</h2>
          <p className="text-sm text-foreground/60 mb-6">Perfis com Boost aparecem no topo da busca com selo "Patrocinado".</p>
          {user?.boosted_until && new Date(user.boosted_until) > new Date() && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
              Boost ativo até <span className="font-mono-time">{new Date(user.boosted_until).toLocaleString("pt-BR")}</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-6" data-testid="boost-7d-card">
              <div className="font-serif-display text-2xl mb-1">7 dias</div>
              <div className="font-medium text-3xl mb-3">R$ 29,90</div>
              <ul className="text-sm text-foreground/70 space-y-1 mb-4">
                <li>· Topo da busca por 7 dias</li>
                <li>· Selo "Patrocinado" no card</li>
                <li>· Prioridade em todas as categorias</li>
              </ul>
              <Button onClick={() => buyBoost("7d")} className="w-full rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="boost-buy-7d">Ativar 7 dias</Button>
            </div>
            <div className="rounded-xl border-2 border-primary bg-card p-6 relative" data-testid="boost-30d-card">
              <Badge className="absolute -top-2 right-4 bg-accent">Melhor valor</Badge>
              <div className="font-serif-display text-2xl mb-1">30 dias</div>
              <div className="font-medium text-3xl mb-3">R$ 99,90</div>
              <ul className="text-sm text-foreground/70 space-y-1 mb-4">
                <li>· Topo da busca por 30 dias</li>
                <li>· Selo "Patrocinado" no card</li>
                <li>· Estatísticas de visualizações (em breve)</li>
              </ul>
              <Button onClick={() => buyBoost("30d")} className="w-full rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="boost-buy-30d">Ativar 30 dias</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <h2 className="font-serif-display text-2xl mb-2 flex items-center gap-2"><Award size={18}/> Assinatura AgendaBella</h2>
          <p className="text-sm text-foreground/60 mb-6">Plano atual: <Badge variant="secondary">{user?.subscription_plan || "free"}</Badge></p>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(plans).map(([key, plan]) => (
              <div key={key} className={`rounded-xl border p-6 bg-card ${user?.subscription_plan === key ? "border-primary border-2" : "border-border"}`} data-testid={`plan-${key}`}>
                <div className="font-serif-display text-2xl mb-1">{plan.name}</div>
                <div className="font-medium text-3xl mb-3">R$ {plan.price.toFixed(2)}<span className="text-sm text-foreground/50">/mês</span></div>
                <ul className="text-sm text-foreground/70 space-y-1 mb-4">
                  {plan.features.map((f, i) => <li key={i}>· {f}</li>)}
                </ul>
                <Button
                  onClick={() => subscribe(key)}
                  disabled={user?.subscription_plan === key}
                  className="w-full rounded-full bg-primary hover:bg-primary/90 btn-press"
                  data-testid={`plan-btn-${key}`}
                >
                  {user?.subscription_plan === key ? "Plano atual" : "Assinar"}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <form onSubmit={saveProfile} className="max-w-xl space-y-4 p-6 rounded-xl border border-border bg-card">
            <div><Label>Nome comercial</Label><Input value={business} onChange={(e)=>setBusiness(e.target.value)} placeholder="Ex: Studio Ana" data-testid="profile-business-input"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cidade</Label><Input value={city} onChange={(e)=>setCity(e.target.value)} data-testid="profile-city-input"/></div>
              <div><Label>Estado (UF)</Label><Input value={stateVal} onChange={(e)=>setStateVal(e.target.value)} maxLength={2} data-testid="profile-state-input"/></div>
            </div>
            <div><Label>Endereço</Label><Input value={address} onChange={(e)=>setAddress(e.target.value)} data-testid="profile-address-input"/></div>
            <div><Label>Bio</Label><Textarea value={bio} onChange={(e)=>setBio(e.target.value)} rows={4} data-testid="profile-bio-input"/></div>
            <div>
              <Label>URL da foto</Label>
              <Input value={photo} onChange={(e)=>setPhoto(e.target.value)} placeholder="https://…" data-testid="profile-photo-input"/>
              {photo && <img src={photo} alt="preview" className="mt-3 rounded-lg w-40 h-40 object-cover border border-border"/>}
            </div>
            <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="profile-save-btn">Salvar</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
