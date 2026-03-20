"""
Classifier de vagas usando Claude.
Determina se uma vaga é de consultoria/RH ou de empresa produto (contratação direta).
"""
import json
import logging
from dataclasses import dataclass

import anthropic

logger = logging.getLogger(__name__)

# Consultorias e empresas de RH conhecidas em Portugal
KNOWN_CONSULTING = {
    # IT consulting
    "altran", "capgemini", "devoteam", "novabase", "aubay", "rumos",
    "inetum", "integer", "timwe", "link consulting", "growin", "dellent",
    "kcsit", "claranet", "syone", "uniksystem", "cgi", "atos", "infosys",
    "wipro", "tcs", "tata consultancy", "accenture", "ibm", "ntt data",
    "everis", "nec", "logica", "indra", "atos origin",
    # RH / Recruitment
    "michael page", "randstad", "adecco", "hays", "manpower", "kelly",
    "gi group", "lhh", "robert half", "pagegroup", "talenter", "dgs",
    "multipessoal", "human profiler", "step it", "oney", "sysman",
    "agap2", "sothis", "sopra steria", "we are meta",
}

SYSTEM_PROMPT = """
Você é um classificador especializado em vagas de emprego em Portugal.

Sua tarefa: determinar se uma vaga foi publicada por uma CONSULTORIA/EMPRESA DE RH
(que vai alocar o candidato num cliente externo) ou por uma EMPRESA PRODUTO
(que contrata diretamente para a própria equipa).

SINAIS DE CONSULTORIA (is_consulting = true):
- Texto como "nosso cliente", "empresa parceira", "cliente final", "empresa de referência"
- "alocação", "outsourcing", "prestação de serviços a clientes"
- "projeto em cliente", "alocado em cliente"
- O nome da empresa é uma consultoria conhecida (Altran, Capgemini, Devoteam, Aubay, etc.)
- Empresas de RH (Randstad, Adecco, Hays, Michael Page, etc.)
- Descrição vaga que não menciona o produto/serviço da própria empresa
- "integrar a nossa pool de talentos"

SINAIS DE EMPRESA PRODUTO (is_consulting = false):
- Descrevem claramente o produto ou serviço próprio da empresa
- "join our engineering team", "a nossa equipa de produto"
- Empresa claramente de produto (Farfetch, Talkdesk, OutSystems, NOS, etc.)
- Mencionam stack tecnológica própria, roadmap de produto
- Descrevem missão e impacto interno

Responda APENAS com JSON válido, sem markdown, sem texto extra:
{
  "is_consulting": false,
  "confidence": 0.95,
  "reason": "empresa descreve produto próprio de pagamentos"
}
"""


@dataclass
class ClassifierResult:
    is_consulting: bool
    confidence: float
    reason: str


def is_known_consulting(company_name: str) -> bool:
    """Verifica se o nome da empresa está na lista negra de consultorias."""
    name_lower = company_name.lower().strip()
    return any(kw in name_lower for kw in KNOWN_CONSULTING)


def classify_job(
    title: str,
    company_name: str,
    description: str | None,
    client: anthropic.Anthropic | None = None,
) -> ClassifierResult:
    """
    Classifica uma vaga como consultoria ou empresa produto.
    Primeiro checa a lista de consultorias conhecidas (rápido, grátis).
    Só chama a API se necessário.
    """
    # Fast path: empresa conhecida na lista negra
    if is_known_consulting(company_name):
        return ClassifierResult(
            is_consulting=True,
            confidence=0.99,
            reason=f"Empresa '{company_name}' identificada como consultoria/RH conhecida.",
        )

    # Sem descrição: não há como classificar com confiança
    if not description or len(description.strip()) < 50:
        return ClassifierResult(
            is_consulting=False,
            confidence=0.5,
            reason="Sem descrição suficiente para classificar.",
        )

    if client is None:
        return ClassifierResult(
            is_consulting=False,
            confidence=0.5,
            reason="Sem API key — classificação ignorada.",
        )

    prompt = f"""Empresa: {company_name}
Título da vaga: {title}
Descrição (primeiros 2000 chars):
{description[:2000]}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        data = json.loads(raw)
        return ClassifierResult(
            is_consulting=bool(data["is_consulting"]),
            confidence=float(data.get("confidence", 0.8)),
            reason=data.get("reason", ""),
        )
    except json.JSONDecodeError as e:
        logger.error(f"Classifier JSON parse error: {e} | raw: {raw}")
        return ClassifierResult(is_consulting=False, confidence=0.5, reason="Erro de parse")
    except Exception as e:
        logger.error(f"Classifier API error: {e}")
        return ClassifierResult(is_consulting=False, confidence=0.5, reason=f"Erro: {e}")
