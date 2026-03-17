"""
Seed do banco de dados com a lista curada de empresas.
Uso: python db/seed/seed_companies.py
"""
import json
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Variável DATABASE_URL não definida.")
    sys.exit(1)

COMPANIES_FILE = Path(__file__).parent / "companies.json"

def seed():
    companies = json.loads(COMPANIES_FILE.read_text())
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    inserted = 0
    skipped = 0

    for c in companies:
        cur.execute(
            """
            INSERT INTO companies (name, slug, domain, careers_url, category, city, job_selector)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                domain = EXCLUDED.domain,
                careers_url = EXCLUDED.careers_url,
                category = EXCLUDED.category,
                city = EXCLUDED.city,
                job_selector = EXCLUDED.job_selector,
                updated_at = NOW()
            """,
            (
                c["name"],
                c["slug"],
                c.get("domain"),
                c.get("careers_url"),
                c["category"],
                c.get("city"),
                c.get("job_selector"),
            ),
        )
        if cur.rowcount > 0:
            inserted += 1
        else:
            skipped += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"✅ Seed completo: {inserted} inseridas, {skipped} já existiam.")

if __name__ == "__main__":
    seed()
