"""
Scraper para a API pública do ITJobs.pt.
ITJobs tem uma API REST não documentada mas estável.
Filtramos as vagas de consultorias depois via classifier.
"""
import logging
from datetime import datetime, timezone, timedelta
import os
from typing import AsyncIterator

import httpx

from .base import BaseSource, RawJob

logger = logging.getLogger(__name__)

ITJOBS_API = "https://api.itjobs.pt/job/list.json"
# ITJobs requires a valid API key for this endpoint.
# Get it from https://www.itjobs.pt/api (they email it to you after sign-up).
ITJOBS_API_KEY = os.environ.get("ITJOBS_API_KEY")
MAX_JOB_AGE_DAYS = 60  # ignora vagas publicadas há mais de 60 dias

# Categorias de tech no ITJobs
TECH_TYPE_IDS = [
    1,   # Programação/Desenvolvimento
    2,   # Base de Dados
    3,   # Sistemas/Redes
    6,   # DevOps
    10,  # BI/Data Science
    16,  # Mobile
    17,  # UX/UI Design
    22,  # Cibersegurança
    24,  # Cloud
]


class ITJobsScraper(BaseSource):
    """
    Scrapa vagas da API do ITJobs.pt.
    Retorna todas as vagas (incluindo consultorias) — o classifier filtra depois.
    """

    def __init__(self, max_pages: int = 10):
        self.max_pages = max_pages

    async def fetch(self) -> AsyncIterator[RawJob]:
        if not ITJOBS_API_KEY:
            logger.error(
                "ITJobs API key missing. Set ITJOBS_API_KEY env var "
                "(see https://www.itjobs.pt/api)."
            )
            return

        async with httpx.AsyncClient(timeout=30) as client:
            for type_id in TECH_TYPE_IDS:
                page = 1
                while page <= self.max_pages:
                    try:
                        resp = await client.get(
                            ITJOBS_API,
                            params={
                                "api_key": ITJOBS_API_KEY,
                                "limit": 50,
                                "page": page,
                                "type": type_id,
                                "country": 1,  # Portugal
                            },
                            headers={
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/122 Safari/537.36"
                            },
                        )
                        resp.raise_for_status()
                        data = resp.json()

                        if isinstance(data, dict) and data.get("error"):
                            logger.error(f"ITJobs API error payload: {data.get('error')}")
                            return

                        results = data.get("results", [])
                        if not results:
                            break

                        cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_JOB_AGE_DAYS)
                        for job in results:
                            published_at = job.get("publishedAt") or job.get("updatedAt")
                            if published_at:
                                try:
                                    pub_date = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                                    # Some ITJobs payloads may come without timezone info.
                                    # Normalize to UTC-aware so comparisons work reliably.
                                    if pub_date.tzinfo is None:
                                        pub_date = pub_date.replace(tzinfo=timezone.utc)
                                    if pub_date < cutoff:
                                        continue
                                except (ValueError, AttributeError):
                                    pass

                            company = job.get("company", {})
                            yield RawJob(
                                title=job.get("title", ""),
                                company_name=company.get("name", ""),
                                url=f"https://www.itjobs.pt/oferta/{job['id']}/{job.get('slug', '')}",
                                source="itjobs",
                                location=self._extract_location(job),
                                description=job.get("body", ""),
                                remote_type=self._extract_remote(job),
                                tech_stack=self._extract_tech(job),
                            )

                        total = data.get("total", 0)
                        if page * 50 >= total:
                            break
                        page += 1

                    except httpx.HTTPError as e:
                        logger.error(f"ITJobs API error (type={type_id}, page={page}): {e}")
                        break

    def _extract_location(self, job: dict) -> str | None:
        locations = job.get("locations", [])
        if locations:
            return ", ".join(loc.get("name", "") for loc in locations)
        return None

    def _extract_remote(self, job: dict) -> str:
        wage = job.get("wage", "")
        body = (job.get("body", "") or "").lower()
        if "full remote" in body or "100% remoto" in body:
            return "remote"
        if "híbrido" in body or "hybrid" in body:
            return "hybrid"
        return "unknown"

    def _extract_tech(self, job: dict) -> list[str]:
        tags = job.get("tags", []) or []
        return [t.get("name", "") for t in tags if t.get("name")]
