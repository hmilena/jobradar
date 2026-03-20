import { MapPin, Clock, ExternalLink } from "lucide-react";
import type { Job } from "@/lib/api";
import {
  formatDate,
  REMOTE_LABELS,
  REMOTE_COLORS,
  SENIORITY_LABELS,
  CATEGORY_LABELS,
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

  // Gera uma cor determinística baseada no nome
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
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colors[colorIndex]} text-white text-sm font-bold shadow-sm`}
    >
      {initials}
    </span>
  );
}

export default function JobCard({ job }: Props) {
  const remote = job.remote_type ?? "unknown";
  const seniority = job.seniority ?? "unknown";

  return (
    <article className="group relative bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-200 hover:shadow-md transition-all duration-200">
      {/* Accent bar */}
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-brand-200 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <CompanyAvatar name={job.company.name} />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* Company + category */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-brand-600">
                  {job.company.name}
                </span>
                {job.company.category && (
                  <span className="badge bg-slate-100 text-slate-500 text-[11px]">
                    {CATEGORY_LABELS[job.company.category] ?? job.company.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-base font-semibold text-slate-900 leading-snug group-hover:text-brand-700 transition-colors">
                {job.title}
              </h2>

              {/* Meta */}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                {(job.location ?? job.company.city) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location ?? job.company.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(job.first_seen_at)}
                </span>
              </div>
            </div>

            {/* CTA */}
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-sm hover:shadow transition-all active:scale-95"
            >
              Ver vaga
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {/* Remote badge with dot */}
            <span className={`badge ${REMOTE_COLORS[remote]} gap-1`}>
              <span className={`h-1.5 w-1.5 rounded-full ${REMOTE_DOT[remote]}`} />
              {REMOTE_LABELS[remote]}
            </span>

            {seniority !== "unknown" && (
              <span className="badge bg-purple-50 text-purple-700 border border-purple-100">
                {SENIORITY_LABELS[seniority]}
              </span>
            )}

            {job.tech_stack.slice(0, 5).map((tech) => (
              <span
                key={tech}
                className="badge bg-slate-50 text-slate-600 border border-slate-200 font-mono text-[11px]"
              >
                {tech}
              </span>
            ))}
            {job.tech_stack.length > 5 && (
              <span className="badge bg-slate-100 text-slate-400">
                +{job.tech_stack.length - 5}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
