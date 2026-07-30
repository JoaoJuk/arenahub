# Arquitetura — ArenaHub

## Visão geral

```
┌─────────────┐     ┌──────────────────────────┐     ┌───────────────┐
│  App Mobile │────▶│        API (Fastify)      │────▶│  PostgreSQL   │
│ iOS/Android │     │  auth · arenas · reservas │     │  (SQLite dev) │
│ Expo + RN   │     │  split de pagamento       │     └───────────────┘
└─────────────┘     │  webhooks Mercado Pago    │
                    └───────────┬──────────────┘
┌─────────────┐                 │
│ Página web  │◀────────────────┘
│ do link de  │   Convidado abre o link, informa nome+telefone,
│ pagamento   │   escolhe Pix/cartão/presencial e paga a cota
└─────────────┘
```

## Stack e por quê

| Camada | Escolha | Motivo |
|---|---|---|
| Mobile | **Expo + React Native + TypeScript** | Um código para iPhone e Android; OTA updates; ecossistema maduro |
| Navegação | expo-router | Roteamento por arquivos, deep links nativos (essencial p/ links de reserva) |
| API | **Node.js + Fastify** | Leve, rápido, schema validation nativa |
| ORM | **Prisma** | Migrations versionadas; SQLite em dev, PostgreSQL em produção sem mudar código |
| Auth | JWT (access token) + bcrypt | Simples no MVP; migrar p/ refresh tokens + OAuth social na fase 2 |
| Pagamentos | **Mercado Pago** (Pix, cartão) com fallback simulado | Split de repasse p/ arenas via marketplace do MP na fase 2 |
| Link de divisão | Página web server-rendered pela própria API | Convidado **não precisa instalar o app** — atrito zero |

## Modelo de dados (núcleo)

- **User** — jogador ou dono de arena (`role`)
- **Arena** — estabelecimento (nome, cidade, endereço, esportes, fotos, rating)
- **Court** — quadra da arena (esporte, preço/hora, horário de funcionamento)
- **Booking** — reserva de uma quadra em um horário (status: pending → confirmed → done/cancelled; método: full, split, on_site)
- **SplitShare** — cota de um convidado no link (nome, telefone, forma de pagamento, status)
- **Payment** — transação (provider: mercadopago|mock, tipo pix/cartão, status, webhook id)

Disponibilidade é **calculada**, não armazenada: horários de funcionamento da quadra − reservas confirmadas/pendentes = slots livres. Evita milhões de linhas de "slots" e race conditions de sincronização.

## Decisões importantes

1. **Concorrência de reserva**: criação de booking roda em transação com verificação de conflito (`courtId + intervalo`). Dois jogadores não reservam o mesmo horário.
2. **Split por link**: o booking gera um `shareToken` (nanoid). A página `/s/:token` é pública; cada cota criada vira um `SplitShare` + `Payment`. Booking confirma quando 100% das cotas estão pagas/comprometidas (presencial conta como comprometida).
3. **Webhooks idempotentes**: eventos do Mercado Pago gravam `providerEventId` único — retries não duplicam pagamento.
4. **Pagamento presencial**: cota marcada `on_site`; arena confirma recebimento no check-in (painel, fase 2).

## Caminho de escala (quando crescer)

- SQLite → **PostgreSQL** (só trocar `DATABASE_URL`); depois read replicas
- Redis para cache de busca de arenas + rate limiting
- Fila (BullMQ) para webhooks, notificações push e e-mails
- Busca geoespacial: PostGIS (`ORDER BY location <-> user_point`)
- Observabilidade: OpenTelemetry + Sentry
- API atrás de load balancer; app é stateless — escala horizontal trivial
