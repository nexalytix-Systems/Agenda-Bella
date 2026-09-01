# AgendaBella — PRD (Google da Beleza & Bem-Estar)

## Visão
Plataforma "Google da beleza & bem-estar" — descoberta geo, campanhas pagas, monetização por assinatura + boost.

## Roles
- Cliente, Profissional, Admin
- (Futuro) Estabelecimento/Loja com múltiplos profissionais

## Deploy
- Frontend: GitHub Pages em `/Agenda-Bella` subpath — `nexalytix-systems.github.io/Agenda-Bella/`
- Backend: precisa Render/Fly/Emergent — configurado via `REACT_APP_BACKEND_URL` (GitHub → Settings → Variables → Actions)
- Auth: Bearer token via localStorage (sem cookies para evitar problemas de CORS cross-origin)

## Features Implementadas
### v1 — MVP
- Auth JWT + roles + admin seed (cassimiro77@gmail.com/admin123)
- Landing, Discover, Perfil profissional, Booking com calendário/slots
- Stripe Checkout — Sinal 30% BRL

### v2 — Reviews + Portfolio + Pacotes + WhatsApp mock
- Avaliações 1-5, média no perfil
- Portfolio galeria
- Pacotes fidelidade com desconto
- WhatsApp mock persistido em db.notifications

### v3 — Google da Beleza
- Categorias expandidas (beleza + bem-estar)
- Geolocalização HTML5 + haversine sort
- Boost pago 7d/30d
- Cupons por profissional
- Destaques por Admin
- Assinatura Pro/Premium (Stripe recurring)

### v4 — Deploy fixes (2026-02)
- BrowserRouter basename via `REACT_APP_BASENAME` env
- CORS `allow_credentials=False` (compatível com allow_origins=*)
- withCredentials=false; auth só via Bearer token localStorage
- GitHub Actions workflow `.github/workflows/deploy.yml` — Node 22, adaptável, sem cache

## Test Coverage
- Backend: 67/67 anteriores + iter4 verificação de Bearer sem cookies
