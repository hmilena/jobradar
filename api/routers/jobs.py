"""
Endpoints de vagas.
GET /jobs           - lista vagas com filtros
GET /jobs/{id}      - detalhe de uma vaga
"""
import os
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

router = APIRouter()


def get_pool() -> ThreadedConnectionPool:
    from api.main import get_pool as _get_pool
    return _get_pool()


def build_jobs_query(
    remote_type: str | None,
    seniority: str | None,
    city: str | None,
    category: str | None,
    tech: str | None,
    role: str | None,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[str, list]:
    """Constrói query dinâmica com filtros."""
    conditions = [
        "j.is_active = TRUE",
        "j.is_consultoria = FALSE",
    ]
    params = []

    if remote_type:
        conditions.append("j.remote_type = %s")
        params.append(remote_type)
    if seniority:
        conditions.append("j.seniority = %s")
        params.append(seniority)
    if city:
        conditions.append("LOWER(c.city) = LOWER(%s)")
        params.append(city)
    if category:
        conditions.append("LOWER(c.category) = LOWER(%s)")
        params.append(category)
    if tech:
        conditions.append("%s = ANY(j.tech_stack)")
        params.append(tech)
    if role:
        conditions.append("j.role = %s")
        params.append(role)
    if q:
        conditions.append("(j.title ILIKE %s OR j.description_clean ILIKE %s OR c.name ILIKE %s)")
        params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])

    where = " AND ".join(conditions)

    query = f"""
        SELECT
            j.id, j.title, j.url, j.location, j.remote_type, j.seniority,
            j.tech_stack, j.role, j.first_seen_at, j.last_seen_at,
            c.id as company_id, c.name as company_name, c.slug as company_slug,
            c.domain as company_domain, c.category as company_category,
            c.city as company_city, c.logo_url as company_logo_url
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        WHERE {where}
        ORDER BY j.first_seen_at DESC
        LIMIT %s OFFSET %s
    """
    count_query = f"SELECT COUNT(*) FROM jobs j LEFT JOIN companies c ON j.company_id = c.id WHERE {where}"

    params_with_pagination = params + [limit, offset]
    return query, count_query, params_with_pagination, params


def row_to_job(row: dict) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "url": row["url"],
        "location": row["location"],
        "remote_type": row["remote_type"],
        "seniority": row["seniority"],
        "tech_stack": row["tech_stack"] or [],
        "role": row["role"],
        "first_seen_at": row["first_seen_at"],
        "last_seen_at": row["last_seen_at"],
        "company": {
            "id": row["company_id"],
            "name": row["company_name"],
            "slug": row["company_slug"],
            "domain": row["company_domain"],
            "category": row["company_category"],
            "city": row["company_city"],
            "logo_url": row["company_logo_url"],
        },
    }


@router.get("")
def list_jobs(
    q: Annotated[str | None, Query(description="Busca por texto no título")] = None,
    remote_type: Annotated[str | None, Query()] = None,
    seniority: Annotated[str | None, Query()] = None,
    city: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query(description="Categoria da empresa")] = None,
    tech: Annotated[str | None, Query(description="Tecnologia (ex: Python, React)")] = None,
    role: Annotated[str | None, Query(description="Área (ex: QA, Frontend, Backend)")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    pool = get_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        offset = (page - 1) * limit

        query, count_query, params_paginated, params_base = build_jobs_query(
            remote_type, seniority, city, category, tech, role, q, limit, offset
        )

        cur.execute(count_query, params_base)
        total = cur.fetchone()["count"]

        cur.execute(query, params_paginated)
        rows = cur.fetchall()

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "results": [row_to_job(dict(r)) for r in rows],
        }
    finally:
        pool.putconn(conn)


@router.get("/filters")
def get_filters():
    """Retorna os valores disponíveis para cada filtro."""
    pool = get_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT DISTINCT remote_type FROM jobs
            WHERE is_active = TRUE AND is_consultoria = FALSE AND remote_type IS NOT NULL
        """)
        remote_types = [r["remote_type"] for r in cur.fetchall()]

        cur.execute("""
            SELECT DISTINCT seniority FROM jobs
            WHERE is_active = TRUE AND is_consultoria = FALSE AND seniority IS NOT NULL
        """)
        seniorities = [r["seniority"] for r in cur.fetchall()]

        cur.execute("""
            SELECT DISTINCT c.city FROM jobs j
            JOIN companies c ON j.company_id = c.id
            WHERE j.is_active = TRUE AND j.is_consultoria = FALSE AND c.city IS NOT NULL
        """)
        cities = [r["city"] for r in cur.fetchall()]

        cur.execute("""
            SELECT DISTINCT c.category FROM jobs j
            JOIN companies c ON j.company_id = c.id
            WHERE j.is_active = TRUE AND j.is_consultoria = FALSE AND c.category IS NOT NULL
        """)
        categories = [r["category"] for r in cur.fetchall()]

        cur.execute("""
            SELECT DISTINCT unnest(tech_stack) as tech FROM jobs
            WHERE is_active = TRUE AND is_consultoria = FALSE
        """)
        techs = sorted({r["tech"] for r in cur.fetchall() if r["tech"]})

        cur.execute("""
            SELECT DISTINCT role FROM jobs
            WHERE is_active = TRUE AND is_consultoria = FALSE AND role IS NOT NULL AND role != 'unknown'
        """)
        roles = sorted({r["role"] for r in cur.fetchall() if r["role"]})

        return {
            "remote_types": sorted(remote_types),
            "seniorities": sorted(seniorities),
            "cities": sorted(cities),
            "categories": sorted(categories),
            "tech_stack": techs,
            "roles": roles,
        }
    finally:
        pool.putconn(conn)


@router.get("/{job_id}")
def get_job(job_id: UUID):
    pool = get_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT
                j.id, j.title, j.url, j.location, j.remote_type, j.seniority,
                j.tech_stack, j.description_clean, j.first_seen_at, j.last_seen_at,
                c.id as company_id, c.name as company_name, c.slug as company_slug,
                c.domain as company_domain, c.category as company_category,
                c.city as company_city, c.logo_url as company_logo_url
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE j.id = %s AND j.is_active = TRUE AND j.is_consultoria = FALSE
            """,
            (str(job_id),),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Vaga não encontrada")
        return row_to_job(dict(row))
    finally:
        pool.putconn(conn)
