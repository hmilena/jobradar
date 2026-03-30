"""
Scraper para Olá Mundo (olamundo.pt) — newsletter semanal de vagas remotas abertas a Portugal.
Extrai dados via JSON-LD (Schema.org JobPosting) embutido nas páginas de edição.
Scrapa as 3 edições mais recentes como proxy de vagas ativas.
"""
import json
import logging
from typing import AsyncIterator

import httpx
from bs4 import BeautifulSoup

from .base import BaseSource, RawJob
from .careers_pages import SKIP_TITLE_KEYWORDS, is_tech_job
from ..deduplicator import extract_tech_stack, extract_seniority, extract_role

logger = logging.getLogger(__name__)

BASE_URL = "https://olamundo.pt"
ARCHIVE_URL = f"{BASE_URL}/archive"
EDITIONS_TO_FETCH = 3


class OlaMundoScraper(BaseSource):
    """
    Scrapa as edições mais recentes da newsletter Olá Mundo.
    Usa o JSON-LD Schema.org JobPosting embutido em cada página de edição.
    """

    async def fetch(self) -> AsyncIterator[RawJob]:
        async with httpx.AsyncClient(
            timeout=30,
            headers={"User-Agent": "JobRadarPT/1.0 (jobradarpt.vercel.app)"},
            follow_redirects=True,
        ) as client:
            edition_urls = await self._get_edition_urls(client)
            if not edition_urls:
                logger.warning("OlaMundo: nenhuma edição encontrada no arquivo")
                return

            # Scrapa apenas as edições mais recentes
            recent = edition_urls[:EDITIONS_TO_FETCH]
            seen_urls: set[str] = set()
            count = 0

            for edition_url in recent:
                jobs = await self._scrape_edition(client, edition_url)
                for job in jobs:
                    if job.url in seen_urls:
                        continue
                    seen_urls.add(job.url)
                    count += 1
                    yield job

            logger.info(f"  OlaMundo: {count} vagas extraídas ({len(recent)} edições)")

    async def _get_edition_urls(self, client: httpx.AsyncClient) -> list[str]:
        """Extrai URLs das edições do arquivo, ordenadas da mais recente para a mais antiga."""
        try:
            resp = await client.get(ARCHIVE_URL)
            resp.raise_for_status()
        except Exception as e:
            logger.error(f"OlaMundo: erro ao buscar arquivo: {e}")
            return []

        soup = BeautifulSoup(resp.text, "html.parser")
        urls = []

        for a in soup.find_all("a", href=True):
            href = a["href"]
            # URLs de edição têm o formato /archive/<uuid>
            if href.startswith("/archive/") and len(href) > len("/archive/"):
                full_url = BASE_URL + href
                if full_url not in urls:
                    urls.append(full_url)

        return urls

    async def _scrape_edition(self, client: httpx.AsyncClient, url: str) -> list[RawJob]:
        """Extrai vagas de uma página de edição via JSON-LD."""
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except Exception as e:
            logger.error(f"OlaMundo: erro ao buscar edição {url}: {e}")
            return []

        soup = BeautifulSoup(resp.text, "html.parser")

        # JSON-LD pode estar em <script type="application/ld+json"> ou em meta tag
        ld_json = None
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(tag.string or "")
                if isinstance(data, list) and data and data[0].get("@type") == "JobPosting":
                    ld_json = data
                    break
            except (json.JSONDecodeError, AttributeError):
                continue

        # Fallback: meta tag usada pelo Next.js RSC
        if ld_json is None:
            meta = soup.find("meta", attrs={"name": "script:ld+json"})
            if meta and meta.get("content"):
                try:
                    ld_json = json.loads(meta["content"])
                except (json.JSONDecodeError, TypeError):
                    pass

        if not ld_json:
            logger.warning(f"OlaMundo: JSON-LD não encontrado em {url}")
            return []

        jobs = []
        for item in ld_json:
            if item.get("@type") != "JobPosting":
                continue

            title = (item.get("title") or "").strip()
            job_url = (item.get("url") or "").strip()
            company = (item.get("hiringOrganization") or {}).get("name", "").strip()
            description = (item.get("description") or "").strip()

            # Localização: applicantLocationRequirements ou jobLocation
            location_obj = item.get("applicantLocationRequirements") or {}
            location = location_obj.get("name", "Remote") if isinstance(location_obj, dict) else "Remote"

            if not title or not job_url or not company:
                continue
            if not is_tech_job(title):
                continue
            if any(kw in title.lower() for kw in SKIP_TITLE_KEYWORDS):
                continue

            text = f"{title} {description}"
            tech = extract_tech_stack(text)
            jobs.append(
                RawJob(
                    title=title,
                    company_name=company,
                    url=job_url,
                    source="olamundo",
                    location=location,
                    description=description,
                    remote_type="remote",
                    tech_stack=tech,
                    seniority=extract_seniority(title, description),
                    role=extract_role(title, description, tech),
                )
            )

        return jobs
