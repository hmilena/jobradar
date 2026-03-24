"""Testes da construção SQL de listagem de vagas."""

from api.routers.jobs import build_jobs_query


def test_build_jobs_query_default_excludes_global_remote_sources():
    """Sem `source`: exclui remoteok / weworkremotely (homepage PT)."""
    q, count_q, params_page, params_base = build_jobs_query(
        None, None, None, None, None, None, None, None, 10, 0
    )
    assert "NOT IN ('remoteok', 'weworkremotely')" in q
    assert params_base == []


def test_build_jobs_query_source_remote():
    """Filtro agregador de vagas remotas internacionais."""
    q, count_q, params_page, params_base = build_jobs_query(
        None, None, None, None, None, None, None, "remote", 5, 10
    )
    assert "IN ('remoteok', 'weworkremotely')" in q


def test_build_jobs_query_text_search_params():
    """Busca textual: três placeholders ILIKE iguais ao padrão."""
    q, _, params_page, params_base = build_jobs_query(
        None, None, None, None, None, None, "lisboa", None, 20, 0
    )
    assert "ILIKE" in q
    assert params_base.count("%lisboa%") == 3


def test_build_jobs_query_pagination_appended():
    """LIMIT/OFFSET são os últimos parâmetros da lista paginada."""
    _, _, params_page, params_base = build_jobs_query(
        "remote", "senior", None, None, "Python", "Backend", None, None, 15, 30
    )
    assert params_page[-2:] == [15, 30]
    assert len(params_page) == len(params_base) + 2
