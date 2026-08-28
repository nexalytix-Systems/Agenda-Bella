# AgendaBella — PRD

## Problem Statement
App de agendamento para barbearia, cabeleireira, estética de sobrancelhas, manicure etc. Login do cliente, escolha de horário conforme disponibilidade do profissional, perfil do profissional e pagamento integrado.

## User Choices (initial)
- Login: email/senha (JWT)
- Roles: Cliente + Profissional + Admin
- Pagamento: Sinal/entrada (30%) via Stripe (Flow A sandbox, tax_mode=diy, BRL)
- Idioma: pt-BR

## Architecture
- Backend: FastAPI + MongoDB (motor)
- Auth: JWT (cookie + Bearer header), bcrypt, seed admin
- Frontend: React + Tailwind + shadcn/ui + framer-motion
- Payments: Stripe Checkout — inline price_data (variable deposit)

## Personas
- Cliente: descobre profissionais, agenda, paga sinal, gerencia agendamentos
- Profissional: define serviços, disponibilidade, vê agenda, edita perfil
- Admin: dashboard estatísticas, usuários, agendamentos

## Implemented (v1 — 2026-02)
- Landing (bento hero, categorias, how-it-works)
- Auth (login + registro por role + categoria para profissional)
- Descobrir profissionais (filtro categoria + busca)
- Perfil profissional (foto/bio/serviços) + fluxo de agendamento (calendário + slots dinâmicos)
- Checkout Stripe (sinal 30%) + Success/Cancel
- Meus agendamentos (cliente): pagar/cancelar
- Painel profissional: serviços CRUD, disponibilidade CRUD, agenda, perfil
- Painel admin: stats, usuários, agendamentos
- Demo seed: 4 profissionais (Ana, Carlos, Beatriz, Juliana) com serviços e disponibilidade Seg-Sáb 09-18

## Backlog / Next
- P1: notificações email/SMS
- P1: avaliações reais dos profissionais
- P1: portfólio (múltiplas fotos por profissional)
- P2: pagamento total, cupons, planos por assinatura para o profissional
- P2: multi-establecimento com convite de profissionais pelo admin
