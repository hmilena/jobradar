"""
JobRadar Portugal - API REST com FastAPI
"""
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import jobs, companies

# Pool de conexões PostgreSQL
_pool: ThreadedConnectionPool | None = None


def get_pool() -> ThreadedConnectionPool:
    global _pool
    if _pool is None:
        import os
        _pool = ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=os.environ["DATABASE_URL"],
        )
    return _pool


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    # Startup: inicializa pool
    get_pool()
    yield
    # Shutdown: fecha pool
    if _pool:
        _pool.closeall()


app = FastAPI(
    title="JobRadar Portugal API",
    description="Vagas de tecnologia em Portugal — só empresas que contratam diretamente.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, troque pelo domínio do frontend
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(companies.router, prefix="/companies", tags=["companies"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stats")
def stats():
    """Estatísticas gerais do banco."""
    pool = get_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM jobs WHERE is_active = TRUE AND is_consultoria = FALSE")
        total_jobs = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM companies WHERE is_active = TRUE")
        total_companies = cur.fetchone()[0]
        cur.execute(
            "SELECT MAX(first_seen_at) FROM jobs WHERE is_active = TRUE AND is_consultoria = FALSE"
        )
        last_update = cur.fetchone()[0]
        return {
            "total_jobs": total_jobs,
            "total_companies": total_companies,
            "last_update": last_update,
        }
    finally:
        pool.putconn(conn)
