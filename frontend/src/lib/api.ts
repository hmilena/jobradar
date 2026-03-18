const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  total_jobs: number;
  total_companies: number;
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
    next: { revalidate: 300 }, // cache de 5 minutos no Next.js
  });
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
