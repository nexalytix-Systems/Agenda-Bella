import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, CalendarCheck, TrendingUp, Award } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);

  const load = () => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/bookings"),
    ]).then(([s, u, b]) => {
      setStats(s.data);
      setUsers(u.data);
      setBookings(b.data);
    });
  };

  useEffect(load, []);

  const toggleFeatured = async (u) => {
    try {
      const now = new Date().toISOString();
      if (u.featured_until && u.featured_until > now) {
        await api.post("/admin/unfeature", { professional_id: u.id });
        toast.success("Destaque removido");
      } else {
        await api.post("/admin/feature", { professional_id: u.id, days: 7 });
        toast.success("Destacado por 7 dias");
      }
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const revenue = stats?.revenue?.[0]?.total || 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary/70 mb-2">Admin</p>
        <h1 className="font-serif-display text-4xl">Painel do estabelecimento</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard title="Usuários" value={stats?.users ?? "—"} icon={Users}/>
        <StatCard title="Profissionais" value={stats?.professionals ?? "—"} icon={Users}/>
        <StatCard title="Agendamentos" value={stats?.bookings ?? "—"} icon={CalendarCheck}/>
        <StatCard title="Receita (sinais)" value={`R$ ${revenue.toFixed(2)}`} icon={TrendingUp}/>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="mb-6 h-auto">
          <TabsTrigger value="bookings" data-testid="tab-admin-bookings">Agendamentos</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-admin-users">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings">
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {bookings.length === 0 && <div className="p-6 text-foreground/60">Nenhum agendamento.</div>}
            {bookings.map((b) => (
              <div key={b.id} className="p-4 flex items-center justify-between flex-wrap gap-3" data-testid={`admin-booking-${b.id}`}>
                <div>
                  <div className="font-medium">{b.service_name}</div>
                  <div className="text-sm text-foreground/60">{b.client_name} → {b.professional_name} · <span className="font-mono-time">{b.date} {b.start_time}</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">R$ {b.price.toFixed(2)}</span>
                  <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "outline" : "secondary"}>{b.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="users">
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {users.map((u) => {
              const isFeatured = u.featured_until && u.featured_until > new Date().toISOString();
              return (
                <div key={u.id} className="p-4 flex items-center justify-between flex-wrap gap-3" data-testid={`admin-user-${u.id}`}>
                  <div>
                    <div className="font-medium flex items-center gap-2">{u.name} {isFeatured && <Badge className="bg-primary"><Award size={10} className="mr-1"/>Destaque</Badge>}</div>
                    <div className="text-sm text-foreground/60">{u.email} · {[u.city, u.state].filter(Boolean).join(", ") || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.role === "profissional" && (
                      <Button size="sm" variant={isFeatured ? "outline" : "default"} onClick={() => toggleFeatured(u)} className="rounded-full" data-testid={`feature-btn-${u.id}`}>
                        <Award size={12} className="mr-1"/>{isFeatured ? "Remover destaque" : "Destacar 7d"}
                      </Button>
                    )}
                    <Badge variant="secondary">{u.role}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-[0.2em] text-foreground/50">{title}</span>
        <Icon size={16} className="text-primary" />
      </div>
      <div className="font-serif-display text-3xl">{value}</div>
    </div>
  );
}
