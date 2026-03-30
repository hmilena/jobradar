"""
Scraper para páginas /careers das empresas curadas em companies.json.
Usa Playwright para renderizar JavaScript antes de extrair links.
Para empresas com ATS conhecido (Greenhouse, Ashby, Lever), usa a API JSON diretamente.
"""
import json
import logging
from pathlib import Path
from typing import AsyncIterator
from urllib.parse import urljoin, urlparse

import httpx
from playwright.async_api import async_playwright, Browser, Page

from .base import BaseSource, RawJob

logger = logging.getLogger(__name__)

COMPANIES_FILE = Path(__file__).parent.parent.parent / "db" / "seed" / "companies.json"

# Palavras-chave no href que indicam links de vagas
JOB_HREF_KEYWORDS = [
    "job", "career", "career", "vaga", "emprego", "recrutamento",
    "oportunidade", "position", "opening", "vacanc", "offer", "opportunit"
]

# Palavras que NÃO devem aparecer no título (falsos positivos e não-tech)
SKIP_TITLE_KEYWORDS = [
    "cookie", "privacy", "terms", "sobre", "about", "contact",
    "blog", "news", "login", "register", "home", "menu",
    # Vagas não-tech
    "vendedor", "vendedora", "sales rep", "store manager", "hotel",
    "fitness instructor", "procurement", "real estate", "facilities",
    "legal counsel", "paralegal", "accountant", "controller",
    "hr manager", "recruiter", "office manager", "receptionist",
    "logistics", "supply chain", "warehouse", "driver", "motorista",
    "chef", "cozinheiro", "limpeza", "segurança", "porteiro",
    # Finanças / RH / Operações
    "payroll", "accounts payable", "accounts receivable", "order to cash",
    "procure-to-pay", "financial analyst", "finance analyst", "tax analyst",
    "tax specialist", "compliance analyst", "hrbp", "hr gbs", "hr specialist",
    "talent acquisition", "talent services", "global mobility", "mobility analyst",
    "immigration", "compensation", "benefits specialist", "treasury",
    "cash specialist", "cash analyst", "sox control", "trade compliance",
    "corporate real estate", "corporate development", "managing director",
    "m&a integration", "director of communications", "communications manager",
    "marketing manager", "brand manager", "sales director", "business development",
    # Suporte / Vendas / Não-tech
    "customer support", "support agent", "support specialist", "support representative",
    "account manager", "account executive", "sales engineer", "sales manager",
    "customer success", "customer experience", "client success",
    "technical account manager", "technical support",
    # Design não-tech
    "level designer", "game designer", "graphic designer", "motion designer",
    "visual designer", "brand designer", "illustrator",
    "discover all", "career opportunities", "view all",
    # C-suite / VP / Executivos — não são vagas de IC tech
    "vice president", "vp of", "vp,", "chief ", "ceo", "coo", "cfo", "cto,",
    "managing director", "executive director", "general manager",
    # Vibe coding e AI hype não-técnico
    "vibe coding", "vibe code", "vibe coder",
    # Marketing / Social / Conteúdo
    "social media", "content creator", "content manager", "content strategist",
    "copywriter", "seo specialist", "growth marketer", "email marketer",
    "community manager", "influencer",
    # RH / Operações adicionais
    "benefits manager", "people partner", "people operations",
    "grc consultant", "grc analyst", "risk consultant",
    "office coordinator", "executive assistant", "chief of staff",
    # Vendas adicionais
    "sales lead", "sales associate", "sales representative",
    "embedded sales", "revenue operations", "partnerships manager",
]

# Palavras-chave que indicam uma vaga tech
TECH_TITLE_KEYWORDS = [
    # Roles genéricos
    "engineer", "developer", "programador", "engenheiro", "architect",
    "devops", "sre", "platform", "infrastructure", "cloud",
    # Áreas
    "software", "frontend", "front-end", "backend", "back-end", "fullstack",
    "full-stack", "web", "mobile", "ios", "android",
    "data", "machine learning", "ml", "ai ", " ia ", "analytics",
    "security", "cybersecurity", "appsec",
    "qa", "quality assurance", "tester", "test ",
    "ux", "ui ", "product designer", "design",
    # Tecnologias
    "python", "java", "javascript", "typescript", "react", "angular", "vue",
    "node", "django", "spring", "kubernetes", "docker", "terraform",
    "sql", "database", "aws", "azure", "gcp",
    # Gestão tech
    "tech lead", "engineering manager", "cto", "cpo", "product manager",
    "product owner", "scrum master", "agile",
    # PT
    "tecnologia", "sistemas", "informática", "ti ", " ti,", "digital",
    "suporte técnico", "redes", "infraestrutura",
]


def is_tech_job(title: str) -> bool:
    """Verifica se o título da vaga é tech. Rejeita vagas não-tech (vendedor, logística, etc.)"""
    title_lower = title.lower()
    return any(kw in title_lower for kw in TECH_TITLE_KEYWORDS)


def is_job_link(href: str, text: str, careers_url: str = "") -> bool:
    """Heurística para identificar links de vagas individuais (não navegação)."""
    if not href or not text:
        return False

    text = text.strip()
    if len(text) < 5 or len(text) > 200:
        return False

    text_lower = text.lower()
    if any(kw in text_lower for kw in SKIP_TITLE_KEYWORDS):
        return False

    # Rejeita se o link aponta para a própria careers_url ou para um URL "pai" dela
    if careers_url:
        if href.rstrip("/") == careers_url.rstrip("/"):
            return False
        # Rejeita se é mais curto ou igual em profundidade (link de navegação)
        parsed_href = urlparse(href)
        parsed_careers = urlparse(careers_url)
        if parsed_href.netloc == parsed_careers.netloc:
            href_parts = [p for p in parsed_href.path.split("/") if p]
            careers_parts = [p for p in parsed_careers.path.split("/") if p]
            if len(href_parts) <= len(careers_parts):
                return False

    href_lower = href.lower()
    return any(kw in href_lower for kw in JOB_HREF_KEYWORDS)


async def extract_jobs_from_page(
    page: Page, company: dict, base_url: str
) -> list[RawJob]:
    """Extrai links de vagas de uma página de careers renderizada."""
    jobs = []
    selector = company.get("job_selector", "a")

    # Se o selector é específico (não genérico "a"), confia nele e salta heurísticas
    use_heuristics = selector == "a"

    try:
        links = await page.query_selector_all(selector)
        seen_urls = set()

        for link in links:
            try:
                text = (await link.inner_text()).strip()
                href = await link.get_attribute("href")

                if not href:
                    continue

                # Normaliza URL relativa
                if not href.startswith("http"):
                    href = urljoin(base_url, href)

                if href in seen_urls:
                    continue

                if use_heuristics and not is_job_link(href, text, base_url):
                    continue

                if not use_heuristics and (not text or len(text) < 5 or len(text) > 200):
                    continue

                if not is_tech_job(text) or any(kw in text.lower() for kw in SKIP_TITLE_KEYWORDS):
                    continue

                seen_urls.add(href)
                jobs.append(
                    RawJob(
                        title=text,
                        company_name=company["name"],
                        url=href,
                        source="careers_page",
                        location=company.get("city"),
                    )
                )
            except Exception as e:
                logger.debug(f"Erro ao processar link: {e}")

    except Exception as e:
        logger.warning(f"Erro ao extrair links de {company['name']}: {e}")

    return jobs


# Selectores comuns de "carregar mais" / "próxima página"
LOAD_MORE_SELECTORS = [
    "button:has-text('Load more')",
    "button:has-text('Show more')",
    "button:has-text('Ver mais')",
    "button:has-text('Carregar mais')",
    "button:has-text('More jobs')",
    "a:has-text('Next')",
    "a:has-text('Próximo')",
    "button:has-text('Next')",
    "[aria-label='Next page']",
    "[aria-label='next']",
    ".pagination [rel='next']",
    "li.next a",
    "a.next",
]


async def load_all_content(page: Page) -> None:
    """
    Combina scroll infinito + clique em 'Load more' / 'Next page'
    para garantir que todo o conteúdo dinâmico é carregado.
    """
    # 1. Scroll repetido até a altura parar de crescer
    prev_height = 0
    for _ in range(15):
        height = await page.evaluate("document.body.scrollHeight")
        if height == prev_height:
            break
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(1000)
        prev_height = height

    # 2. Clicar em botões de "carregar mais" repetidamente
    for _ in range(20):
        clicked = False
        for sel in LOAD_MORE_SELECTORS:
            try:
                btn = await page.query_selector(sel)
                if btn and await btn.is_visible() and await btn.is_enabled():
                    await btn.click()
                    await page.wait_for_timeout(1500)
                    # Scroll após o clique para revelar novo conteúdo
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await page.wait_for_timeout(500)
                    clicked = True
                    break
            except Exception:
                continue
        if not clicked:
            break


async def fetch_greenhouse(company: dict, client: httpx.AsyncClient) -> list[RawJob]:
    """Usa a API pública do Greenhouse para obter todas as vagas."""
    board = company["greenhouse_board"]
    location_filter = company.get("greenhouse_location_filter", "")
    try:
        resp = await client.get(
            f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs",
            params={"content": "true"},
            timeout=20,
        )
        resp.raise_for_status()
        jobs = []
        for job in resp.json().get("jobs", []):
            if not is_tech_job(job["title"]):
                continue
            location = job.get("location", {}).get("name", "") or ""
            if location_filter and not any(
                kw.lower() in location.lower() for kw in location_filter.split("|")
            ):
                continue
            jobs.append(RawJob(
                title=job["title"],
                company_name=company["name"],
                url=job["absolute_url"],
                source="careers_page",
                location=location or company.get("city"),
            ))
        return jobs
    except Exception as e:
        logger.error(f"Greenhouse API error ({board}): {e}")
        return []


async def fetch_ashby(company: dict, client: httpx.AsyncClient) -> list[RawJob]:
    """Usa a API pública do Ashby para obter todas as vagas."""
    board = company["ashby_board"]
    try:
        resp = await client.post(
            "https://api.ashbyhq.com/posting-api/job-board",
            json={"organizationHostedJobsPageName": board},
            timeout=20,
        )
        resp.raise_for_status()
        jobs = []
        for job in resp.json().get("jobs", []):
            if not is_tech_job(job["title"]):
                continue
            jobs.append(RawJob(
                title=job["title"],
                company_name=company["name"],
                url=job["jobUrl"],
                source="careers_page",
                location=job.get("location", company.get("city")),
            ))
        return jobs
    except Exception as e:
        logger.error(f"Ashby API error ({board}): {e}")
        return []


async def fetch_lever(company: dict, client: httpx.AsyncClient) -> list[RawJob]:
    """Usa a API pública do Lever para obter todas as vagas."""
    board = company["lever_board"]
    location_filter = company.get("lever_location_filter", "")
    try:
        resp = await client.get(
            f"https://api.lever.co/v0/postings/{board}",
            params={"mode": "json"},
            timeout=20,
        )
        resp.raise_for_status()
        jobs = []
        for job in resp.json():
            if not is_tech_job(job["text"]):
                continue
            location = job.get("categories", {}).get("location", company.get("city")) or ""
            if location_filter and not any(
                kw.lower() in location.lower() for kw in location_filter.split("|")
            ):
                continue
            jobs.append(RawJob(
                title=job["text"],
                company_name=company["name"],
                url=job["hostedUrl"],
                source="careers_page",
                location=location or company.get("city"),
            ))
        return jobs
    except Exception as e:
        logger.error(f"Lever API error ({board}): {e}")
        return []


class CareersPageScraper(BaseSource):
    """
    Scrapa páginas de careers das empresas em companies.json.
    Renderiza JavaScript com Playwright (necessário para SPAs).
    """

    def __init__(self, companies_file: Path = COMPANIES_FILE):
        self.companies = json.loads(companies_file.read_text())

    async def fetch(self) -> AsyncIterator[RawJob]:
        async with httpx.AsyncClient() as http_client:
            async with async_playwright() as p:
                browser: Browser = await p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-dev-shm-usage"],
                )
                context = await browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (X11; Linux x86_64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    ),
                    viewport={"width": 1280, "height": 800},
                )

                for company in self.companies:
                    if not company.get("is_active", True):
                        continue

                    name = company["name"]

                    # ATS com API pública — sem Playwright
                    if company.get("greenhouse_board"):
                        logger.info(f"🌿 Greenhouse API: {name}")
                        jobs = await fetch_greenhouse(company, http_client)
                        logger.info(f"  ✅ {len(jobs)} vagas")
                        for job in jobs:
                            yield job
                        continue

                    if company.get("ashby_board"):
                        logger.info(f"🟣 Ashby API: {name}")
                        jobs = await fetch_ashby(company, http_client)
                        logger.info(f"  ✅ {len(jobs)} vagas")
                        for job in jobs:
                            yield job
                        continue

                    if company.get("lever_board"):
                        logger.info(f"🔵 Lever API: {name}")
                        jobs = await fetch_lever(company, http_client)
                        logger.info(f"  ✅ {len(jobs)} vagas")
                        for job in jobs:
                            yield job
                        continue

                    # Fallback: Playwright para sites sem API conhecida
                    careers_url = company.get("careers_url")
                    if not careers_url:
                        continue

                    logger.info(f"🔍 Playwright: {name} → {careers_url}")
                    page = await context.new_page()

                    try:
                        await page.goto(careers_url, timeout=30_000, wait_until="networkidle")

                        selector = company.get("job_selector", "a")
                        if selector != "a":
                            try:
                                await page.wait_for_selector(selector, timeout=10_000)
                            except Exception:
                                pass

                        await load_all_content(page)

                        jobs = await extract_jobs_from_page(page, company, careers_url)
                        logger.info(f"  ✅ {len(jobs)} vagas encontradas")

                        for job in jobs:
                            yield job

                    except Exception as e:
                        logger.error(f"  ❌ Falhou {name}: {e}")
                    finally:
                        await page.close()

                await context.close()
                await browser.close()
