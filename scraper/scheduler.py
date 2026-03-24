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
import sys
import uuid
from datetime import datetime, timezone

import anthropic
import psycopg2
from psycopg2.extras import RealDictCursor

from .classifier import ClassifierResult, classify_job
from .company_store import get_company_id, get_or_create_company
from .deduplicator import compute_hash, enrich_raw_job
from .settings import ANTHROPIC_API_KEY, DATABASE_URL
from .sources.base import RawJob
from .sources.careers_pages import CareersPageScraper
from .sources.itjobs import ITJobsScraper
from .sources.remoteok import RemoteOKScraper
from .sources.weworkremotely import WeWorkRemotelyScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("scheduler")


def get_db_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL não definida")
    return psycopg2.connect(DATABASE_URL)


def upsert_job(cur, job: RawJob, company_id: str | None, classifier_result, run_id: str) -> tuple[bool, bool]:
    """
    Insere ou atualiza uma vaga no banco.
    Retorna (is_new, was_updated).
    """
    job_hash = compute_hash(job.title, job.company_name, job.url)

    # Verifica se já existe
    cur.execute("SELECT id, last_seen_at, company_id FROM jobs WHERE hash = %s", (job_hash,))
    existing = cur.fetchone()

    if existing:
        existing_company_id = existing.get("company_id")

        # Atualiza last_seen_at e reativa apenas se estava inativo há mais de 25 dias
        # (expirou naturalmente). Não reativa vagas manualmente desativadas.
        cur.execute(
            """UPDATE jobs SET last_seen_at = NOW(),
               is_active = CASE
                   WHEN last_seen_at < NOW() - INTERVAL '25 days' THEN TRUE
                   ELSE is_active
               END
               WHERE hash = %s""",
            (job_hash,),
        )

        # Backfill: if we just seeded companies and the existing job has NULL company_id,
        # fill it from the current run.
        was_company_backfilled = False
        if existing_company_id is None and company_id is not None:
            cur.execute("UPDATE jobs SET company_id = %s WHERE hash = %s", (company_id, job_hash))
            was_company_backfilled = True

        return False, True if was_company_backfilled else False

    # Verifica se já existe pela URL (caso o título tenha mudado e o hash seja diferente)
    cur.execute("SELECT id FROM jobs WHERE url = %s", (job.url,))
    if cur.fetchone():
        cur.execute(
            "UPDATE jobs SET last_seen_at = NOW(), hash = %s, title = %s WHERE url = %s",
            (job_hash, job.title, job.url),
        )
        return False, True

    # Insere novo
    cur.execute(
        """
        INSERT INTO jobs (
            company_id, title, url, location, remote_type, seniority,
            tech_stack, description_clean, source, hash, role,
            is_consulting, classifier_confidence, classifier_reason, classifier_ran_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
        )
        ON CONFLICT (hash) DO UPDATE SET
            last_seen_at = NOW(),
            remote_type = EXCLUDED.remote_type,
            seniority = EXCLUDED.seniority,
            tech_stack = EXCLUDED.tech_stack,
            role = EXCLUDED.role
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
            job.role or "unknown",
            classifier_result.is_consulting,
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

    if source in ("all", "remoteok"):
        logger.info("🌍 Iniciando coleta do RemoteOK...")
        before = len(jobs)
        scraper = RemoteOKScraper()
        async for job in scraper.fetch():
            jobs.append(job)
        logger.info(f"  → {len(jobs) - before} vagas do RemoteOK")

    if source in ("all", "weworkremotely"):
        logger.info("💼 Iniciando coleta do WeWorkRemotely...")
        before = len(jobs)
        scraper = WeWorkRemotelyScraper()
        async for job in scraper.fetch():
            jobs.append(job)
        logger.info(f"  → {len(jobs) - before} vagas do WeWorkRemotely")

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
            # Classificação — só necessária para ITJobs (fonte mista).
            # Careers pages são empresas curadas (nunca consultorias).
            # RemoteOK e WeWorkRemotely já são filtrados por tech.
            if job.source in ("careers_page", "remoteok", "weworkremotely"):
                classifier_result = ClassifierResult(
                    is_consulting=False,
                    confidence=0.99,
                    reason="Fonte curada — classificação desnecessária.",
                )
            else:
                classifier_result = classify_job(
                    title=job.title,
                    company_name=job.company_name,
                    description=job.description,
                    client=anthropic_client,
                )

            # Busca company_id no banco (cria automaticamente para vagas remote)
            if job.source in ("remoteok", "weworkremotely"):
                company_id = get_or_create_company(cur, job.company_name, "remote")
            else:
                company_id = get_company_id(cur, job.company_name)
                # Para ITJobs, a base de empresas pode ainda não estar completa.
                # Criamos uma empresa mínima para conseguir associar `company_id`.
                if company_id is None and job.source == "itjobs":
                    company_id = get_or_create_company(cur, job.company_name, "software")

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
            conn.rollback()  # Reset transaction so subsequent jobs can proceed

    conn.commit()

    # Marca como inativas vagas não vistas há mais de 30 dias
    cur.execute(
        """
        UPDATE jobs SET is_active = FALSE
        WHERE is_active = TRUE
          AND last_seen_at < NOW() - INTERVAL '30 days'
        """
    )
    deactivated = cur.rowcount
    conn.commit()
    if deactivated:
        logger.info(f"🗑️ {deactivated} vagas marcadas como inativas (não vistas há +30 dias)")

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
    parser.add_argument("--source", choices=["all", "careers", "itjobs", "remoteok", "weworkremotely"], default="all")
    parser.add_argument("--dry-run", action="store_true", help="Não persiste no banco")
    args = parser.parse_args()

    asyncio.run(main(source=args.source, dry_run=args.dry_run))
