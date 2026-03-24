"""Testes do classificador de vagas (fast path, parsing, erros simulados)."""

import json
from unittest.mock import MagicMock

import pytest

from scraper.classifier import (
    ClassifierResult,
    classify_job,
    is_known_consulting,
    parse_classifier_json,
)


def test_is_known_consulting_substring_match():
    """Empresa cujo nome contém token conhecido (ex.: Aubay)."""
    assert is_known_consulting("Aubay Portugal") is True


def test_is_known_consulting_case_insensitive():
    """Matching deve ser case-insensitive."""
    assert is_known_consulting("RANDSTAD TECH") is True


def test_is_known_consulting_unknown_company():
    """Empresa fora da lista não dispara fast path."""
    assert is_known_consulting("Talkdesk") is False


def test_classify_job_fast_path_known_consulting():
    """Consultoria conhecida: não precisa de cliente API."""
    r = classify_job(
        title="Developer",
        company_name="Randstad Digital",
        description="Nosso cliente no setor bancário procura...",
        client=None,
    )
    assert r.is_consulting is True
    assert r.confidence >= 0.99


def test_classify_job_short_description_returns_low_confidence():
    """Descrição curta: abstém-se de classificar com alta confiança."""
    r = classify_job(
        title="Engineer",
        company_name="Unknown Corp",
        description="short",
        client=MagicMock(),
    )
    assert r.confidence == 0.5
    assert r.is_consulting is False


def test_classify_job_no_client():
    """Sem API key / client: resposta neutra."""
    r = classify_job(
        title="Engineer",
        company_name="Unknown Corp",
        description="x" * 100,
        client=None,
    )
    assert r.confidence == 0.5
    assert "API key" in r.reason


def test_parse_classifier_json_happy_path():
    """JSON válido com todos os campos."""
    raw = '{"is_consulting": true, "confidence": 0.88, "reason": "cliente externo"}'
    r = parse_classifier_json(raw)
    assert r == ClassifierResult(
        is_consulting=True,
        confidence=0.88,
        reason="cliente externo",
    )


def test_parse_classifier_json_default_confidence_and_reason():
    """Omite confidence/reason: usa defaults."""
    raw = '{"is_consulting": false}'
    r = parse_classifier_json(raw)
    assert r.is_consulting is False
    assert r.confidence == 0.8
    assert r.reason == ""


def test_parse_classifier_json_invalid_raises():
    """Texto não-JSON deve levantar JSONDecodeError."""
    with pytest.raises(json.JSONDecodeError):
        parse_classifier_json("not json")


def test_parse_classifier_json_missing_is_consulting_raises():
    """JSON sem chave obrigatória."""
    with pytest.raises(KeyError):
        parse_classifier_json('{"confidence": 1}')


def test_classify_job_api_success():
    """Chamada ao cliente Anthropic simulada retorna JSON parseável."""
    client = MagicMock()
    client.messages.create.return_value = MagicMock(
        content=[MagicMock(text='{"is_consulting": false, "confidence": 0.91, "reason": "produto"}')]
    )
    r = classify_job(
        title="Backend",
        company_name="Some Startup",
        description="We build our own fintech product. " * 5,
        client=client,
    )
    assert r.is_consulting is False
    assert r.confidence == 0.91
    client.messages.create.assert_called_once()


def test_classify_job_api_malformed_json():
    """Resposta ill-formed: retorno de fallback sem explodir."""
    client = MagicMock()
    client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="```not json```")]
    )
    r = classify_job(
        title="Backend",
        company_name="Some Startup",
        description="We build our own fintech product. " * 5,
        client=client,
    )
    assert r.is_consulting is False
    assert r.confidence == 0.5
    assert "parse" in r.reason.lower()


def test_classify_job_api_exception():
    """Falha de rede / API genérica."""
    client = MagicMock()
    client.messages.create.side_effect = RuntimeError("timeout")

    r = classify_job(
        title="Backend",
        company_name="Some Startup",
        description="We build our own fintech product. " * 5,
        client=client,
    )
    assert r.is_consulting is False
    assert r.confidence == 0.5
    assert "timeout" in r.reason
