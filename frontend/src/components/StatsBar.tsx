import { Building2, Briefcase, RefreshCw } from "lucide-react";
import type { Stats } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Briefcase className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900 leading-none">
            {stats.total_jobs.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">vagas diretas</p>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-200" />

      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Building2 className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900 leading-none">
            {stats.total_companies}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">empresas curadas</p>
        </div>
      </div>

      {stats.last_update && (
        <>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizado {formatDate(stats.last_update)}
          </div>
        </>
      )}
    </div>
  );
}
