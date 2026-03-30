import { Building2, Briefcase, Globe, RefreshCw } from "lucide-react";
import type { Stats } from "@/lib/api";
import { formatISOToPTDate } from "@/lib/utils";

export default function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Briefcase className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900 leading-none">
            {stats.jobs_portugal.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">vagas em Portugal</p>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-200" />

      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Globe className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900 leading-none">
            {stats.jobs_remote.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">vagas remotas</p>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-200" />

      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Building2 className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900 leading-none">
            {stats.companies_portugal.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">empresas portuguesas</p>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-200" />

      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Building2 className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900 leading-none">
            {stats.companies_remote.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">empresas remotas</p>
        </div>
      </div>

      {stats.last_update && (
        <>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizado {formatISOToPTDate(stats.last_update)}
          </div>
        </>
      )}
    </div>
  );
}
