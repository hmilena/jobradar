import { MapPin, Clock, ExternalLink, Layers3, BriefcaseBusiness } from "lucide-react";
import type { Job } from "@/lib/api";
import {
  formatDate,
  REMOTE_LABELS,
  REMOTE_COLORS,
  SENIORITY_LABELS,
  CATEGORY_LABELS,
  formatISOToPTDate,
} from "@/lib/utils";

interface Props {
  job: Job;
}

const REMOTE_DOT: Record<string, string> = {
  remote: "bg-green-400",
  hybrid: "bg-blue-400",
  onsite: "bg-orange-400",
  unknown: "bg-slate-300",
};

function CompanyAvatar({ name }: { name: string | null }) {
  const initials = (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-amber-500 to-yellow-600",
    "from-indigo-500 to-blue-600",
    "from-teal-500 to-green-600",
  ];
  const colorIndex = (name ?? "?").charCodeAt(0) % colors.length;

  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${colors[colorIndex]} text-white text-sm font-bold shadow-sm ring-1 ring-black/5`}
    >
      {initials}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}

export default function JobCard({ job }: Props) {
  const remote = job.remote_type ?? "unknown";
  const seniority = job.seniority ?? "unknown";

  return (
    <article className="group relative rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-brand-200 hover:shadow-md">
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-brand-200 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start gap-4">
        <CompanyAvatar name={job.company.name} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Company */}
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-semibold text-brand-600">
                  {job.company.name}
                </span>

                {job.company.category && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    <Layers3 className="mr-1 h-3 w-3" />
                    {CATEGORY_LABELS[job.company.category] ?? job.company.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold leading-snug text-slate-900 transition-colors group-hover:text-brand-700">
                {job.title}
              </h2>

              {/* Structured meta */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(job.location ?? job.company.city) && (
                  <div className="min-w-0">
                    <FieldLabel>Localização</FieldLabel>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{job.location ?? job.company.city}</span>
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

              {/* Tech stack */}
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
            </div>

            {/* CTA */}
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow active:scale-95"
            >
              Ver vaga
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
