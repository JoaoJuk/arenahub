# ArenaHub 🏟️

**Marketplace que conecta jogadores a arenas esportivas** — encontre quadras, reserve horários, divida o pagamento com os amigos por link e descubra novas arenas. Funciona em **iPhone e Android** (React Native/Expo).

## O que o ArenaHub resolve

Marcar uma pelada com os amigos envolve duas dores: achar quadra com horário livre e, depois, correr atrás de cada um para dividir a conta. O ArenaHub junta as duas coisas num app só — reserva o horário e divide o pagamento por um link, sem que ninguém mais precise instalar nada.

## Funcionalidades

- 🔎 Busca de arenas por esporte e cidade, com horários livres calculados em tempo real
- 📅 Reserva de horário com três formas de pagamento: tudo, dividir por link ou presencial
- 🔗 **Divisão por link** — cada amigo abre o link (sem instalar o app), informa nome + telefone e paga sua cota via Pix, cartão ou presencial
- 👤 Área do jogador, 🏟️ painel do dono da arena (reservas, ocupação, receita) e 🛡️ área administrativa
- 💳 Integração com **Mercado Pago** (Pix e cartão), com modo simulado para desenvolvimento

## Stack

**Mobile:** React Native · Expo · TypeScript · expo-router
**Back-end:** Node.js · Fastify · Prisma ORM · PostgreSQL (SQLite em desenvolvimento)
**Autenticação:** JWT + bcrypt
**Pagamentos:** Mercado Pago (Pix/cartão) + fallback simulado

## Arquitetura

```
┌─────────────┐     ┌──────────────────────────┐     ┌───────────────┐
│  App Mobile │────▶│        API (Fastify)      │────▶│  PostgreSQL   │
│ iOS/Android │     │  auth · arenas · reservas │     │               │
│ Expo + RN   │     │  split de pagamento       │     └───────────────┘
└─────────────┘     │  webhooks Mercado Pago    │
                    └───────────┬──────────────┘
┌─────────────┐                 │
│ Página web  │◀────────────────┘
│ do link de  │   Convidado abre o link, informa nome+telefone,
│ pagamento   │   escolhe Pix/cartão/presencial e paga a cota
└─────────────┘
```

Monorepo com duas aplicações:

- `apps/mobile/` — app iOS/Android (Expo + React Native)
- `apps/api/` — API Node.js (Fastify + Prisma) e a página web do link de pagamento

Uma decisão de projeto que vale destacar: a **disponibilidade de horários é calculada**, não armazenada (horário de funcionamento da quadra menos as reservas confirmadas). Isso evita milhões de linhas de "slots" no banco e problemas de concorrência.

## Os três perfis

**Jogador** — busca arenas, reserva um horário, divide o pagamento por link e acompanha em tempo real quem já pagou.

**Dono da arena** — painel com as reservas do dia, ocupação e receita confirmada; cadastra as quadras (nome, esporte, preço/hora, horário de funcionamento), que aparecem na hora na busca dos jogadores.

**Admin** — visão geral da plataforma (usuários, arenas, reservas, GMV), gestão de usuários e moderação de reservas.

---

Projeto pessoal desenvolvido por [João Vitor Juk Lopes](https://github.com/JoaoJuk). Detalhes técnicos em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e [docs/ROADMAP.md](docs/ROADMAP.md).
