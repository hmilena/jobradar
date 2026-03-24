"""Testes de carregamento de configuração do scraper."""

import importlib

import pytest


def _reload_settings(monkeypatch: pytest.MonkeyPatch, **env: str | None):
    """Recarrega ``scraper.settings`` depois de aplicar variáveis de ambiente."""
    monkeypatch.setattr("dotenv.load_dotenv", lambda *a, **kw: None)
    import scraper.settings as settings_mod

    for key, value in env.items():
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)
    importlib.reload(settings_mod)
    return settings_mod


def test_anthropic_model_defaults_when_unset(monkeypatch: pytest.MonkeyPatch):
    """Sem ANTHROPIC_MODEL: deve usar o modelo default documentado."""
    mod = _reload_settings(monkeypatch, ANTHROPIC_MODEL=None)
    assert mod.ANTHROPIC_MODEL == mod.DEFAULT_ANTHROPIC_MODEL


def test_anthropic_model_empty_string_uses_default(monkeypatch: pytest.MonkeyPatch):
    """String vazia ou só espaços equivale a não definido."""
    mod = _reload_settings(monkeypatch, ANTHROPIC_MODEL="   ")
    assert mod.ANTHROPIC_MODEL == mod.DEFAULT_ANTHROPIC_MODEL


def test_anthropic_model_custom_value(monkeypatch: pytest.MonkeyPatch):
    """Valor explícito deve ser preservado."""
    custom = "claude-3-5-sonnet-20241022"
    mod = _reload_settings(monkeypatch, ANTHROPIC_MODEL=custom)
    assert mod.ANTHROPIC_MODEL == custom
