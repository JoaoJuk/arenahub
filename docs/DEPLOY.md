# Guia de Lançamento — do seu PC para o público

Siga as etapas na ordem. Tempo estimado total: 1–2 dias de trabalho + 1–7 dias de revisão das lojas.

---

## Etapa 1 — Banco de dados na nuvem

O `dev.db` (SQLite) só funciona no seu PC. Em produção usamos PostgreSQL gerenciado.

1. Crie conta grátis no **Neon** (neon.tech) ou **Railway** (railway.app).
2. Crie um banco PostgreSQL e copie a **connection string** (algo como `postgresql://usuario:senha@host/db`).
3. No `apps/api/prisma/schema.prisma`, troque:
   ```prisma
   datasource db {
     provider = "postgresql"   // era "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
4. No `.env` de produção, `DATABASE_URL` = a connection string.
5. Rode as migrações no banco novo: `npx prisma migrate deploy`
6. Rode o seed se quiser dados iniciais: `npm run seed`

✅ Backup automático já vem incluso nesses provedores.

## Etapa 2 — Backend no ar

1. Crie um repositório **privado** no GitHub e suba o projeto (sem o `.env`! Confira que ele está no `.gitignore`).
2. No **Railway** ou **Render**: New Project → Deploy from GitHub → selecione o repo, root directory `apps/api`.
3. Configure as variáveis de ambiente no painel:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | connection string do PostgreSQL |
| `JWT_SECRET` | gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `BASE_URL` | a URL pública que o Railway te der |
| `CORS_ORIGINS` | domínios do seu app/site, separados por vírgula |
| `MP_ACCESS_TOKEN` | token de PRODUÇÃO do Mercado Pago |
| `EMAIL_API_KEY` / `SMS_API_KEY` | chaves dos provedores (etapa 3) |
| `TZ_APP` | `America/Sao_Paulo` |

4. Teste: abra `https://SUA-URL/health` → deve responder `{"ok":true}`.

⚠️ As travas de segurança que criamos dependem do `NODE_ENV=production`: sem ele, o pagamento simulado e os códigos de verificação visíveis ficam ativos.

## Etapa 3 — Serviços reais

**Mercado Pago:** crie a aplicação em mercadopago.com.br/developers, pegue o token de produção e cadastre o webhook `https://SUA-URL/webhooks/mercadopago`. Faça um pagamento Pix de R$ 1 pra validar.

**E-mail (códigos de verificação):** Resend (resend.com) — grátis até 3.000/mês. Pegue a API key e configure `EMAIL_API_KEY` (me peça para plugar o envio real quando contratar).

**SMS:** Twilio ou Zenvia (~R$ 0,30/SMS). Mesmo esquema: `SMS_API_KEY`.

## Etapa 4 — Legal

- **Política de privacidade** publicada numa URL pública (as lojas exigem). Deve citar: dados coletados (nome, e-mail, telefone, CPF), finalidade, e como excluir a conta (o app já tem `DELETE /me`).
- **CNPJ** (MEI serve no começo) para receber os pagamentos das reservas e emitir nota.
- Termos de uso: regras de cancelamento/reembolso das reservas.

## Etapa 5 — Publicar o app nas lojas

1. Contas: **Google Play Console** (US$ 25, uma vez) e **Apple Developer** (US$ 99/ano).
2. No `apps/mobile`, defina a URL de produção: `EXPO_PUBLIC_API_URL=https://SUA-URL` (crie um arquivo `.env`).
3. Compile e envie pela nuvem da Expo (não precisa de Mac):
   ```cmd
   npm install -g eas-cli
   eas login
   eas build:configure
   eas build -p android
   eas build -p ios
   eas submit -p android
   eas submit -p ios
   ```
4. Preencha as fichas das lojas: descrição, screenshots (tire do app rodando), classificação etária, URL da política de privacidade.
5. Revisão: Google ~1–3 dias, Apple ~1–7 dias.

## Etapa 6 — Teste fechado antes de liberar

- **Android:** Play Console → Teste interno → convide por e-mail.
- **iPhone:** TestFlight → convide até 100 pessoas sem revisão completa.
- Rode 1–2 semanas com amigos e 1–2 arenas parceiras reais. Configure o **Sentry** (sentry.io, grátis) pra saber dos erros antes dos usuários reclamarem.

---

## Custos resumidos (primeiro ano)

| Item | Custo |
|---|---|
| Banco + backend (planos grátis/hobby) | R$ 0–30/mês |
| Google Play | US$ 25 (única vez) |
| Apple Developer | US$ 99/ano |
| E-mail (Resend) | grátis até 3k/mês |
| SMS | ~R$ 0,30 por verificação |
| Mercado Pago | % por transação (sem mensalidade) |

## Checklist final antes do público

- [ ] `NODE_ENV=production` e `JWT_SECRET` forte configurados
- [ ] `/health` respondendo na URL pública
- [ ] Pagamento Pix real de teste aprovado via webhook
- [ ] Código de verificação chegando por e-mail e SMS de verdade
- [ ] Política de privacidade no ar
- [ ] Sentry recebendo erros
- [ ] Teste fechado com pelo menos 10 pessoas e 1 arena real
