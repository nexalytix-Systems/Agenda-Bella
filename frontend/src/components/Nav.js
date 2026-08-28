import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CalendarClock, LogOut, User } from "lucide-react";

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isPro = user && user.role === "profissional";
  const isAdmin = user && user.role === "admin";
  const isClient = user && user.role === "cliente";

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-home-link">
          <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <CalendarClock size={18} />
          </span>
          <span className="font-serif-display text-2xl leading-none tracking-tight">AgendaBella</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/descobrir" className={({isActive}) => `hover:text-primary ${isActive ? "text-primary font-semibold" : "text-foreground/70"}`} data-testid="nav-discover-link">Descobrir</NavLink>
          {isClient && <NavLink to="/meus-agendamentos" className={({isActive}) => `hover:text-primary ${isActive ? "text-primary font-semibold" : "text-foreground/70"}`} data-testid="nav-my-bookings-link">Meus agendamentos</NavLink>}
          {isPro && <NavLink to="/profissional" className={({isActive}) => `hover:text-primary ${isActive ? "text-primary font-semibold" : "text-foreground/70"}`} data-testid="nav-pro-dashboard-link">Painel</NavLink>}
          {isAdmin && <NavLink to="/admin" className={({isActive}) => `hover:text-primary ${isActive ? "text-primary font-semibold" : "text-foreground/70"}`} data-testid="nav-admin-link">Admin</NavLink>}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:flex items-center gap-2 text-sm text-foreground/70" data-testid="nav-user-label">
                <User size={14} /> {user.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="btn-press" data-testid="nav-logout-btn">
                <LogOut size={14} className="mr-1" /> Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/entrar")} data-testid="nav-login-btn">Entrar</Button>
              <Button size="sm" onClick={() => navigate("/cadastro")} className="btn-press bg-primary hover:bg-primary/90" data-testid="nav-register-btn">Criar conta</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
