"""
Scraper para páginas /careers das empresas curadas em companies.json.
Usa Playwright para renderizar JavaScript antes de extrair links.
"""
import json
import logging
from pathlib import Path
from typing import AsyncIterator
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright, Browser, Page

from .base import BaseSource, RawJob

logger = logging.getLogger(__name__)

COMPANIES_FILE = Path(__file__).parent.parent.parent / "db" / "seed" / "companies.json"

# Palavras-chave no href que indicam links de vagas
JOB_HREF_KEYWORDS = [
    "job", "career", "career", "vaga", "emprego", "recrutamento",
    "oportunidade", "position", "opening", "vacanc", "offer", "opportunit"
]

# Palavras que NÃO devem aparecer no título (falsos positivos)
SKIP_TITLE_KEYWORDS = [
    "cookie", "privacy", "terms", "sobre", "about", "contact",
    "blog", "news", "login", "register", "home", "menu"
]


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

                if is_job_link(href, text, base_url):
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


class CareersPageScraper(BaseSource):
    """
    Scrapa páginas de careers das empresas em companies.json.
    Renderiza JavaScript com Playwright (necessário para SPAs).
    """

    def __init__(self, companies_file: Path = COMPANIES_FILE):
        self.companies = json.loads(companies_file.read_text())

    async def fetch(self) -> AsyncIterator[RawJob]:
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
                careers_url = company.get("careers_url")
                if not careers_url or not company.get("is_active", True):
                    continue

                logger.info(f"🔍 Scraping: {company['name']} → {careers_url}")
                page = await context.new_page()

                try:
                    await page.goto(careers_url, timeout=20_000, wait_until="networkidle")
                    # Scroll para forçar lazy-load
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await page.wait_for_timeout(1500)

                    jobs = await extract_jobs_from_page(page, company, careers_url)
                    logger.info(f"  ✅ {len(jobs)} vagas encontradas")

                    for job in jobs:
                        yield job

                except Exception as e:
                    logger.error(f"  ❌ Falhou {company['name']}: {e}")
                finally:
                    await page.close()

            await context.close()
            await browser.close()
