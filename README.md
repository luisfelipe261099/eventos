# Casa Cheia

Plataforma para casas de eventos e bares: ingressos com **QR dinâmico**, **portaria que funciona sem internet**, **cardápio digital e comandas**, **app do promoter com geolocalização** e **painel com IA** (clientes VIP, produtos parados, previsão de público e campanhas).

> **Simulador:** abra `/simular` para ver uma noite completa com três celulares lado a lado (cliente, equipe e dono): compra, portaria, cardápio, bar, Pix e IA. No modo demo, as ações de cada visitante ficam salvas num cookie do navegador, comprimido, e são reaplicadas sobre os dados de exemplo. Por isso a simulação funciona na Vercel mesmo com servidores trocando, sem banco de dados.

> **Modo demo:** sem nenhuma variável de ambiente o app já roda com dados fictícios (12 sextas de histórico, o cliente "Rafael M." que gasta ~R$ 5 mil toda sexta, a caipirinha de kiwi parada etc.). Dá para subir na Vercel e apresentar no mesmo dia.

---

## Stack (tudo com plano gratuito para começar)

| Peça | Serviço | Custo para começar |
|---|---|---|
| Front + API | **Next.js 16** na **Vercel** (Hobby) | Grátis |
| Banco, tempo real, arquivos | **Supabase** (Postgres) | Grátis (500 MB) |
| IA (textos) | **Google Gemini Flash** via AI Studio | Grátis com limite diário |
| Pix | **Asaas** | Sem mensalidade, taxa por Pix recebido |
| WhatsApp | Links `wa.me` (equipe envia com 1 toque) | Grátis |
| Agendamento | **Vercel Cron** (1x por dia) | Grátis |

**Limites importantes:**
- **Vercel Hobby é só para uso pessoal e não comercial.** Serve para MVP e demonstração. Quando a primeira casa começar a pagar, migre para o plano Pro (US$ 20/mês).
- **Supabase grátis:** o projeto **pausa depois de 7 dias sem uso** e não tem backup automático. Para produção, use o Pro (US$ 25/mês).
- **Gemini grátis:** tem limite de requisições por dia e o Google pode usar os prompts para treinar modelos. Não mande dados pessoais de clientes nos prompts. O app já evita isso: a análise é feita em código e a IA só escreve os textos.
- **Cron no Hobby:** roda no máximo 1 vez por dia, com horário aproximado.

---

## Rodar no seu computador

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testes da IA, do QR e da geolocalização
```

## Subir na Vercel (modo demo, 5 minutos)

1. Crie um repositório no GitHub e envie esta pasta:
   ```bash
   git init && git add . && git commit -m "Casa Cheia MVP"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/vipflow.git
   git push -u origin main
   ```
2. Em **vercel.com → Add New → Project**, importe o repositório e clique em **Deploy**. Não precisa configurar nada.
3. Pronto: o app abre em modo demo.

## Operação do dia a dia

- **Financeiro** (`/admin/financeiro`): receita de ingressos e do bar, estornos e comissões por evento e por promoter. Exporta CSV no padrão do Excel brasileiro (resumo, ingressos, consumo, comissões) e um **backup completo em JSON**. Baixe o backup toda semana, porque o Supabase grátis não faz cópias automáticas.
- **Ingressos do evento** (`/admin/eventos/ID`): busca por nome ou telefone. Dá para **cancelar** um ingresso pendente ou **estornar** um pago: o Pix volta ao cliente pelo Asaas e a vaga é liberada. Ingresso que já entrou não pode ser estornado.
- **Flyers:** ficam guardados no próprio banco (tabela `media`) e são reduzidos para 1080×1350 no navegador antes do envio. São servidos em `/api/media/ID` com cache de 1 ano.
- **Segurança:**
  - Login com limite de 8 tentativas por IP a cada 15 minutos e comparação de senha em tempo constante.
  - Cabeçalhos `nosniff`, `Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy`.
- **Monitoramento:** `GET /api/health` responde 503 se o banco cair. Dá para ligar num monitor gratuito como o UptimeRobot.
- **Páginas legais:** `/termos`, `/privacidade` (LGPD) e `/cancelamento` (CDC art. 49). São **modelos**, então revise com um advogado.
- **No ingresso:** botões "Adicionar à agenda" (.ics com lembrete 3 h antes) e "Salvar no WhatsApp".
- **SEO:** `robots.txt` e `sitemap.xml` com os eventos. Os painéis ficam fora do Google.
- **Região:** as funções rodam em São Paulo (`gru1`, definido no `vercel.json`).
- **CI:** o GitHub Actions roda os testes, as migrações num Postgres e o build a cada push.

## Modelo de negócio: mensalidade + taxa por ingresso

A Casa Cheia é um SaaS: várias casas usam a mesma instalação, cada uma com a própria conta (`/cadastro`), o próprio painel e o próprio Asaas.

| Plano | Mensalidade | Taxa por ingresso pago | Mínimo por ingresso |
|---|---|---|---|
| Essencial | R$ 79 | 5% | R$ 1,00 |
| Pro | R$ 149 | 3,5% | R$ 0,80 |
| Lotado | R$ 299 | 2% | R$ 0,50 |

- Os valores ficam em `src/lib/plans.ts`. Todos os planos têm todos os recursos; a diferença é o volume.
- **Referência de mercado (11/2026):** ticketeiras cobram cerca de 10% por ingresso, com mínimo de R$ 2,00 a R$ 3,99, e repassam o dinheiro dias depois do evento. Sistemas de comanda custam de R$ 100 a R$ 300 por mês. Há um teste garantindo que nenhum volume sai mais caro que essa referência.
- **30 dias grátis** no cadastro. Ingresso grátis não paga taxa. Bar e comandas não pagam taxa.
- **Quem paga a taxa:** a casa escolhe em `/admin/plano`. Ou o cliente paga como taxa de serviço no checkout, ou a casa absorve.
- **Página de vendas:** `/planos`, com simulador de custo e formulário de contato.
- **Visão da plataforma:** `/plataforma` (entra só com a `ADMIN_PASSWORD`, e-mail em branco). Lista as casas, mensalidades, taxas do mês e pedidos de contato; troca plano, pausa uma casa, estende o período grátis e abre o painel de qualquer casa.

**Como a Casa Cheia recebe:**
- **Taxa por ingresso:** com `ASAAS_SPLIT_WALLET_ID` (walletId da conta Asaas da Casa Cheia), a taxa sai de cada Pix pelo split, em valor fixo. Sem a variável, a taxa fica gravada no ingresso e aparece como "a faturar".
- **Mensalidade:** com `VIPFLOW_ASAAS_API_KEY` (chave de API da conta Asaas da Casa Cheia), a casa assina em `/admin/plano` e paga por Pix, boleto ou cartão. Com 10 dias de atraso as vendas online da casa são pausadas, e voltam sozinhas quando ela paga. Sem a variável, a cobrança é manual e ninguém é pausado sozinho.

## Recebimento pela plataforma (padrão)

Com `VIPFLOW_ASAAS_API_KEY` configurada, a casa não precisa de conta Asaas: o Pix de cada venda cai na conta Asaas da Casa Cheia e a parte da casa é repassada para a chave Pix dela.

- **Extrato:** cada pagamento confirmado credita a casa (tabela `ledger`) com o que o cliente pagou, menos a tarifa do Asaas (`netValue`) e a taxa da plataforma. Comanda não paga taxa. O crédito é idempotente pelo id da cobrança.
- **Repasse:** botão **Receber agora** em `/admin/financeiro` (mínimo de R$ 5) e repasse automático na rotina diária para quem deixou ligado. Um repasse em andamento por casa (índice único). Transferência por Pix pela API (`POST /v3/transfers`), acompanhada pelos eventos `TRANSFER_*` do webhook e pela rotina diária.
- **Estorno:** sai da conta da plataforma; a casa devolve o valor pago menos a taxa da plataforma. Se já tinha sido repassado, o saldo fica negativo e é descontado das próximas vendas.
- **Configuração única (plataforma):** em `/plataforma`, **Configurar** liga o webhook da conta da plataforma (`/api/payments/webhook?v=plataforma`) e mostra a URL e o token da **validação de saque**. Cole os dois no Asaas em *Integrações → Mecanismos de segurança*. O endpoint `/api/payments/saque` só aprova repasses registrados pelo sistema e estorno de Pix; qualquer outra saída pela API é recusada.
- **Conciliação diária:** venda paga nos últimos 7 dias que ficou sem crédito (webhook perdido) é creditada na rotina diária.
- **Conta própria (opcional):** a casa ainda pode colar a chave de API do Asaas dela em `/admin/setup`; aí o Pix cai na conta dela e a taxa sai pelo split.
- **Atenção fiscal:** todo o dinheiro das vendas entra na conta da plataforma. Confirme com o contador o enquadramento (intermediação, notas e repasses) antes de crescer, principalmente sendo MEI.

## Pagamentos (Asaas)

- **Conta Asaas própria (opcional):** a casa cola a chave de API em `/admin/setup`; a chave fica cifrada no banco (AES-256-GCM) e o webhook é cadastrado na hora. O Pix cai direto na conta da casa.
- **Sem a chave**, a casa só distribui ingresso grátis. Aprovação automática existe apenas no modo demo ou com `PAYMENTS_TEST_MODE=1`.
- **Fluxo:** cliente no Asaas (CPF obrigatório) → cobrança `PIX` → QR Code e copia e cola → webhook `PAYMENT_RECEIVED`. Como reforço, o app consulta o status enquanto o cliente espera na tela.
- **Quando conta como pago:** só com status `RECEIVED`, porque `CONFIRMED` em Pix pode ser bloqueio cautelar.
- **Webhook por casa:** `/api/payments/webhook?v=ID_DA_CASA`, com token derivado da chave daquela casa. Um pagamento só quita o ingresso ou a comanda para o qual o próprio app gerou a cobrança.
- **Ingressos não pagos:** com Pix pendente há mais de 30 minutos, a cobrança é apagada no Asaas e a vaga volta ao lote (na tentativa de compra seguinte do evento e na rotina diária). Se o Asaas disser que já foi pago, o ingresso é confirmado; se um Pix chegar depois do cancelamento, o ingresso é reativado.
- **Ingresso barato:** se a taxa da plataforma passar do que sobra depois da tarifa do Asaas (reserva de R$ 2,00), o split não é enviado e a taxa fica como "a faturar". O Asaas calcula o split sobre o valor líquido e bloqueia o pagamento quando o split passa dele.

## Colocar em produção (dados reais)

1. **Conectar o banco:** na Vercel, abra o projeto → **Storage** → **Create Database** → **Supabase** ou **Neon** (plano grátis) → conecte ao projeto. A integração cria `POSTGRES_URL`.
2. **Variáveis:** `ADMIN_PASSWORD` (senha da plataforma), `CRON_SECRET` (obrigatória em produção) e `NEXT_PUBLIC_APP_URL`. As sessões e a cifra das chaves do Asaas usam `SESSION_SECRET` ou, na falta dela, o `SUPABASE_JWT_SECRET` que a integração do Supabase cria. Nunca a `ADMIN_PASSWORD`. Depois de haver casas com Pix ligado, não troque nem crie `SESSION_SECRET`: as chaves salvas deixam de abrir e cada casa precisa colar a sua de novo.
3. **Redeploy.** As tabelas são criadas no primeiro cadastro de casa, ou pelo botão em `/admin/setup` logado como plataforma. Cada migração de `supabase/migrations` roda uma única vez.
4. **Receber das casas:** cadastre `ASAAS_SPLIT_WALLET_ID` e `VIPFLOW_ASAAS_API_KEY` (veja acima).
5. **Cada casa**, depois de se cadastrar em `/cadastro`: liga o Pix em `/admin/setup`, cadastra eventos, cardápio, promoters e mesas, e escolhe o plano em `/admin/plano`.
6. **Opcionais:** `GEMINI_API_KEY` (textos por IA) e `WHATSAPP_*` (envio automático).

**Como o app escolhe o banco:** com `POSTGRES_URL`, fala direto com o Postgres. Sem ela, roda no modo demo.

**Garantias:**
- A venda de lote é atômica (função `reserve_ticket`), então não vende além da quantidade.
- O check-in é único por ingresso (`unique(ticket_id)`).
- Toda alteração do painel confere se o registro é da casa logada.

---

## Design

- **App do cliente (claro):** os flyers dos eventos são a cor da página. A interface usa preto, branco e cinza-claro, e o violeta da marca (`#8B2CF5`) aparece só no botão principal e na aba ativa.
- **Tipografia:** Archivo, auto-hospedada via `@fontsource-variable/archivo`, sem depender do Google Fonts. Títulos na largura condensada e peso 800 (classe `.poster`), com pegada de cartaz de festa.
- **Assinatura visual:** ingresso e comanda em formato de canhoto, com picote e recortes laterais (classes `.stub` e `.stub-cut`).
- **Operação (escuro):** portaria, promoter e painel usam o tema escuro (`.op`), mais confortável na balada.
- **Flyers:** em `public/posters` estão os flyers fictícios da demo. Em produção, cada evento usa `cover_url`; suba as imagens no bucket `flyers` do Supabase Storage, na proporção 4:5 (1080×1350).

## Mapa do app

| Rota | Quem usa | O que faz |
|---|---|---|
| `/planos` · `/cadastro` | casa interessada | Preços, simulador de custo e criação da conta |
| `/plataforma` | Casa Cheia | Casas, mensalidades, taxas do mês e pedidos de contato |
| `/admin/setup` | dono | Liga o Pix da casa e mostra o que falta |
| `/admin/plano` | dono | Plano, quem paga a taxa e mensalidade |
| `/admin/eventos` · `/admin/cardapio` · `/admin/promoters` · `/admin/casa` | dono | Cadastros |
| `/` | cliente | Vitrine: abas de categoria, carrossel de destaques, busca e agenda |
| `/conta` | cliente | Atalhos, meus ingressos e comanda aberta |
| `/e/[evento]` | cliente | Compra o ingresso via Pix (`?ref=ID_DO_PROMOTER` registra a indicação) |
| `/ingresso/[id]` | cliente | QR dinâmico que muda a cada 30 s e funciona offline |
| `/cardapio/[casa]?mesa=12` | cliente | Cardápio digital: pedido vai direto para a comanda |
| `/comanda/[id]` | cliente | Status dos pedidos, total, Pix e divisão da conta |
| `/simular` | apresentação | Simulador da noite completa com 3 celulares |
| `/bar` | equipe | Tela do bar: pedidos em tempo real |
| `/promoter` | promoter | Lista VIP, validação por GPS, link de venda e comissão |
| `/portaria` | equipe | Leitor de QR; valida **sem internet** e sincroniza depois |
| `/admin` | dono | Ao vivo, comandas, IA de clientes, IA do bar, previsão e marketing |

### Como a portaria funciona sem internet
1. Antes do evento, o aparelho da portaria baixa a lista de ingressos com as "sementes" secretas (botão **Baixar lista**).
2. O celular do cliente gera o código a cada 30 s com HMAC-SHA256 (`src/lib/qr.ts`).
3. A portaria confere a assinatura localmente em ~1 ms, bloqueia entrada duplicada e guarda o check-in numa fila.
4. Quando a internet volta, a fila sincroniza sozinha (`/api/door/sync`). No banco, `unique(ticket_id)` também impede entrada dupla.

### Como a IA funciona (`src/lib/insights.ts`)
- **Clientes:** cruza check-ins, comandas e dia da semana. Classifica cada um como VIP, VIP em potencial, frequente, em risco ou ocasional, e sugere uma ação. Exemplo: cliente que vai toda sexta e gasta R$ 5 mil recebe ingresso free na quinta.
- **Convites automáticos:** o Vercel Cron chama `/api/cron/vip-invites` todo dia às 14h. Na véspera do dia favorito de cada VIP, o sistema gera o ingresso free, escreve o convite e monta o envio pelo WhatsApp.
- **Bar:** faz o ranking de 28 dias e detecta os produtos parados. Sugere um preço promocional que nunca fica abaixo de 1,6× o custo. Com um clique, a promoção entra no cardápio por 4 h.
- **Previsão:** média ponderada das últimas edições do mesmo dia da semana. A partir dela, sugere bartenders, seguranças, portaria e estoque.
- **Marketing:** o Gemini escreve título, legenda e hashtags. Sem chave, o app usa modelos de texto prontos.

As regras são código puro e testado. O modelo de linguagem só escreve os textos, o que mantém o custo perto de zero e o resultado auditável.

---

## Estrutura

```
src/
  app/                 páginas (App Router) e API (app/api/*)
  components/          UI compartilhada, QR dinâmico
  lib/
    db.ts              acesso a dados: Supabase ou demo em memória
    repo.ts            regras de negócio (ingresso, comanda, promoter, portaria)
    insights.ts        motor de análise (clientes, produtos, previsão)
    ai.ts              Gemini (com reserva sem IA)
    qr.ts              QR dinâmico com HMAC, validável offline
    geo.ts             geofence (Haversine)
    payments.ts        Pix via Asaas (cliente, cobrança, QR, webhook)
    whatsapp.ts        wa.me / WhatsApp Cloud API
    invites.ts         rotina de convites VIP
supabase/
  migrations/0001_init.sql   tabelas, índices, RLS, views
  seed.sql                   dados iniciais
```

## Próximos passos sugeridos
1. **Usuários por função** (portaria, bar) em cada casa, no lugar do login único do dono, e recuperação de senha por e-mail.
2. **Cartão de crédito** no checkout, além do Pix.
3. **Webhook da conta da Casa Cheia** para atualizar a mensalidade na hora (hoje a situação é conferida na rotina diária e ao abrir `/admin/plano`).
4. **Realtime:** trocar o polling do painel de comandas pelo Supabase Realtime.
5. **Gerar imagens das campanhas** e publicar direto no Instagram (Meta Graph API).
