# VipFlow · MVP

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
   git init && git add . && git commit -m "VipFlow MVP"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/vipflow.git
   git push -u origin main
   ```
2. Em **vercel.com → Add New → Project**, importe o repositório e clique em **Deploy**. Não precisa configurar nada.
3. Pronto: o app abre em modo demo.

## Pagamentos (Asaas)

- **Fluxo:**
  1. Cria (ou reaproveita) o cliente no Asaas. O CPF é obrigatório e é pedido no checkout.
  2. Cria a cobrança `PIX`.
  3. Mostra o QR Code e o copia e cola.
  4. Confirma pelo webhook `PAYMENT_RECEIVED`. Como reforço, consulta o status direto na API enquanto o cliente espera na tela.
- **Quando conta como pago:** Pix só é considerado pago com status `RECEIVED`, porque `CONFIRMED` em Pix pode ser um bloqueio cautelar.
- **Webhook:** o token é derivado da chave de API, então não precisa de variável extra. O botão em `/admin/setup` cadastra o webhook na conta da casa.
- **Ingressos não pagos:** com Pix pendente há mais de 2 horas, são cancelados pela rotina diária, e a vaga volta ao lote.

## Colocar em produção (dados reais)

1. **Conectar o banco:** na Vercel, abra o projeto → **Storage** → **Create Database** → **Supabase** (plano Free, região São Paulo) → conecte ao projeto. A integração cria sozinha `POSTGRES_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e as demais variáveis.
2. **Redeploy:** em Deployments → ⋯ → Redeploy, para o app ler as variáveis novas.
3. **Configuração em 1 clique:** abra `/admin/setup`, entre com a `ADMIN_PASSWORD` e clique em **Criar tabelas**. Depois cadastre a casa. As migrações de `supabase/migrations` rodam direto no Postgres, e cada uma só uma vez.
4. **Cadastros no painel:**
   - **Eventos:** nome, data, descrição, lotes e flyer, com upload para o Supabase Storage.
   - **Cardápio:** preço, custo e estoque. O custo alimenta a IA de promoções.
   - **Promoters:** cada um recebe um link individual, `/promoter?k=código`, para enviar pelo WhatsApp.
   - **Casa e mesas:** endereço, localização da porta para o GPS dos promoters e QR codes das mesas para imprimir.
5. **Pix (Asaas):** cadastre `ASAAS_API_KEY` na Vercel (sem ela, pagamentos são aprovados automaticamente em modo teste) e clique em **Configurar webhook** em `/admin/setup`. Comece com a chave do Sandbox (`$aact_hmlg_`) e troque pela de produção (`$aact_prod_`) para vender de verdade.
6. **Opcionais:**, `GEMINI_API_KEY` (textos por IA) e `WHATSAPP_*` (envio automático).

**Como o app escolhe o banco:**
- Com `POSTGRES_URL`, fala direto com o Postgres.
- Só com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, usa a API do Supabase.
- Sem nenhum dos dois, roda no modo demo.

**Garantias:** a venda de lote é atômica (função `reserve_ticket`), então não vende além da quantidade. O check-in é único por ingresso (`unique(ticket_id)`).

---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | chave do servidor (**nunca** exponha no front) |
| `ADMIN_PASSWORD` | senha do painel e da portaria |
| `CRON_SECRET` | protege a rotina diária de convites |
| `NEXT_PUBLIC_APP_URL` | ex.: `https://vipflow.vercel.app` |
| `GEMINI_API_KEY` | opcional, chave grátis do aistudio.google.com |
| `ASAAS_API_KEY` | chave de API do Asaas **da casa** (Pix cai direto na conta dela) |

5. Faça um novo deploy. O banner de "modo demo" some.



---

## Design

- **App do cliente (claro):** os flyers dos eventos são a cor da página. A interface usa preto, branco e cinza-claro, e o violeta VipFlow (`#8B2CF5`) aparece só no botão principal e na aba ativa.
- **Tipografia:** Archivo, auto-hospedada via `@fontsource-variable/archivo`, sem depender do Google Fonts. Títulos na largura condensada e peso 800 (classe `.poster`), com pegada de cartaz de festa.
- **Assinatura visual:** ingresso e comanda em formato de canhoto, com picote e recortes laterais (classes `.stub` e `.stub-cut`).
- **Operação (escuro):** portaria, promoter e painel usam o tema escuro (`.op`), mais confortável na balada.
- **Flyers:** em `public/posters` estão os flyers fictícios da demo. Em produção, cada evento usa `cover_url`; suba as imagens no bucket `flyers` do Supabase Storage, na proporção 4:5 (1080×1350).

## Mapa do app

| Rota | Quem usa | O que faz |
|---|---|---|
| `/admin/setup` | dono | Configuração e checklist de produção |
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
1. **Login real** com Supabase Auth (por telefone ou e-mail) para cliente, promoter e equipe, no lugar da senha única do painel.
2. **Multi-casa (SaaS):** adicionar `venue_id` nas consultas e nas políticas RLS por organização.
3. **Split de pagamento:** usar o split do Asaas (`split` com `walletId` da VipFlow) para cobrar a comissão da plataforma automaticamente em cada venda.
4. **Realtime:** trocar o polling do painel de comandas pelo Supabase Realtime.
5. **Gerar imagens das campanhas** e publicar direto no Instagram (Meta Graph API).
