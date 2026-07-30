# ArenaHub 🏟️

Marketplace que conecta jogadores a arenas esportivas — encontre quadras, reserve horários, divida o pagamento com os amigos por link e descubra novas arenas. Funciona em **iPhone e Android** (React Native/Expo).

> Nome genérico/placeholder. Troque quando definir a marca.

## Estrutura do monorepo

```
arenahub/
├── apps/
│   ├── api/        # Backend Node.js (Fastify + Prisma) + página web do link de pagamento
│   └── mobile/     # App iOS/Android (Expo + React Native + TypeScript)
├── docs/
│   ├── ARCHITECTURE.md   # Decisões técnicas e visão de escala
│   ├── API.md            # Referência dos endpoints
│   └── ROADMAP.md        # Fases do produto (MVP → startup)
└── README.md
```

## Rodando o MVP

### 1. Backend

```bash
cd apps/api
copy .env.example .env        # edite se quiser (token Mercado Pago etc.)
npm install
npx prisma migrate dev --name init
npm run seed                # cria arenas/quadras de exemplo + usuário demo
npm run dev                 # API em http://localhost:3333
```

Sem token do Mercado Pago, os pagamentos rodam em **modo simulado** (bom para desenvolver). Com `MP_ACCESS_TOKEN` no `.env`, gera cobranças reais (Pix/cartão).

### 2. App mobile

```bash
cd apps/mobile
npm install
npx expo start
```

Escaneie o QR code com o app **Expo Go** (iPhone ou Android), ou aperte `w` para abrir no navegador. Defina `EXPO_PUBLIC_API_URL` apontando para o IP da sua máquina (ex.: `http://192.168.0.10:3333`).

## 📌 Depois de atualizar o código (rode no cmd)

> Esta seção é atualizada sempre que uma mudança no backend exigir comandos.
> Execute na ordem, dentro de `C:\arenahub\apps\api`, com o servidor parado (Ctrl+C):

```cmd
cd C:\arenahub\apps\api
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

O que cada um faz: `npm install` baixa dependências novas · `npx prisma migrate dev` aplica mudanças no banco (se pedir um nome, digite qualquer coisa tipo `update`) · `npm run seed` atualiza os dados de exemplo/contas demo · `npm run dev` sobe a API de novo.

**Histórico de mudanças que exigiram comandos:**

| Data | Mudança | Comandos |
|---|---|---|
| 09/07 | Desempenho do dono (visualizações, avaliações, foto da quadra) | `npx prisma migrate dev --name desempenho` + `npm run seed` |
| 08/07 | Cadastro v2 (verificação e-mail/celular, CPF, CNPJ) | `npx prisma migrate dev --name cadastro_v2` |
| 08/07 | Fluxos de dono e admin (conta admin no seed) | `npm run seed` |
| 08/07 | Correções de segurança (rate limit) | `npm install` |
| 07/07 | Galeria de fotos das arenas | `npx prisma migrate dev --name arena_photos` + `npm run seed` |

## 🔍 Vendo o banco de dados

O banco é o arquivo `apps/api/prisma/dev.db` (SQLite). Para abrir um visualizador tipo planilha no navegador:

```cmd
cd C:\arenahub\apps\api
npx prisma studio
```

Abre em `http://localhost:5555` — clique numa tabela (User, Arena, Booking…) para ver e editar os dados. Use uma janela do cmd separada, assim o servidor continua rodando na outra.

## Contas de teste (senha `123456`)

| Perfil | Login | O que abre ao entrar |
|---|---|---|
| 👤 Jogador | `demo@arenahub.app` | Explorar, reserva, divisão por link, minhas reservas |
| 🏟️ Dono da arena | `arena@arenahub.app` | Painel do dia (reservas, ocupação, receita), cadastro de quadras |
| 🛡️ Admin | `admin@arenahub.app` | Estatísticas da plataforma, usuários (mudar papel), moderação de reservas |

O login detecta o papel e leva cada perfil para a sua área automaticamente.

## Fluxo do Jogador (MVP)

1. Busca arenas por esporte/cidade e vê horários livres.
2. Reserva um horário e escolhe: pagar tudo, **dividir por link** ou pagar presencialmente.
3. Ao dividir, o app gera um link. Cada amigo abre o link (não precisa do app), informa **nome + telefone**, escolhe **Pix, cartão ou presencial** e paga sua cota.
4. Organizador acompanha em tempo real quem já pagou.

## Fluxo do Dono da Arena

1. Entra com a conta `owner` → **Painel**: reservas de hoje, ocupação, receita confirmada e próximas reservas (com status da divisão).
2. Aba **Quadras**: cadastra a arena (primeiro acesso) e as quadras — nome, esporte, preço/hora, horário de funcionamento. A quadra aparece na hora na busca dos jogadores.
3. Fase 2: bloqueio de horários, fotos, financeiro com repasse automático.

## Fluxo do Admin

1. Entra com a conta `admin` → **Visão geral**: usuários, arenas, reservas, GMV e últimas reservas (com cancelamento de moderação).
2. Aba **Usuários**: lista todo mundo e promove jogador → dono de arena (ou o contrário).
3. Endpoints: `GET /admin/stats`, `GET /admin/users`, `GET /admin/arenas`, `PATCH /admin/users/:id/role`, `POST /admin/bookings/:id/cancel`.

Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e [docs/ROADMAP.md](docs/ROADMAP.md).
