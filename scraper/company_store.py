"""
Operações reutilizáveis de leitura/criação de empresas no PostgreSQL (scraper).

Usado pelo scheduler para associar vagas a `company_id` sem duplicar SQL.
"""
from __future__ import annotations

import uuid
from typing import Any


def get_company_id(cur: Any, company_name: str) -> str | None:
    """Devolve o UUID da empresa pelo nome (case-insensitive) ou None."""
    cur.execute(
        "SELECT id FROM companies WHERE LOWER(name) = LOWER(%s) LIMIT 1",
        (company_name,),
    )
    row = cur.fetchone()
    return str(row["id"]) if row else None


def _base_slug(company_name: str) -> str:
    return company_name.lower().replace(" ", "-").replace(".", "")[:60]


def get_or_create_company(cur: Any, company_name: str, category: str) -> str:
    """
    Garante que existe uma linha em `companies` para o nome e devolve o seu `id`.

    Parameters
    ----------
    cur :
        Cursor psycopg2 (ex.: RealDictCursor).
    company_name :
        Nome legível da empresa.
    category :
        Valor da coluna `category` (ex.: ``\"software\"``, ``\"remote\"``).
    """
    existing = get_company_id(cur, company_name)
    if existing:
        return existing

    company_id = str(uuid.uuid4())
    slug = _base_slug(company_name)
    cur.execute("SELECT 1 FROM companies WHERE slug = %s", (slug,))
    if cur.fetchone():
        slug = f"{slug}-{company_id[:6]}"

    cur.execute(
        """INSERT INTO companies (id, name, slug, category, is_active)
           VALUES (%s, %s, %s, %s, TRUE)
           ON CONFLICT (slug) DO NOTHING""",
        (company_id, company_name, slug, category),
    )
    return company_id
