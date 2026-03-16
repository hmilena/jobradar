"""
Entry point principal do scraper.
Orquestra: coleta → enriquecimento → deduplicação → classificação → persistência.

Uso:
  python -m scraper.scheduler
  python -m scraper.scheduler --source careers  (só careers pages)
  python -m scraper.scheduler --source itjobs   (só ITJobs API)
  python -m scraper.scheduler --dry-run         (não persiste, só loga)
"""
import argparse
import asyncio
import logging
import os
import sys
import uuid
from datetime import datetime, timezone

import anthropic
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

from .classifier import classify_job
from .deduplicator import compute_hash, enrich_raw_job
from .sources.base import RawJob
from .sources.careers_pages import CareersPageScraper
from .sources.itjobs import ITJobsScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("scheduler")

DATABASE_URL = os.environ.get("DATABASE_URL")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")


def get_db_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL não definida")
    return psycopg2.connect(DATABASE_URL)


def get_company_id(cur, company_name: str) -> str | None:
    """Busca o UUID da empresa pelo nome (case-insensitive)."""
    cur.execute(
        "SELECT id FROM companies WHERE LOWER(name) = LOWER(%s) LIMIT 1",
        (company_name,),
    )
    row = cur.fetchone()
    return str(row["id"]) if row else None


def upsert_job(cur, job: RawJob, company_id: str | None, classifier_result, run_id: str) -> tuple[bool, bool]:
    """
    Insere ou atualiza uma vaga no banco.
    Retorna (is_new, was_updated).
    """
    job_hash = compute_hash(job.title, job.company_name, job.url)

    # Verifica se já existe
    cur.execute("SELECT id, last_seen_at FROM jobs WHERE hash = %s", (job_hash,))
    existing = cur.fetchone()

    if existing:
        # Atualiza last_seen_at para marcar como ainda ativo
        cur.execute(
            "UPDATE jobs SET last_seen_at = NOW(), is_active = TRUE WHERE hash = %s",
            (job_hash,),
        )
        return False, True

    # Insere novo
    cur.execute(
        """
        INSERT INTO jobs (
            company_id, title, url, location, remote_type, seniority,
            tech_stack, description_clean, source, hash,
            is_consultoria, classifier_confidence, classifier_reason, classifier_ran_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
        )
        ON CONFLICT (hash) DO NOTHING
        """,
        (
            company_id,
            job.title,
            job.url,
            job.location,
            job.remote_type or "unknown",
            job.seniority or "unknown",
            job.tech_stack,
            job.description,
            job.source,
            job_hash,
            classifier_result.is_consultoria,
            classifier_result.confidence,
            classifier_result.reason,
        ),
    )
    return True, False


async def collect_jobs(source: str) -> list[RawJob]:
    """Coleta vagas de todas as fontes configuradas."""
    jobs = []

    if source in ("all", "careers"):
        logger.info("🌐 Iniciando scraping de careers pages...")
        scraper = CareersPageScraper()
        async for job in scraper.fetch():
            jobs.append(job)
        logger.info(f"  → {len(jobs)} vagas das careers pages")

    if source in ("all", "itjobs"):
        logger.info("📡 Iniciando coleta do ITJobs...")
        before = len(jobs)
        scraper = ITJobsScraper(max_pages=5)
        async for job in scraper.fetch():
            jobs.append(job)
        logger.info(f"  → {len(jobs) - before} vagas do ITJobs")

    return jobs


async def main(source: str = "all", dry_run: bool = False):
    start_time = datetime.now(timezone.utc)
    logger.info(f"🚀 JobRadar Scraper iniciado | source={source} | dry_run={dry_run}")

    # Coleta vagas
    raw_jobs = await collect_jobs(source)
    logger.info(f"📦 Total coletado: {len(raw_jobs)} vagas")

    if not raw_jobs:
        logger.warning("Nenhuma vaga coletada. Encerrando.")
        return

    # Enriquece metadados
    enriched = [enrich_raw_job(job) for job in raw_jobs]

    if dry_run:
        logger.info("🧪 DRY RUN - não persistindo no banco")
        for job in enriched[:10]:
            logger.info(f"  · [{job.source}] {job.company_name} | {job.title} | {job.remote_type} | {job.tech_stack}")
        return

    # Conecta ao banco
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Cria run no banco
    run_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO scraper_runs (id, status) VALUES (%s, 'running')",
        (run_id,),
    )
    conn.commit()

    # Inicializa cliente Anthropic para classifier
    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

    stats = {"found": len(enriched), "new": 0, "updated": 0, "errors": []}

    for i, job in enumerate(enriched):
        try:
            # Classificação
            classifier_result = classify_job(
                title=job.title,
                company_name=job.company_name,
                description=job.description,
                client=anthropic_client,
            )

            # Busca company_id no banco
            company_id = get_company_id(cur, job.company_name)

            # Persiste
            is_new, was_updated = upsert_job(cur, job, company_id, classifier_result, run_id)

            if is_new:
                stats["new"] += 1
            elif was_updated:
                stats["updated"] += 1

            # Commit a cada 50 registros
            if i % 50 == 0:
                conn.commit()
                logger.info(f"  Progress: {i+1}/{len(enriched)} | new={stats['new']} updated={stats['updated']}")

        except Exception as e:
            logger.error(f"Erro ao processar vaga '{job.title}' ({job.company_name}): {e}")
            stats["errors"].append({"job": job.title, "company": job.company_name, "error": str(e)})

    conn.commit()

    # Atualiza run com resultado
    cur.execute(
        """
        UPDATE scraper_runs
        SET finished_at = NOW(), status = %s,
            jobs_found = %s, jobs_new = %s, jobs_updated = %s, errors = %s
        WHERE id = %s
        """,
        (
            "success" if not stats["errors"] else "partial",
            stats["found"],
            stats["new"],
            stats["updated"],
            psycopg2.extras.Json(stats["errors"]),
            run_id,
        ),
    )
    conn.commit()
    cur.close()
    conn.close()

    elapsed = (datetime.now(timezone.utc) - start_time).seconds
    logger.info(
        f"✅ Concluído em {elapsed}s | "
        f"found={stats['found']} new={stats['new']} updated={stats['updated']} "
        f"errors={len(stats['errors'])}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JobRadar Scraper")
    parser.add_argument("--source", choices=["all", "careers", "itjobs"], default="all")
    parser.add_argument("--dry-run", action="store_true", help="Não persiste no banco")
    args = parser.parse_args()

    asyncio.run(main(source=args.source, dry_run=args.dry_run))
