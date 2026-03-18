# Direct Contract — JobRadar Portugal

> A curated job board listing only Portuguese tech companies that hire directly — no middlemen, no staffing agencies, no salary dilution.

---

## PT — Porquê este projeto existe

Portugal tem um mercado de tecnologia vibrante e em crescimento, mas com uma característica que o distingue negativamente de outros mercados europeus: **uma proporção desproporcionalmente alta de consultorias e empresas de outsourcing a dominar as ofertas de emprego**.

Plataformas como o ITJobs.pt ou o Landing.jobs misturam, sem distinção, empresas produto com consultorias. O resultado é que a maior parte das vagas visíveis não são contratos diretos — são intermediários que faturam a diferença entre o que a empresa cliente paga e o que o programador recebe.

**Não estou contra as consultorias.** Têm o seu papel: permitem flexibilidade, financiam projetos que não justificam contratação permanente, e são muitas vezes a porta de entrada no mercado. O problema é quando se tornam o caminho *padrão* — quando um programador com 10 anos de experiência tem dificuldade em encontrar uma proposta direta sem passar por um intermediário.

### O que isto cria na prática

- **Estagnação salarial** — a consultoria precisa de margem. O salário oferecido ao programador é sempre limitado por essa equação.
- **Opacidade** — é difícil saber o que a empresa cliente realmente paga, o que torna a negociação desequilibrada.
- **Cansaço de processo** — entrevistas com a consultoria, depois com o cliente, às vezes com um segundo intermediário. O programador gasta energia enorme para chegar ao mesmo sítio.
- **Vínculo fraco** — o programador trabalha *para* uma empresa mas é *empregado de* outra. A progressão de carreira, a cultura, o investimento da empresa na pessoa — tudo isso fica diluído.
- **Precarização disfarçada** — uma prática cada vez mais comum é contratar como recibos verdes quem, na prática, trabalha como um funcionário a tempo inteiro: horário fixo, integração na equipa, dependência de um único cliente. É a aparência da flexibilidade com toda a instabilidade — sem direito a subsídio de férias, de natal, baixa médica ou proteção no desemprego. O risco é transferido para o trabalhador; a liquidez fica do lado da empresa.
- **Salário base artificialmente baixo** — para reduzir a carga fiscal, é prática comum estruturar a remuneração com um salário base mínimo complementado por bónus, ajudas de custo e quilometragens. No imediato parece atrativo, mas tem consequências sérias a longo prazo: é o salário base que determina as contribuições para a Segurança Social e, por consequência, o valor da reforma. Um profissional que trabalhou 30 anos com salário base de €800 e bónus de €2000 vai reformar-se como se tivesse ganho €800 a vida toda.

### O manifesto

Este projeto parte de uma premissa simples: **programadores merecem negociar diretamente com quem os vai contratar**.

Salários mais justos. Processos mais curtos. Relações de trabalho mais claras. É isso que a contratação direta permite — e é isso que este agregador tenta facilitar.

---

## EN — Why this project exists

Portugal has a growing and vibrant tech market, but with one distinguishing characteristic that sets it apart from other European markets: **a disproportionately high share of consultancies and outsourcing firms dominating job listings**.

Platforms like ITJobs.pt or Landing.jobs mix product companies and staffing agencies without distinction. The result: most visible job offers aren't direct contracts — they're intermediaries billing the difference between what the client company pays and what the developer actually receives.

**This is not an attack on consultancies.** They serve a purpose: they enable flexibility, fund projects that don't justify permanent headcount, and are often a first step into the market. The problem arises when they become the *default* path — when a developer with 10 years of experience struggles to find a direct offer without going through a middleman.

### What this creates in practice

- **Salary stagnation** — the agency needs a margin. The developer's salary is always constrained by that equation.
- **Opacity** — it's hard to know what the client company actually pays, which makes negotiation inherently unbalanced.
- **Process fatigue** — interviews with the agency, then with the client, sometimes with a second intermediary. Developers spend enormous energy to end up in the same place.
- **Weak employment bond** — the developer works *for* a company but is *employed by* another. Career progression, culture, the company's investment in the person — all of it gets diluted.
- **Disguised precarity** — an increasingly common practice is hiring developers as self-employed contractors ("recibos verdes") who, in practice, work exactly like full-time employees: fixed hours, embedded in the team, dependent on a single client. It's the appearance of flexibility with all the instability — no paid holidays, no Christmas bonus, no sick leave, no unemployment protection. The risk is transferred to the worker; the liquidity stays with the company.
- **Artificially low base salary** — to reduce the tax burden, it's common practice to structure compensation with a minimal base salary topped up with bonuses, meal allowances, and mileage payments. It may look attractive on paper, but it has serious long-term consequences: Social Security contributions — and therefore pension entitlements — are calculated on base salary only. A professional who worked 30 years with a €800 base salary and €2,000 in bonuses will retire as if they had earned €800 their entire career.

### The manifesto

This project starts from a simple premise: **developers deserve to negotiate directly with whoever is hiring them**.

Fairer salaries. Shorter processes. Clearer working relationships. That's what direct hiring enables — and that's what this job board is here to help with.

---

## What it does

**Direct Contract** is an automated aggregator that lists tech job openings exclusively from companies known to hire directly in Portugal — no agencies, no outsourcing firms, no intermediaries.

The list is curated and maintained. Companies are classified using an AI model that distinguishes product companies from consultancies based on job descriptions and company profiles.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Scraper | Python 3.12 + Playwright |
| Classifier | Claude claude-sonnet-4-20250514 |
| API | FastAPI + PostgreSQL |
| Database | Neon (PostgreSQL) |
| Frontend | Next.js 14 + Tailwind CSS |
| Cron | GitHub Actions (every 6h) |
| Deploy API | Render |
| Deploy Frontend | Vercel |

---

## Contributing

Know a Portuguese company that hires directly and isn't listed? Open an issue or submit a PR adding it to `db/seed/companies.json`.

Know a company that's been miscategorized? Same — open an issue.

---

*Built by a frontend developer with 10+ years in the Portuguese tech market, tired of the process.*
