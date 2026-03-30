"""
Scraper para Jobicy (jobicy.com) — vagas remotas tech com API pública gratuita.
Candidatos acedem e aplicam sem conta ou pagamento.
"""
import logging
from typing import AsyncIterator

import httpx

from .base import BaseSource, RawJob
from .careers_pages import SKIP_TITLE_KEYWORDS, is_tech_job
from ..deduplicator import extract_tech_stack, extract_seniority, extract_role

logger = logging.getLogger(__name__)

API_URL = "https://jobicy.com/api/v2/remote-jobs"

# Indústrias tech disponíveis na API do Jobicy
TECH_INDUSTRIES = [
    "engineering",
    "design",
    "data-science",
]

# Geografias abertas a Portugal/Europa
EUROPE_GEOS = {
    "europe", "emea", "worldwide", "anywhere", "global", "remote",
    "portugal", "spain", "france", "germany", "netherlands", "ireland",
    "uk", "switzerland", "czechia", "poland", "romania", "croatia",
    "estonia", "ukraine",
}

LEVEL_MAP = {
    "Entry-Level, Junior": "junior",
    "Midweight": "mid",
    "Senior": "senior",
    "Director": "lead",
    "Any": None,
}


def is_europe_accessible(geo: str) -> bool:
    if not geo:
        return True
    # Multi-country strings como "Canada, Netherlands, USA"
    parts = [p.strip().lower() for p in geo.split(",")]
    return any(p in EUROPE_GEOS for p in parts)


class JobicyScraper(BaseSource):
    """
    Scrapa vagas de emprego remoto do Jobicy por categoria tech.
    Filtra apenas vagas abertas a candidatos em Portugal/Europa.
    """

    def __init__(self, count: int = 50):
        self.count = count

    async def fetch(self) -> AsyncIterator[RawJob]:
        async with httpx.AsyncClient(
            timeout=20,
            headers={"User-Agent": "JobRadarPT/1.0 (jobradarpt.vercel.app)"},
            follow_redirects=True,
        ) as client:
            seen_urls: set[str] = set()
            count = 0

            for industry in TECH_INDUSTRIES:
                try:
                    resp = await client.get(
                        API_URL,
                        params={"count": self.count, "industry": industry},
                    )
                    resp.raise_for_status()
                    data = resp.json()
                except Exception as e:
                    logger.error(f"Jobicy API error ({industry}): {e}")
                    continue

                jobs = data.get("jobs", [])

                for job in jobs:
                    title = (job.get("jobTitle") or "").strip()
                    company = (job.get("companyName") or "").strip()
                    url = (job.get("url") or "").strip()
                    geo = (job.get("jobGeo") or "")

                    if not title or not company or not url:
                        continue
                    if url in seen_urls:
                        continue
                    if not is_tech_job(title):
                        continue
                    if any(kw in title.lower() for kw in SKIP_TITLE_KEYWORDS):
                        continue
                    if not is_europe_accessible(geo):
                        continue

                    seen_urls.add(url)
                    count += 1

                    description = job.get("jobDescription") or job.get("jobExcerpt") or ""
                    level_raw = job.get("jobLevel") or ""
                    seniority = LEVEL_MAP.get(level_raw) or extract_seniority(title, description)

                    yield RawJob(
                        title=title,
                        company_name=company,
                        url=url,
                        source="jobicy",
                        location=geo or "Remote",
                        description=description,
                        remote_type="remote",
                        tech_stack=extract_tech_stack(title + " " + description),
                        seniority=seniority,
                        role=extract_role(title, description),
                    )

            logger.info(f"  Jobicy: {count} vagas tech aceites")
