import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Auth({ mode = "login" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = params.get("role") === "profissional" ? "profissional" : "cliente";
  const { login, register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(initialRole);
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let u;
      if (mode === "register") {
        u = await register({ name, email, password, role, category: role === "profissional" ? category : undefined, phone });
        toast.success("Cadastro realizado!");
      } else {
        u = await login(email, password);
        toast.success(`Olá, ${u.name}`);
      }
      if (u.role === "profissional") navigate("/profissional");
      else if (u.role === "admin") navigate("/admin");
      else navigate("/descobrir");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl mb-2">{mode === "register" ? "Criar conta" : "Entrar"}</h1>
        <p className="text-sm text-foreground/60">
          {mode === "register" ? "Comece em segundos. Sem cartão." : "Bem-vindo(a) de volta."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <>
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required data-testid="auth-name-input"/>
            </div>
            <div>
              <Label>Tipo de conta</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="auth-role-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente" data-testid="auth-role-cliente">Cliente</SelectItem>
                  <SelectItem value="profissional" data-testid="auth-role-profissional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "profissional" && (
              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="auth-category-select"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Barbearia">Barbearia</SelectItem>
                    <SelectItem value="Cabeleireira">Cabeleireira</SelectItem>
                    <SelectItem value="Manicure">Manicure</SelectItem>
                    <SelectItem value="Estética">Estética</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="auth-phone-input" />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="auth-email-input"/>
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} data-testid="auth-password-input"/>
        </div>

        <Button type="submit" disabled={loading} className="w-full rounded-full bg-primary hover:bg-primary/90 btn-press" data-testid="auth-submit-btn">
          {loading ? "..." : mode === "register" ? "Criar conta" : "Entrar"}
        </Button>
      </form>

      <div className="mt-6 text-sm text-foreground/60 text-center">
        {mode === "register" ? (
          <>Já tem conta? <Link to="/entrar" className="text-primary hover:underline" data-testid="auth-goto-login">Entrar</Link></>
        ) : (
          <>Sem conta? <Link to="/cadastro" className="text-primary hover:underline" data-testid="auth-goto-register">Criar conta</Link></>
        )}
      </div>
    </div>
  );
}
