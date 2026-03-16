export function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`;
  return `há ${Math.floor(diffDays / 30)} meses`;
}

export const REMOTE_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  onsite: "Presencial",
  unknown: "Não informado",
};

export const REMOTE_COLORS: Record<string, string> = {
  remote: "bg-green-100 text-green-800",
  hybrid: "bg-blue-100 text-blue-800",
  onsite: "bg-orange-100 text-orange-800",
  unknown: "bg-slate-100 text-slate-600",
};

export const SENIORITY_LABELS: Record<string, string> = {
  intern: "Estágio",
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  lead: "Lead",
  manager: "Manager",
  unknown: "Não informado",
};

export const CATEGORY_LABELS: Record<string, string> = {
  banco: "Banco",
  fintech: "Fintech",
  telco: "Telecomunicações",
  seguradora: "Seguradora",
  software: "Software",
  ecommerce: "E-commerce",
  healthtech: "HealthTech",
  automotive_tech: "Tech Automotiva",
  energia: "Energia",
  industrial_tech: "Tech Industrial",
  agencia: "Agência",
  retalho: "Retalho",
  pharma: "Farmacêutica",
  iot: "IoT",
  ciberseguranca: "Cibersegurança",
  turismo: "Turismo",
  seguranca_publica: "Segurança Pública",
};

export function getDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}
