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

export function formatISOToPTDate(dateString: string): string {
  const now = Date.now();
  const input = new Date(dateString).getTime();

  const diffSeconds = Math.floor((now - input) / 1000);

  const minutes = Math.floor(diffSeconds / 60);
  const hours = Math.floor(diffSeconds / 3600);
  const days = Math.floor(diffSeconds / 86400);
  const weeks = Math.floor(diffSeconds / (86400 * 7));

  if (minutes < 1) {
    return "há 1 minuto";
  }

  if (minutes < 60) {
    return `há ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  }

  if (hours < 24) {
    return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  if (days < 7) {
    const remainingHours = hours % 24;

    const dayPart = `${days} ${days === 1 ? "dia" : "dias"}`;

    if (remainingHours === 0) {
      return `há ${dayPart}`;
    }

    const hourPart = `${remainingHours} ${remainingHours === 1 ? "hora" : "horas"}`;

    return `há ${dayPart} e ${hourPart}`;
  }

  return `há ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
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

export type FreshnessLevel = "fresh" | "aging" | "stale";

export function getJobFreshness(ageDays: number): {
  level: FreshnessLevel;
  label: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
  darkColor: string;
} {
  if (ageDays >= 90) {
    return {
      level: "stale",
      label: `${ageDays} dias`,
      color: "#791F1F",
      bgColor: "#FCEBEB",
      darkBgColor: "#501313",
      darkColor: "#F7C1C1",
    };
  }
  if (ageDays >= 31) {
    return {
      level: "aging",
      label: `${ageDays} dias`,
      color: "#633806",
      bgColor: "#FAEEDA",
      darkBgColor: "#633806",
      darkColor: "#FAC775",
    };
  }
  return {
    level: "fresh",
    label: `${ageDays} dias`,
    color: "#27500A",
    bgColor: "#EAF3DE",
    darkBgColor: "#27500A",
    darkColor: "#C0DD97",
  };
}

export function getDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}
