import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Nav from "@/components/Nav";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Discover from "@/pages/Discover";
import ProfessionalProfile from "@/pages/ProfessionalProfile";
import MyBookings from "@/pages/MyBookings";
import ProfessionalDashboard from "@/pages/ProfessionalDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import { PaymentSuccess, PaymentCancel } from "@/pages/PaymentResult";

const BASENAME = process.env.REACT_APP_BASENAME || "";

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="max-w-7xl mx-auto p-12 text-foreground/60">Carregando…</div>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={BASENAME}>
        <Toaster position="top-center" />
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/entrar" element={<Auth mode="login" />} />
            <Route path="/cadastro" element={<Auth mode="register" />} />
            <Route path="/descobrir" element={<Discover />} />
            <Route path="/profissional/:id" element={<ProfessionalProfile />} />
            <Route path="/meus-agendamentos" element={<Protected roles={["cliente","admin"]}><MyBookings /></Protected>} />
            <Route path="/profissional" element={<Protected roles={["profissional"]}><ProfessionalDashboard /></Protected>} />
            <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
