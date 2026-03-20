"""
Scraper para WeWorkRemotely — vagas tech remotas curadas.
Usa os RSS feeds públicos por categoria.
"""
import logging
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from typing import AsyncIterator

import httpx

from .base import BaseSource, RawJob
from .careers_pages import SKIP_TITLE_KEYWORDS
from ..deduplicator import extract_tech_stack, extract_seniority, extract_role

logger = logging.getLogger(__name__)

# RSS feeds de categorias tech
FEEDS = [
    ("https://weworkremotely.com/categories/remote-programming-jobs.rss", "Software Development"),
    ("https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss", "DevOps"),
    ("https://weworkremotely.com/categories/remote-design-jobs.rss", "Design"),
]

# Localização que permite Portugal
EU_LOCATION_KEYWORDS = [
    "anywhere", "worldwide", "europe", "portugal", "global", "emea",
    "location independent",
]

# Rejeitar se restrito a estas regiões (sem Portugal)
EXCLUDE_LOCATION_KEYWORDS = [
    "usa only", "us only", "canada only", "australia only",
    "latin america only", "latam only", "asia only",
    "north america only", "uk only",
]


def _extract_cdata(tag: str, text: str) -> str:
    match = re.search(
        rf'<{tag}[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</{tag}>',
        text,
        re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def _parse_company_title(raw_title: str) -> tuple[str, str]:
    """'Company Name: Job Title' → (company, title)"""
    if ": " in raw_title:
        company, title = raw_title.split(": ", 1)
        return company.strip(), title.strip()
    return "", raw_title.strip()


def _is_eu_compatible(region: str) -> bool:
    """Verifica se a localização permite trabalhar de Portugal."""
    region_lower = region.lower()
    if any(kw in region_lower for kw in EXCLUDE_LOCATION_KEYWORDS):
        return False
    if not region or any(kw in region_lower for kw in EU_LOCATION_KEYWORDS):
        return True
    return False


class WeWorkRemotelyScraper(BaseSource):
    """
    Scrapa RSS feeds do WeWorkRemotely por categoria tech.
    Filtra vagas compatíveis com trabalho a partir de Portugal.
    """

    async def fetch(self) -> AsyncIterator[RawJob]:
        async with httpx.AsyncClient(
            timeout=20,
            headers={"User-Agent": "JobRadarPT/1.0 (jobradarpt.vercel.app)"},
            follow_redirects=True,
        ) as client:
            seen_urls: set[str] = set()

            for feed_url, feed_category in FEEDS:
                try:
                    resp = await client.get(feed_url)
                    resp.raise_for_status()
                except Exception as e:
                    logger.error(f"WeWorkRemotely RSS error ({feed_category}): {e}")
                    continue

                items = re.findall(r"<item>(.*?)</item>", resp.text, re.DOTALL)
                logger.info(f"  WeWorkRemotely {feed_category}: {len(items)} items no feed")

                count = 0
                for item in items:
                    raw_title = _extract_cdata("title", item)
                    link = _extract_cdata("link", item)
                    region = _extract_cdata("region", item)
                    description_html = _extract_cdata("description", item)
                    pub_date_str = _extract_cdata("pubDate", item)

                    if not raw_title or not link:
                        continue
                    if link in seen_urls:
                        continue
                    if not _is_eu_compatible(region):
                        continue
                    # Rejeita restrição de localização no título
                    title_lower = raw_title.lower()
                    if any(kw in title_lower for kw in EXCLUDE_LOCATION_KEYWORDS):
                        continue
                    # Rejeita vagas não-tech
                    if any(kw in title_lower for kw in SKIP_TITLE_KEYWORDS):
                        continue

                    company, title = _parse_company_title(raw_title)
                    if not title:
                        continue

                    # Limpa HTML da descrição
                    description = unescape(re.sub(r"<[^>]+>", " ", description_html)).strip()
                    description = re.sub(r"\s+", " ", description)

                    seen_urls.add(link)
                    count += 1

                    yield RawJob(
                        title=title,
                        company_name=company or "WeWorkRemotely",
                        url=link,
                        source="weworkremotely",
                        location=region or "Worldwide",
                        description=description[:3000],
                        remote_type="remote",
                        tech_stack=extract_tech_stack(f"{title} {description}"),
                        seniority=extract_seniority(title, description),
                        role=extract_role(title, description),
                    )

                logger.info(f"  WeWorkRemotely {feed_category}: {count} vagas PT-compatíveis")
