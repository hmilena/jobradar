"""
Classe base para todas as fontes de scraping.
Cada fonte implementa o método fetch() que retorna RawJob.
"""
from dataclasses import dataclass, field
from typing import AsyncIterator
from abc import ABC, abstractmethod


@dataclass
class RawJob:
    title: str
    company_name: str
    url: str
    source: str  # 'careers_page' | 'itjobs' | 'linkedin'
    location: str | None = None
    description: str | None = None
    remote_type: str | None = None
    tech_stack: list[str] = field(default_factory=list)
    seniority: str | None = None


class BaseSource(ABC):
    """Interface que todas as fontes de scraping devem implementar."""

    @abstractmethod
    async def fetch(self) -> AsyncIterator[RawJob]:
        ...
