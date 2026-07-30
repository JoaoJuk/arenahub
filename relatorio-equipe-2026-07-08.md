# Relatório da Equipe — ArenaHub — 08/07/2026

Análise feita por 3 especialistas virtuais: Revisor de Código, Cibersegurança e Gerente de Riscos.
Material analisado: backend (`apps/api`), app mobile (`apps/mobile`), schema do banco e configuração.

## Resumo executivo

O ArenaHub está num estado muito bom para um MVP: arquitetura limpa, senhas com hash, validação de entrada nas rotas e proteção contra os erros mais comuns (SQL injection, IDOR). Os problemas encontrados são típicos de projeto pré-lançamento e concentram-se em 3 frentes: **sessões que nunca expiram**, **configuração que pode falhar silenciosamente em produção** (segredo JWT e modo de pagamento simulado) e **uma condição de corrida na divisão de cotas**. Nada disso é difícil de corrigir — estimativa total: 1 a 2 dias de trabalho antes do deploy.

---

## 🔴 Crítico (resolver antes de qualquer coisa)

### 1. [Segurança] Token de login nunca expira
**Onde:** `apps/api/src/routes/auth.js` linhas 26 e 35 — `app.jwt.sign({ sub: user.id, role: user.role })` sem prazo.
**Cenário:** um token vazado (celular roubado, log, print) dá acesso à conta para sempre; não existe forma de invalidar.
**Correção:** registrar o plugin com expiração padrão em `server.js`:
```js
await app.register(jwt, { secret: process.env.JWT_SECRET, sign: { expiresIn: '7d' } });
```

### 2. [Segurança] Segredo JWT com fallback fraco
**Onde:** `apps/api/src/server.js` linha 15 — `process.env.JWT_SECRET || 'dev-secret'`.
**Cenário:** se a variável não for configurada no servidor de produção, o app sobe normalmente com segredo público — qualquer atacante forja um token de qualquer usuário (inclusive `role: admin`).
**Correção:** falhar o boot em produção:
```js
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET é obrigatório em produção');
}
```

### 3. [Segurança] Pagamento simulado protegido só por configuração
**Onde:** `apps/api/src/routes/webhooks.js` — `/payments/:id/simulate` e `/mock-pay/:id` desligam apenas quando `MP_ACCESS_TOKEN` existe (`isLive()`).
**Cenário:** deploy em produção com o token do Mercado Pago esquecido → qualquer pessoa "aprova" a própria reserva de graça chamando um POST público.
**Correção:** além de `isLive()`, bloquear quando `NODE_ENV === 'production'`.

---

## 🟠 Importante (resolver antes de lançar)

### 4. [Código] Condição de corrida na entrada de cotas do racha
**Onde:** `apps/api/src/routes/split.js` linhas 68–80 — a checagem `b.shares.length >= b.splitCount` e o `create` acontecem fora de transação.
**Cenário:** o racha tem 1 vaga e dois amigos clicam "Pagar minha parte" ao mesmo tempo → os dois entram e a divisão fica com 5/4 cotas (e cobrança a mais).
**Correção:** envolver checagem + criação em `prisma.$transaction` recontando as cotas dentro dela (mesmo padrão já usado em `bookings.js`).

### 5. [Segurança] Sem rate limiting
**Onde:** API inteira; os alvos sensíveis são `/auth/login` (força bruta de senha) e `/split/:token/join` (spam de cotas com nomes falsos).
**Correção:** `npm i @fastify/rate-limit` e registrar com ~100 req/min global e 10/min nas rotas sensíveis.

### 6. [Segurança] CORS aberto para qualquer origem
**Onde:** `server.js` linha 14 — `cors, { origin: true }`.
**Correção:** em produção, restringir à lista de domínios do app/site.

### 7. [Riscos] LGPD — dados de quem nem tem conta (prob. alta × impacto médio)
O link de divisão coleta **nome + telefone de convidados** sem cadastro. Antes das lojas: publicar política de privacidade (as lojas exigem a URL), citar a finalidade da coleta na própria página do link, e criar rota de exclusão de conta/dados.

### 8. [Riscos] Repasse manual às arenas (prob. média × impacto alto)
Hoje o dinheiro cai todo na conta Mercado Pago da plataforma; repassar na mão não escala e te torna intermediário financeiro (implicação fiscal e de confiança). **Mitigação:** ativar o split do Mercado Pago Marketplace na fase 2, antes de ter dezenas de arenas.

### 9. [Riscos] SQLite não aguenta produção (prob. alta × impacto alto)
Gravações concorrentes travam o arquivo. **Mitigação:** migrar para PostgreSQL gerenciado (Neon/Railway — grátis no início, backup automático) no dia do deploy; o schema já está pronto pra isso.

---

## 🟡 Melhorias (qualidade e manutenção)

- **[Código]** `GET /arenas` (`arenas.js` linha 8) carrega todas as arenas e filtra em JavaScript — funciona com 50 arenas, não com 5.000. Mover filtros para o `where` do Prisma quando o catálogo crescer.
- **[Código]** Arredondamento de cotas: `Math.ceil(160/3) = 53,34` → 3 cotas somam R$ 160,02. Definir regra: últimas cota paga a diferença, ou sobra vira crédito.
- **[Código]** Zero testes automatizados. Os 3 fluxos que merecem teste primeiro: conflito de reserva simultânea, entrada de cotas, idempotência do webhook.
- **[Código]** Timezone: `availability.js` usa a hora do servidor (`new Date().getHours()`) — num servidor em UTC os horários "passados" ficam errados em 3h. Fixar `TZ=America/Sao_Paulo` no ambiente ou calcular pelo fuso da arena.
- **[Código]** `maybeConfirm` é exportado de uma rota (`split.js`) e importado por outra (`webhooks.js`) — mover para `services/` para desacoplar.
- **[Segurança]** Token do app guardado em AsyncStorage (texto puro) → trocar por `expo-secure-store`. Senha mínima de 6 → 8 caracteres.
- **[Riscos]** Sem monitoramento de erros — Sentry tem plano grátis e avisa quando o app quebrar na mão de usuário real.

---

## 🟢 Pontos fortes (continue assim)

- **Autorização por recurso correta**: `bookings/:id` confere `userId`, rotas de arena conferem `ownerId` — sem IDOR, a falha mais comum em apps solo.
- **Senhas com bcrypt** e mensagem de login genérica (não revela se o e-mail existe).
- **Validação de schema Fastify** em todas as rotas de escrita — entrada validada antes de usar.
- **Transação anti-conflito** na criação de reserva: dois jogadores não reservam o mesmo horário.
- **Webhook idempotente** (`providerEventId` único) — retry do Mercado Pago não duplica pagamento.
- **Prisma** em tudo — sem SQL concatenado, sem injection.
- Monorepo organizado, docs de arquitetura/roadmap escritas, modo simulado bem isolado.

---

## Plano de ação sugerido

1. **Hoje (30 min):** itens 1, 2 e 3 — expiração do token, JWT_SECRET obrigatório, trava de produção nas rotas mock.
2. **Esta semana (1h):** item 4 — transação na entrada de cotas + regra de centavos.
3. **Esta semana (1h):** itens 5 e 6 — rate limit + CORS restrito.
4. **Antes do deploy (meio dia):** item 9 — PostgreSQL gerenciado + Sentry.
5. **Antes das lojas (1 dia):** item 7 — política de privacidade + exclusão de conta.
6. **Contínuo:** testes dos 3 fluxos críticos de pagamento.
7. **Fase 2:** item 8 — split de repasse do Mercado Pago + painel da arena.
