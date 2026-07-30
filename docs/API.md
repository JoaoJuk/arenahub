# API — Referência (v1)

Base: `http://localhost:3333`. Auth: header `Authorization: Bearer <token>`.

## Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | /auth/register | `{name, email, phone, password}` → token |
| POST | /auth/login | `{email, password}` → token |
| GET | /me | Perfil do usuário logado |

## Arenas
| Método | Rota | Descrição |
|---|---|---|
| GET | /arenas | Lista/busca. Query: `q`, `sport`, `city` |
| GET | /arenas/:id | Detalhe + quadras |
| GET | /courts/:id/availability?date=YYYY-MM-DD | Slots livres do dia |
| POST | /arenas | Cria arena (role `owner`) |
| POST | /arenas/:id/courts | Cria quadra (role `owner`) |

## Reservas
| Método | Rota | Descrição |
|---|---|---|
| POST | /bookings | `{courtId, date, startTime, endTime, paymentMode: full\|split\|on_site, splitCount?}` |
| GET | /bookings/mine | Minhas reservas |
| GET | /bookings/:id | Detalhe + status das cotas |
| POST | /bookings/:id/cancel | Cancela (se pendente) |

Resposta de booking com `paymentMode: split` inclui `shareUrl` — o link para enviar aos amigos.

## Link de pagamento dividido (público, sem login)
| Método | Rota | Descrição |
|---|---|---|
| GET | /s/:token | Página web da divisão (HTML) |
| GET | /split/:token | JSON: reserva, valor da cota, cotas já pagas |
| POST | /split/:token/join | `{name, phone, method: pix\|card\|on_site}` → cria cota; se pix/card retorna `checkoutUrl` |

## Pagamentos
| Método | Rota | Descrição |
|---|---|---|
| POST | /webhooks/mercadopago | Webhook de confirmação (idempotente) |
| POST | /payments/:id/simulate | **Somente modo mock**: simula aprovação |
