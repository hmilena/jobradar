"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, ChevronDown } from "lucide-react";
import type { Filters } from "@/lib/api";
import { REMOTE_LABELS, SENIORITY_LABELS, CATEGORY_LABELS } from "@/lib/utils";

interface Props {
  filters: Filters;
}

export default function FilterBar({ filters }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const current = {
    q: params.get("q") ?? "",
    remote_type: params.get("remote_type") ?? "",
    seniority: params.get("seniority") ?? "",
    city: params.get("city") ?? "",
    category: params.get("category") ?? "",
    tech: params.get("tech") ?? "",
  };

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete("page");
    router.push(`/?${next.toString()}`);
  }

  function clearAll() {
    router.push("/");
  }

  const hasFilters = Object.values(current).some(Boolean);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar por título, empresa ou tecnologia..."
          defaultValue={current.q}
          className="input pl-10 h-11 text-sm rounded-xl shadow-sm"
          onChange={(e) => {
            const val = e.target.value;
            clearTimeout((window as any)._searchTimer);
            (window as any)._searchTimer = setTimeout(() => updateParam("q", val), 400);
          }}
        />
      </div>

      {/* Filter selects */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            key: "remote_type",
            label: "Regime",
            value: current.remote_type,
            options: filters.remote_types.map((r) => ({ value: r, label: REMOTE_LABELS[r] ?? r })),
          },
          {
            key: "seniority",
            label: "Nível",
            value: current.seniority,
            options: filters.seniorities.map((s) => ({ value: s, label: SENIORITY_LABELS[s] ?? s })),
          },
          {
            key: "city",
            label: "Cidade",
            value: current.city,
            options: filters.cities.map((c) => ({ value: c, label: c })),
          },
          {
            key: "category",
            label: "Setor",
            value: current.category,
            options: filters.categories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c })),
          },
          {
            key: "tech",
            label: "Tecnologia",
            value: current.tech,
            options: filters.tech_stack.map((t) => ({ value: t, label: t })),
          },
        ].map(({ key, label, value, options }) => (
          <div key={key} className="relative">
            <select
              className={`appearance-none text-sm px-3 py-2 pr-7 rounded-lg border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-100 ${
                value
                  ? "border-brand-300 bg-brand-50 text-brand-700 font-medium"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              value={value}
              onChange={(e) => updateParam(key, e.target.value)}
            >
              <option value="">{label}</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        ))}

        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
