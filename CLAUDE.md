# CLAUDE.md — JobRadar Portugal
## Guia completo para o Claude Code

> Este arquivo é lido automaticamente pelo Claude Code ao abrir o projeto.
> Ele contém todo o contexto, arquitetura, convenções e tarefas do projeto.

---

## 🎯 O que é este projeto

**JobRadar Portugal** é um agregador de vagas de tecnologia em Portugal que lista
**apenas** empresas que contratam diretamente — sem consultorias, sem empresas de RH,
sem intermediários.

O diferencial: nenhum site português faz essa curadoria. O ITJobs.pt e o Landing.jobs
misturam consultorias com empresas produto. Este projeto resolve isso com um scraper
automatizado + classificador de IA.

---

## 🗂️ Estrutura do projeto

```
jobrador/
├── scraper/                  # Python - coleta e classifica vagas
│   ├── sources/
│   │   ├── base.py           # Interface RawJob + BaseSource
│   │   ├── careers_pages.py  # Playwright - scrapa /careers das empresas curadas
│   │   └── itjobs.py         # API pública do ITJobs.pt
│   ├── classifier.py         # Claude API - classifica consultoria vs produto
│   ├── deduplicator.py       # Hashing + extração de tech/seniority/remote
│   └── scheduler.py          # Entry point - orquestra tudo
│
├── api/                      # Python - FastAPI REST
│   ├── main.py               # App + CORS + /health + /stats
│   ├── models.py             # Pydantic schemas
│   └── routers/
│       ├── jobs.py           # GET /jobs, GET /jobs/filters, GET /jobs/{id}
│       └── companies.py      # GET /companies, GET /companies/{slug}
│
├── db/
│   ├── migrations/
│   │   └── 001_initial.sql   # Schema completo com pgvector
│   └── seed/
│       ├── companies.json    # ~50 empresas curadas com careers URLs
│       └── seed_companies.py # Script para popular o banco
│
├── frontend/                 # Next.js 14 + TypeScript + Tailwind
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx              # Homepage - listagem com filtros
│       │   └── empresas/
│       │       ├── page.tsx          # Lista todas as empresas por categoria
│       │       └── [slug]/page.tsx   # Detalhe da empresa + vagas ativas
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── JobCard.tsx
│       │   ├── FilterBar.tsx
│       │   ├── Pagination.tsx
│       │   └── StatsBar.tsx
│       └── lib/
│           ├── api.ts        # Cliente HTTP centralizado + tipos TypeScript
│           └── utils.ts      # formatDate, labels, helpers
│
├── .github/workflows/
│   └── scraper.yml           # Cron via GitHub Actions a cada 6h
│
├── docker-compose.yml        # Dev local: PostgreSQL + API + Frontend
├── Dockerfile.api
└── CLAUDE.md                 # ← este arquivo
```

---

## ⚙️ Stack técnica

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Scraper | Python 3.12 + Playwright | Renderiza SPAs/JavaScript |
| HTTP client | httpx (async) | Para a API do ITJobs |
| Classificador | Claude claude-sonnet-4-20250514 | Distingue consultoria vs produto |
| API | FastAPI + psycopg2 | Rápido, tipado, simples |
| Banco | PostgreSQL 16 + pgvector | Busca semântica futura |
| Hosting DB | Supabase (free tier) | PostgreSQL gerenciado grátis |
| Frontend | Next.js 14 App Router | SSR + cache nativo |
| Estilo | Tailwind CSS | Rápido, consistente |
| Cron | GitHub Actions | Grátis, sem servidor |
| Deploy API | Railway ou Render | Free tier suficiente |
| Deploy Front | Vercel | Free tier + edge |

---

## 🚀 Setup inicial (passo a passo)

### 1. Pré-requisitos

```bash
# Python 3.12+
python --version

# Node.js 20+
node --version

# Docker (para dev local)
docker --version
```

### 2. Clonar e instalar dependências Python

```bash
cd jobrador/

# Criar virtualenv
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Instalar dependências
pip install -r scraper/requirements.txt

# Instalar browser do Playwright
playwright install chromium
```

### 3. Instalar dependências do frontend

```bash
cd frontend/
npm install
cd ..
```

### 4. Variáveis de ambiente

```bash
# Criar arquivo .env na raiz do projeto
cat > .env << 'EOF'
# Banco de dados (Supabase ou PostgreSQL local)
DATABASE_URL=postgresql://jobrador:jobrador@localhost:5432/jobrador

# API da Anthropic (obter em https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# Frontend (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
```

### 5. Subir banco de dados local com Docker

```bash
# Sobe apenas o PostgreSQL com pgvector
docker-compose up db -d

# Aguarda estar saudável
docker-compose ps

# Roda a migration inicial
psql postgresql://jobrador:jobrador@localhost:5432/jobrador \
  -f db/migrations/001_initial.sql

# Popula com as empresas curadas
python db/seed/seed_companies.py
```

### 6. Subir a API

```bash
# Na raiz do projeto (com .venv ativo)
uvicorn api.main:app --reload --port 8000

# Testar
curl http://localhost:8000/health
curl http://localhost:8000/stats
```

### 7. Rodar o scraper pela primeira vez

```bash
# Dry run para ver o que seria coletado (sem gravar no banco)
python -m scraper.scheduler --dry-run

# Rodar de verdade (só ITJobs é mais rápido para testar)
python -m scraper.scheduler --source itjobs

# Rodar tudo
python -m scraper.scheduler --source all
```

### 8. Subir o frontend

```bash
cd frontend/

# Criar .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
# Abrir http://localhost:3000
```

---

## 🌐 Deploy em produção

### Banco de dados — Supabase

1. Criar projeto em https://supabase.com (free tier)
2. Ir em **SQL Editor** e rodar `db/migrations/001_initial.sql`
3. Copiar a **Connection String** (Settings → Database → Connection string → URI)
4. Guardar como secret `DATABASE_URL`

```bash
# Seed em produção
DATABASE_URL="postgresql://..." python db/seed/seed_companies.py
```

### API — Railway

1. Criar projeto em https://railway.app
2. Conectar repositório GitHub
3. Definir variáveis de ambiente:
   - `DATABASE_URL` (do Supabase)
   - `ANTHROPIC_API_KEY`
4. Railway detecta o `Dockerfile.api` automaticamente
5. Copiar a URL do deploy (ex: `https://jobrador-api.up.railway.app`)

### Frontend — Vercel

```bash
cd frontend/
npx vercel --prod

# Definir variável de ambiente no dashboard Vercel:
# NEXT_PUBLIC_API_URL = https://jobrador-api.up.railway.app
```

### GitHub Actions (Cron)

1. Ir em **Settings → Secrets** no repositório GitHub
2. Adicionar:
   - `DATABASE_URL` — connection string do Supabase
   - `ANTHROPIC_API_KEY` — chave da Anthropic
3. O workflow `.github/workflows/scraper.yml` roda automaticamente a cada 6h
4. Para rodar manualmente: **Actions → JobRadar Scraper → Run workflow**

---

## 📋 Tarefas pendentes (backlog)

Abaixo estão as próximas funcionalidades a implementar.
Quando o Claude Code estiver neste projeto, pode pedir para implementar qualquer uma.

### 🔴 Alta prioridade

- [ ] **Completar companies.json** — adicionar as 100+ empresas restantes da lista
  - Adicionar `job_selector` específico para cada empresa
  - Testar cada URL de careers manualmente
  - Arquivo: `db/seed/companies.json`

- [ ] **Scraper LinkedIn** — fonte importante de vagas diretas
  - Arquivo a criar: `scraper/sources/linkedin.py`
  - Usar Playwright com login (via cookies salvos)
  - Filtrar por empresa, não por palavra-chave
  - Atenção: LinkedIn bloqueia bots, usar rate limiting agressivo

- [ ] **Endpoint de busca semântica** — usar pgvector para "vagas parecidas"
  - Gerar embeddings ao inserir vagas (via OpenAI ou Anthropic embeddings)
  - Adicionar endpoint `GET /jobs/similar/{id}`
  - Arquivo: `api/routers/jobs.py`

- [ ] **Página de vaga individual** — `/vagas/[id]`
  - Mostrar descrição completa
  - Tech stack em destaque
  - Botão de candidatura direto
  - Arquivo a criar: `frontend/src/app/vagas/[id]/page.tsx`

### 🟡 Média prioridade

- [ ] **Alertas por email** — notificar quando vaga nova bater num critério
  - Stack sugerida: Resend (grátis até 3000 emails/mês)
  - Tabela `job_alerts` no banco
  - Endpoint `POST /alerts` para criar alerta

- [ ] **Score de vagas** — ranking automático por frescor + relevância
  - Penalizar vagas com > 30 dias
  - Boostar empresas com salário informado
  - Campo `score FLOAT` na tabela jobs

- [ ] **Logo das empresas** — buscar automaticamente via Clearbit ou favicon
  - `https://logo.clearbit.com/{domain}`
  - Salvar `logo_url` no banco

- [ ] **Filtro por salário** — quando informado na vaga
  - Extrator de salário no `deduplicator.py`
  - Campos `salary_min` e `salary_max` já existem no schema

- [ ] **Compartilhamento de vaga** — botão de copiar link
  - URL canônica: `jobrador.pt/vagas/{id}`

### 🟢 Nice to have

- [ ] **RSS feed** — `/feed.xml` com as últimas 50 vagas
- [ ] **API pública documentada** — Swagger já está em `/docs`, melhorar descrições
- [ ] **Dark mode** no frontend
- [ ] **Página de stats** — histórico de vagas coletadas por semana/mês
- [ ] **Sitemap.xml** gerado dinamicamente
- [ ] **PWA** — instalar como app no celular

---

## 🧪 Como testar

```bash
# Testar classifier isolado
python -c "
from scraper.classifier import classify_job
result = classify_job(
    title='Senior Python Developer',
    company_name='Aubay Portugal',
    description='O nosso cliente, empresa de referência no setor financeiro...'
)
print(result)
# Esperado: is_consulting=True
"

# Testar deduplicator
python -c "
from scraper.deduplicator import extract_tech_stack, extract_seniority
print(extract_tech_stack('React developer with Python and AWS experience'))
print(extract_seniority('Senior Backend Engineer'))
"

# Testar API
curl "http://localhost:8000/jobs?remote_type=remote&limit=5"
curl "http://localhost:8000/jobs/filters"
curl "http://localhost:8000/companies"
```

---

## 🐛 Problemas comuns

### Playwright não consegue acessar a página
```
TimeoutError: Timeout 20000ms exceeded
```
→ Aumentar timeout em `careers_pages.py` ou adicionar `wait_until="domcontentloaded"`
→ Alguns sites bloqueiam headless: adicionar `--disable-blink-features=AutomationControlled` nos args do browser

### pgvector não está instalado
```
ERROR: could not open extension control file "vector.control"
```
→ Usar imagem `pgvector/pgvector:pg16` no Docker (já configurado)
→ No Supabase, extensão pgvector já vem instalada

### Claude API rate limit
```
anthropic.RateLimitError: 429 Too Many Requests
```
→ Adicionar `time.sleep(0.5)` entre chamadas no `scheduler.py`
→ O fast-path de consultorias conhecidas já economiza ~60% das chamadas

### ITJobs retorna 403
→ API pública às vezes requer User-Agent específico
→ Adicionar header `User-Agent: Mozilla/5.0...` no httpx client

---

## 📐 Convenções de código

- **Python**: black + isort. Docstrings em português ou inglês.
- **TypeScript**: strict mode. Tipos explícitos, sem `any`.
- **Commits**: `feat:`, `fix:`, `chore:`, `docs:` (Conventional Commits)
- **Branches**: `feature/nome-da-feature`, `fix/nome-do-bug`
- **Não commitar**: `.env`, `.env.local`, `__pycache__`, `.next/`, `node_modules/`

---

## 💰 Custos operacionais estimados

| Serviço | Plano | Custo/mês |
|---------|-------|-----------|
| Supabase | Free | €0 |
| Railway (API) | Hobby | ~€5 |
| Vercel (Frontend) | Free | €0 |
| GitHub Actions | Free | €0 |
| Claude API (classifier) | Pay per use | ~€8–15 |
| **Total** | | **~€13–20** |

---

## 🔗 Links úteis

- Supabase: https://supabase.com
- Railway: https://railway.app
- Vercel: https://vercel.com
- Anthropic Console: https://console.anthropic.com
- Claude API docs: https://docs.anthropic.com
- Playwright docs: https://playwright.dev/python
- pgvector: https://github.com/pgvector/pgvector
- ITJobs: https://www.itjobs.pt
- Teamlyzer (referência de empresas): https://pt.teamlyzer.com
