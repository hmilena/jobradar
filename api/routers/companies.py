"""
Endpoints de empresas curadas.
GET /companies       - lista empresas
GET /companies/{slug} - detalhe de uma empresa com vagas ativas
"""
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor

router = APIRouter()


def get_pool():
    from api.main import get_pool as _get_pool
    return _get_pool()


@router.get("")
def list_companies(category: str | None = None, city: str | None = None):
    pool = get_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        conditions = ["is_active = TRUE"]
        params = []
        if category:
            conditions.append("LOWER(category) = LOWER(%s)")
            params.append(category)
        if city:
            conditions.append("LOWER(city) = LOWER(%s)")
            params.append(city)

        where = " AND ".join(conditions)
        cur.execute(
            f"SELECT id, name, slug, domain, category, city, logo_url FROM companies WHERE {where} ORDER BY name",
            params,
        )
        return cur.fetchall()
    finally:
        pool.putconn(conn)


@router.get("/{slug}")
def get_company(slug: str):
    pool = get_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT id, name, slug, domain, careers_url, category, city, logo_url FROM companies WHERE slug = %s AND is_active = TRUE",
            (slug,),
        )
        company = cur.fetchone()
        if not company:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")

        # Vagas ativas desta empresa
        cur.execute(
            """
            SELECT id, title, url, location, remote_type, seniority, tech_stack, first_seen_at
            FROM jobs
            WHERE company_id = %s AND is_active = TRUE AND is_consulting = FALSE
            ORDER BY first_seen_at DESC
            LIMIT 50
            """,
            (str(company["id"]),),
        )
        jobs = cur.fetchall()

        return {**dict(company), "jobs": [dict(j) for j in jobs]}
    finally:
        pool.putconn(conn)
