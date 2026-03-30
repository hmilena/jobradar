"""
Scraper para RemoteOK — vagas 100% remotas de todo o mundo.
Usa a API pública JSON (sem autenticação).
"""
import logging
from typing import AsyncIterator

import httpx

from .base import BaseSource, RawJob
from .careers_pages import SKIP_TITLE_KEYWORDS
from ..deduplicator import extract_tech_stack, extract_seniority, extract_role

logger = logging.getLogger(__name__)

REMOTEOK_API = "https://remoteok.com/api"

# Tags do RemoteOK que indicam uma vaga tech
TECH_TAGS = {
    "dev", "engineer", "engineering", "developer", "software", "backend", "frontend",
    "fullstack", "full-stack", "devops", "sre", "data", "machine-learning", "ml",
    "ai", "python", "javascript", "typescript", "react", "vue", "angular", "node",
    "java", "golang", "go", "rust", "scala", "ruby", "php", "swift", "kotlin",
    "ios", "android", "mobile", "cloud", "aws", "gcp", "azure", "kubernetes",
    "docker", "terraform", "security", "infosec", "qa", "testing", "ux", "ui",
    "product-manager", "design", "designer", "analyst", "database", "sql",
    "api", "architecture", "web", "saas",
}

# Tags que indicam vagas não-tech (rejeitar)
NON_TECH_TAGS = {
    "sales", "marketing", "hr", "recruiter", "finance", "accounting",
    "customer-support", "customer-success", "legal", "operations",
    "content", "copywriting", "seo", "social-media",
}


def is_tech_remoteok(position: str, tags: list[str]) -> bool:
    """Verifica se é uma vaga tech com base no título e tags."""
    tags_lower = {t.lower() for t in tags}

    # Rejeita se tem tags claramente não-tech
    if tags_lower & NON_TECH_TAGS:
        return False

    # Aceita se tem tag tech
    if tags_lower & TECH_TAGS:
        return True

    # Fallback: verifica título
    title_lower = position.lower()
    tech_keywords = [
        "engineer", "developer", "architect", "devops", "sre", "data",
        "machine learning", "software", "frontend", "backend", "fullstack",
        "mobile", "ios", "android", "security", "qa", "ux", "ui", "designer",
        "python", "javascript", "typescript", "react", "cloud",
    ]
    return any(kw in title_lower for kw in tech_keywords)


class RemoteOKScraper(BaseSource):
    """
    Scrapa vagas da API pública do RemoteOK.
    Todas as vagas são 100% remotas.
    """

    async def fetch(self) -> AsyncIterator[RawJob]:
        async with httpx.AsyncClient(
            timeout=20,
            headers={"User-Agent": "JobRadarPT/1.0 (jobradarpt.vercel.app)"},
            follow_redirects=True,
        ) as client:
            try:
                resp = await client.get(REMOTEOK_API)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.error(f"RemoteOK API error: {e}")
                return

            jobs = [j for j in data if isinstance(j, dict) and j.get("position")]
            logger.info(f"  RemoteOK: {len(jobs)} vagas brutas")

            seen_urls = set()
            count = 0

            for job in jobs:
                title = job.get("position", "").strip()
                company = job.get("company", "").strip()
                url = job.get("url", "").strip()
                tags = job.get("tags") or []
                description = job.get("description", "") or ""
                location = job.get("location", "Worldwide") or "Worldwide"

                if not title or not company or not url:
                    continue
                if url in seen_urls:
                    continue
                if not is_tech_remoteok(title, tags):
                    continue
                if any(kw in title.lower() for kw in SKIP_TITLE_KEYWORDS):
                    continue

                seen_urls.add(url)
                count += 1

                # Tech stack a partir das tags
                tech_stack = [t for t in tags if t.lower() in {
                    t2.lower() for t2 in TECH_TAGS
                    if t2 not in {"dev", "engineer", "engineering", "developer",
                                  "software", "web", "saas", "api", "cloud"}
                }]

                yield RawJob(
                    title=title,
                    company_name=company,
                    url=url,
                    source="remoteok",
                    location=location,
                    description=description,
                    remote_type="remote",
                    tech_stack=tech_stack,
                    seniority=extract_seniority(title, description),
                    role=extract_role(title, description, tech_stack),
                )

            logger.info(f"  RemoteOK: {count} vagas tech aceites")
