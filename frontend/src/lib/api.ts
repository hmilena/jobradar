declare const process: { env: Record<string, string | undefined> };

const API_URL_BROWSER =
  process.env.NEXT_PUBLIC_API_URL_BROWSER ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

const API_URL_SERVER =
  process.env.NEXT_PUBLIC_API_URL_SERVER ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

// Next.js runs `apiFetch` during SSR inside the Node container. When SSR happens
// in Docker, `localhost` would point to the frontend container, not the API.
// Use a different base URL for server vs browser.
const API_URL = typeof window === "undefined" ? API_URL_SERVER : API_URL_BROWSER;

// ─── Types ───────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  category: string;
  city: string | null;
  logo_url: string | null;
}

export interface Job {
  id: string;
  title: string;
  url: string;
  location: string | null;
  remote_type: "remote" | "hybrid" | "onsite" | "unknown" | null;
  seniority: "intern" | "junior" | "mid" | "senior" | "lead" | "manager" | "unknown" | null;
  tech_stack: string[];
  role: string | null;
  company: Company;
  first_seen_at: string;
  last_seen_at: string;
  republish_count: number;
  age_days: number;
}

export interface JobList {
  total: number;
  page: number;
  limit: number;
  results: Job[];
}

export interface Filters {
  remote_types: string[];
  seniorities: string[];
  cities: string[];
  categories: string[];
  tech_stack: string[];
  roles: string[];
}

export interface Stats {
  jobs_portugal: number;
  jobs_remote: number;
  companies_portugal: number;
  companies_remote: number;
  last_update: string;
}

export interface JobFiltersParams {
  q?: string;
  remote_type?: string;
  seniority?: string;
  city?: string;
  category?: string;
  tech?: string;
  role?: string;
  source?: string;
  max_days?: string;
  page?: number;
  limit?: number;
}

// ─── API Client ──────────────────────────────────────────────

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), {
    next: { revalidate: 60 }, // cache de 1 minuto (Next.js fetch option)
  } as any);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export const api = {
  getJobs: (params: JobFiltersParams) =>
    apiFetch<JobList>("/jobs", {
      ...(params.q && { q: params.q }),
      ...(params.remote_type && { remote_type: params.remote_type }),
      ...(params.seniority && { seniority: params.seniority }),
      ...(params.city && { city: params.city }),
      ...(params.category && { category: params.category }),
      ...(params.tech && { tech: params.tech }),
      ...(params.role && { role: params.role }),
      ...(params.source && { source: params.source }),
      ...(params.max_days && { max_days: params.max_days }),
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
    }),

  getJob: (id: string) => apiFetch<Job & { description_clean: string }>(`/jobs/${id}`),

  getFilters: () => apiFetch<Filters>("/jobs/filters"),

  getCompanies: (params?: { category?: string; city?: string }) =>
    apiFetch<Company[]>("/companies", params as Record<string, string>),

  getCompany: (slug: string) =>
    apiFetch<Company & { careers_url: string; jobs: Job[] }>(`/companies/${slug}`),

  getStats: () => apiFetch<Stats>("/stats"),
};
