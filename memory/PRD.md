# AgendaBella — PRD (Google da Beleza & Bem-Estar)

## Visão
Plataforma "Google da beleza & bem-estar" — descoberta geo, campanhas pagas, monetização por assinatura + boost.

## Roles
- Cliente (agenda, avalia, compra pacotes)
- Profissional (gerencia serviços, agenda, cupons, boost, assinatura)
- Admin (curadoria de destaques, dashboard geral)
- (Futuro) Estabelecimento/Loja com múltiplos profissionais

## Features Implementadas
### v1 (2026-02)
- Auth JWT + roles + admin seed (cassimiro77@gmail.com/admin123)
- Landing + Discover + Perfil profissional + Booking com calendário/slots
- Stripe Checkout — Sinal 30% BRL
- Painel profissional (serviços/disponibilidade/perfil) + Painel admin

### v2 (Avaliações + Portfolio + Pacotes + WhatsApp mock)
- Reviews 1-5 estrelas com comentário; média exibida no perfil e cards
- Portfolio — galeria de fotos por profissional
- Pacotes de fidelidade — combos com desconto, comprados via Stripe
- WhatsApp mock — notificações persistidas em `db.notifications` (aguardando Twilio)

### v3 (Google da Beleza)
- Categorias expandidas: Barbearia, Cabeleireira, Manicure, Estética, Massagem, Spa, Yoga, Pilates, Nutrição
- Geolocalização: lat/lng no cadastro/perfil; "Perto de mim" HTML5 no Discover; ordenação por distância (haversine)
- Boost pago (Stripe): 7d R$29,90 | 30d R$99,90 → aparece no topo com selo "Patrocinado"
- Cupons: profissional cria códigos com % OFF, validação com uses/expiry
- Destaques por Admin: featured 7 dias com selo "Destaque"
- Assinatura mensal (Stripe subscription): Pro R$49,90 | Premium R$99,90

## Backlog (P0/P1/P2)
- P0: Ativar Twilio WhatsApp real (aguardando credenciais do usuário)
- P0: Modelo de Loja/Estabelecimento com múltiplos profissionais (invite flow)
- P1: Aplicação de cupom no checkout do sinal (endpoint pronto, integrar UI)
- P1: Lembrete WhatsApp 24h antes (cron/agendado)
- P1: Consumo automático de pacote no booking (subtract session)
- P2: Mapa interativo Mapbox/Google
- P2: Analytics para profissional (views, conversão, receita)
- P2: Chat/mensagens cliente↔profissional

## Test Coverage
- 67/67 backend tests (iter1 24 + iter2 18 + iter3 25) — 100%
