import {
  MapPin,
  Clock,
  Layers3,
  BriefcaseBusiness,
} from "lucide-react";
import type { Job } from "@/lib/api";
import {
  REMOTE_LABELS,
  REMOTE_COLORS,
  SENIORITY_LABELS,
  CATEGORY_LABELS,
  formatISOToPTDate,
} from "@/lib/utils";
import { FreshnessBadge, JobHistoryBar } from "@/components/FreshnessBadge";
import { CompanyAvatar } from "@/components/CompanyAvatar";

interface Props {
  job: Job;
  onSelect?: (id: string) => void;
}

const REMOTE_DOT: Record<string, string> = {
  remote: "bg-green-400",
  hybrid: "bg-blue-400",
  onsite: "bg-orange-400",
  unknown: "bg-slate-300",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}

const cardClass =
  "group relative block rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-brand-200 hover:shadow-md text-left w-full";

export default function JobCard({ job, onSelect }: Props) {
  const remote = job.remote_type ?? "unknown";
  const seniority = job.seniority ?? "unknown";

  const inner = (
    <>
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-brand-200 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex flex-1 items-start gap-4">
        <CompanyAvatar name={job.company.name} />

        <div className="flex flex-1 gap-0.5 min-w-0 flex-col">
          <span className="text-base font-semibold text-brand-600">
            {job.company.name ?? "—"}
          </span>

          <div className="mb-1 flex flex-wrap items-center gap-2">
            {job.company.category && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                <Layers3 className="mr-1 h-3 w-3" />
                {CATEGORY_LABELS[job.company.category] ?? job.company.category}
              </span>
            )}
            <FreshnessBadge ageDays={job.age_days} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-lg sm:text-xl font-semibold leading-snug text-slate-900 transition-colors group-hover:text-brand-700">
          {job.title}
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(job.location ?? job.company.city) && (
            <div className="min-w-0">
              <FieldLabel>Localização</FieldLabel>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">
                  {job.location ?? job.company.city}
                </span>
              </div>
            </div>
          )}

          <div className="min-w-0">
            <FieldLabel>Publicado</FieldLabel>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
              <Clock className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{formatISOToPTDate(job.first_seen_at)}</span>
            </div>
          </div>

          <div className="min-w-0">
            <FieldLabel>Modalidade</FieldLabel>
            <div className="mt-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${REMOTE_COLORS[remote]}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${REMOTE_DOT[remote]}`} />
                {REMOTE_LABELS[remote]}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <FieldLabel>Nível</FieldLabel>
            <div className="mt-1">
              {seniority !== "unknown" ? (
                <span className="inline-flex items-center rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                  {SENIORITY_LABELS[seniority]}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                  Não informado
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel>Tecnologias</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.tech_stack.length > 0 ? (
              <>
                {job.tech_stack.slice(0, 5).map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-700"
                  >
                    <BriefcaseBusiness className="mr-1.5 h-3 w-3 text-slate-400" />
                    <span className="font-mono">{tech}</span>
                  </span>
                ))}
                {job.tech_stack.length > 5 && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-500">
                    +{job.tech_stack.length - 5} tecnologias
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                Não informado
              </span>
            )}
          </div>
        </div>

        <JobHistoryBar
          firstSeenAt={job.first_seen_at}
          republishCount={job.republish_count}
        />
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        className={cardClass}
        onClick={() => onSelect(job.id)}
        data-job-id={job.id}
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cardClass}
    >
      {inner}
    </a>
  );
}
