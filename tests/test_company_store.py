"""Testes das funções de persistência de empresas (cursor mockado)."""

from unittest.mock import MagicMock

from scraper.company_store import get_company_id, get_or_create_company


def test_get_company_id_found():
    cur = MagicMock()
    cur.fetchone.return_value = {"id": "550e8400-e29b-41d4-a716-446655440000"}
    cid = get_company_id(cur, "Acme")
    assert cid == "550e8400-e29b-41d4-a716-446655440000"
    cur.execute.assert_called_once()


def test_get_company_id_missing():
    cur = MagicMock()
    cur.fetchone.return_value = None
    assert get_company_id(cur, "Nope") is None


def test_get_or_create_company_returns_existing():
    cur = MagicMock()
    cur.fetchone.return_value = {"id": "existing-uuid"}
    cid = get_or_create_company(cur, "Acme", "software")
    assert cid == "existing-uuid"
    assert cur.execute.call_count == 1


def test_get_or_create_company_inserts_new():
    cur = MagicMock()
    cur.fetchone.side_effect = [None, None]
    cid = get_or_create_company(cur, "NewCo Ltd", "remote")
    assert len(cid) == 36
    assert cur.execute.call_count == 3
