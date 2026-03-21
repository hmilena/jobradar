"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, ChevronDown } from "lucide-react";
import type { Filters } from "@/lib/api";
import { debounce } from "@/lib/debounce";
import { REMOTE_LABELS, SENIORITY_LABELS, CATEGORY_LABELS } from "@/lib/utils";

interface Props {
  filters: Filters;
  basePath?: string;
  allowedKeys?: string[];
}

type SelectOption = {
  value: string;
  label: string;
};

type SelectFilter = {
  key: string;
  label: string;
  value: string;
  options: SelectOption[];
  disabled?: boolean;
};

type FilterSelectProps = {
  filter: SelectFilter;
  onChange: (key: string, value: string) => void;
};

const FilterSelect = memo(function FilterSelect({ filter, onChange }: FilterSelectProps) {
  const { key, label, value, options, disabled } = filter;

  return (
    <div key={key} className="relative">
      <select
        className={`appearance-none text-sm px-3 py-2 pr-7 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-100 ${
          value
            ? "border-brand-300 bg-brand-50 text-brand-700 font-medium"
            : "border-slate-200 bg-white text-slate-600"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-slate-300"}`}
        value={value}
        onChange={(e) => onChange(key, e.target.value)}
        disabled={disabled}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
});

export default function FilterBar({ filters, basePath = "/", allowedKeys }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const current = {
    q: params.get("q") ?? "",
    remote_type: params.get("remote_type") ?? "",
    seniority: params.get("seniority") ?? "",
    city: params.get("city") ?? "",
    category: params.get("category") ?? "",
    tech: params.get("tech") ?? "",
    role: params.get("role") ?? "",
  };

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete("page");
    router.push(`${basePath}?${next.toString()}`);
  }

  const updateParamRef = useRef(updateParam);
  updateParamRef.current = updateParam;

  const debouncedUpdateQ = useMemo(
    () => debounce((val: string) => updateParamRef.current("q", val), 400),
    [],
  );

  useEffect(() => () => debouncedUpdateQ.cancel(), [debouncedUpdateQ]);

  function clearAll() {
    router.push(basePath);
  }

  const hasFilters = Object.values(current).some(Boolean);
  const selectFilters = useMemo<SelectFilter[]>(
    () =>
      [
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
          disabled: filters.cities.length === 0,
        },
        {
          key: "category",
          label: "Setor",
          value: current.category,
          options: filters.categories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c })),
        },
        {
          key: "role",
          label: "Área",
          value: current.role,
          options: (filters.roles ?? []).map((r) => ({ value: r, label: r })),
        },
        {
          key: "tech",
          label: "Tecnologia",
          value: current.tech,
          options: filters.tech_stack.map((t) => ({ value: t, label: t })),
        },
      ].filter(({ key }) => !allowedKeys || allowedKeys.includes(key)),
    [allowedKeys, current.category, current.city, current.remote_type, current.role, current.seniority, current.tech, filters],
  );

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
          onChange={(e) => debouncedUpdateQ(e.target.value)}
        />
      </div>

      {/* Filter selects */}
      <div className="flex flex-wrap gap-2">
        {selectFilters.map((filter) => (
          <FilterSelect key={filter.key} filter={filter} onChange={updateParam} />
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
