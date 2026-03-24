"""
Configuração central do scraper a partir de variáveis de ambiente.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Carrega .env na raiz do repositório (idempotente se já carregado antes)
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")

DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514"

DATABASE_URL: str | None = os.environ.get("DATABASE_URL")
ANTHROPIC_API_KEY: str | None = os.environ.get("ANTHROPIC_API_KEY")
_model_env = (os.environ.get("ANTHROPIC_MODEL") or "").strip()
ANTHROPIC_MODEL: str = _model_env or DEFAULT_ANTHROPIC_MODEL
