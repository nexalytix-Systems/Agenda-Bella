import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Scissors, Sparkles, ShieldCheck, ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";

const IMG_HERO = "https://images.unsplash.com/photo-1759142449398-89357aa1bb36?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBiYXJiZXJzaG9wJTIwaW50ZXJpb3J8ZW58MHx8fHwxNzg3OTIyNDA5fDA&ixlib=rb-4.1.0&q=85";
const IMG_NAIL = "https://images.unsplash.com/photo-1632345031435-8727f6897d53?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxuYWlsJTIwc2Fsb24lMjBtYW5pY3VyZXxlbnwwfHx8fDE3ODc5MjI0MDl8MA&ixlib=rb-4.1.0&q=85";
const IMG_PRO = "https://images.pexels.com/photos/3993455/pexels-photo-3993455.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden grain-overlay">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-12 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="lg:col-span-6">
            <p className="text-xs uppercase tracking-[0.24em] font-medium text-primary/70 mb-6" data-testid="hero-eyebrow">Agenda inteligente para beleza & bem-estar</p>
            <h1 className="font-serif-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-foreground">
              Reserve seu <em className="not-italic text-primary">momento</em>,<br/> pague o sinal, apareça.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-foreground/70 max-w-xl leading-relaxed">
              A plataforma que barbearias, cabeleireiros, manicures e estúdios de sobrancelha
              usam para receber clientes com horário garantido e pagamento seguro.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/descobrir")} className="rounded-full px-6 btn-press bg-primary hover:bg-primary/90" data-testid="hero-cta-book">
                Agendar agora <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/cadastro?role=profissional")} className="rounded-full px-6 btn-press" data-testid="hero-cta-pro">
                Sou profissional
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-foreground/60">
              <div className="flex items-center gap-1"><Star size={14} className="fill-accent text-accent" /> 4,9 avaliação</div>
              <div>+1.200 profissionais</div>
              <div>Sinal via Stripe</div>
            </div>
          </motion.div>

          <div className="lg:col-span-6 grid grid-cols-6 grid-rows-6 gap-3 h-[520px]">
            <motion.div initial={{ opacity:0, scale:0.98 }} animate={{ opacity:1, scale:1 }} transition={{ delay: 0.1 }} className="col-span-4 row-span-4 rounded-2xl overflow-hidden border border-border shadow-sm">
              <img src={IMG_HERO} alt="Barbearia moderna" className="w-full h-full object-cover" />
            </motion.div>
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.2 }} className="col-span-2 row-span-3 rounded-2xl overflow-hidden border border-border">
              <img src={IMG_NAIL} alt="Manicure" className="w-full h-full object-cover" />
            </motion.div>
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.3 }} className="col-span-2 row-span-3 rounded-2xl overflow-hidden border border-border">
              <img src={IMG_PRO} alt="Cabeleireira" className="w-full h-full object-cover" />
            </motion.div>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: 0.35 }} className="col-span-4 row-span-2 rounded-2xl bg-primary text-primary-foreground p-6 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-80"><Sparkles size={14}/> Ao vivo</div>
              <div>
                <div className="font-serif-display text-3xl leading-none">120+</div>
                <div className="text-sm opacity-80">agendamentos hoje na plataforma</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50 mb-3">Categorias</p>
          <h2 className="font-serif-display text-3xl sm:text-4xl mb-10">Para todo tipo de estúdio</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Barbearia", icon: Scissors, hint: "Cortes, barbas, degradê" },
              { name: "Cabeleireira", icon: Sparkles, hint: "Corte, coloração, escova" },
              { name: "Manicure", icon: Star, hint: "Manicure, pedicure, gel" },
              { name: "Estética", icon: ShieldCheck, hint: "Sobrancelhas, henna, design" },
              { name: "Massagem", icon: Sparkles, hint: "Relaxante, terapêutica" },
              { name: "Spa", icon: Sparkles, hint: "Day-spa, tratamentos" },
              { name: "Yoga", icon: Star, hint: "Aulas particulares" },
              { name: "Pilates", icon: ShieldCheck, hint: "Solo, aparelhos" },
            ].map((c) => (
              <div key={c.name} className="rounded-xl border border-border bg-card p-6 hover:border-primary transition-colors cursor-pointer" data-testid={`category-${c.name.toLowerCase()}`}>
                <c.icon className="text-primary mb-4" size={20} />
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-foreground/60">{c.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-secondary/40 border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="font-serif-display text-3xl sm:text-4xl mb-10">Como funciona</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Escolha o profissional", d: "Explore perfis, avaliações e serviços." },
              { n: "02", t: "Selecione data e horário", d: "Veja apenas os horários realmente livres." },
              { n: "03", t: "Pague o sinal (30%)", d: "Garantia mútua. O restante é pago no local." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl bg-card border border-border p-8">
                <div className="font-mono-time text-sm text-primary mb-4">{s.n}</div>
                <div className="font-serif-display text-2xl mb-2">{s.t}</div>
                <div className="text-sm text-foreground/70">{s.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link to="/descobrir" className="inline-flex items-center gap-2 text-primary hover:underline" data-testid="how-cta-discover">
              Ver profissionais <ArrowRight size={14}/>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-foreground/50">
        <div>AgendaBella · feito com carinho para estúdios de beleza</div>
      </footer>
    </div>
  );
}
