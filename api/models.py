from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class CompanyOut(BaseModel):
    id: UUID
    name: str
    slug: str
    domain: str | None
    category: str
    city: str | None
    logo_url: str | None

    class Config:
        from_attributes = True


class JobOut(BaseModel):
    id: UUID
    title: str
    url: str
    location: str | None
    remote_type: str | None
    seniority: str | None
    tech_stack: list[str]
    company: CompanyOut
    first_seen_at: datetime
    last_seen_at: datetime

    class Config:
        from_attributes = True


class JobList(BaseModel):
    total: int
    page: int
    limit: int
    results: list[JobOut]
