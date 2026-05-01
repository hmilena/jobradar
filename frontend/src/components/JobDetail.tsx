"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import Link from "next/link";
import { MapPin, Clock, Layers3, BriefcaseBusiness, ArrowRight } from "lucide-react";
import { api, type Job } from "@/lib/api";
import {
  REMOTE_LABELS,
  REMOTE_COLORS,
  SENIORITY_LABELS,
  CATEGORY_LABELS,
  formatISOToPTDate,
} from "@/lib/utils";
import { FreshnessBadge, JobHistoryBar } from "@/components/FreshnessBadge";
import { CompanyAvatar } from "@/components/CompanyAvatar";

type FullJob = Job & { description_clean: string };

const REMOTE_DOT: Record<string, string> = {
  remote: "bg-green-400",
  hybrid: "bg-blue-400",
  onsite: "bg-orange-400",
  unknown: "bg-slate-300",
};

const FILTER_LABELS: Record<string, (v: string) => string> = {
  remote_type: (v) => REMOTE_LABELS[v] ?? v,
  seniority: (v) => SENIORITY_LABELS[v] ?? v,
  category: (v) => CATEGORY_LABELS[v] ?? v,
  city: (v) => v,
  tech: (v) => v,
  role: (v) => v,
  max_days: (v) => `Últimos ${v} dias`,
};

interface Props {
  jobId: string;
  variant?: "drawer" | "page";
  activeFilters?: Record<string, string>;
  onFilterRemove?: (key: string) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="px-6 py-5 space-y-4 animate-pulse">
      <div className="h-3 w-40 rounded bg-slate-100" />
      <div className="h-5 w-2/3 rounded bg-slate-200" />
      <div className="h-3 w-full rounded bg-slate-100" />
      <div className="h-3 w-5/6 rounded bg-slate-100" />
      <div className="h-3 w-4/6 rounded bg-slate-100" />
    </div>
  );
}

function buildDiscoveryUrl(job: FullJob): string {
  const params = new URLSearchParams();
  if (job.remote_type && job.remote_type !== "unknown") params.set("remote_type", job.remote_type);
  if (job.seniority && job.seniority !== "unknown") params.set("seniority", job.seniority);
  if (job.company.category) params.set("category", job.company.category);
  if (job.role && job.role !== "unknown") params.set("role", job.role);
  const q = params.toString();
  return q ? `/?${q}` : "/";
}

function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "ul", "ol", "li", "h2", "h3", "h4", "strong", "em", "a", "span", "div"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ADD_ATTR: ["target"],
  });
}

function NoDescription() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
      <p className="font-medium text-slate-600 mb-1">Descrição não disponível</p>
      <p>
        Esta empresa publica as vagas no seu próprio site e a descrição não é acessível
        automaticamente. Clica em <span className="font-medium text-slate-700">Ver vaga original</span> para
        ler todos os detalhes diretamente na fonte.
      </p>
    </div>
  );
}

function Description({ content }: { content: string }) {
  if (!content) return null;

  const isHtml =
    content.trimStart().startsWith("<") ||
    content.includes("<p>") ||
    content.includes("<ul>") ||
    content.includes("<div>");

  if (isHtml) {
    const clean = sanitizeHtml(content);
    if (!clean) return <p className="text-sm text-slate-500 italic">Descrição não disponível.</p>;
    return (
      <div
        className="job-description text-sm"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return (
    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content}</p>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Context strip (chips or discovery link) — shared by both variants
// ──────────────────────────────────────────────────────────────────────────────
function ContextStrip({
  job,
  activeFilters,
  onFilterRemove,
}: {
  job: FullJob;
  activeFilters?: Record<string, string>;
  onFilterRemove?: (key: string) => void;
}) {
  const hasFilters = activeFilters && Object.keys(activeFilters).length > 0;

  if (hasFilters) {
    return (
      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(activeFilters!).map(([key, value]) => {
          const labelFn = FILTER_LABELS[key];
          if (!labelFn) return null;
          return (
            <button
              key={key}
              onClick={() => onFilterRemove?.(key)}
              className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
            >
              {labelFn(value)}
              <span className="text-brand-400">×</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <Link
        href={buildDiscoveryUrl(job)}
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
      >
        Ver mais vagas como esta
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Drawer variant: compact metadata line + description only
// ──────────────────────────────────────────────────────────────────────────────
function DrawerContent({
  job,
  activeFilters,
  onFilterRemove,
}: {
  job: FullJob;
  activeFilters?: Record<string, string>;
  onFilterRemove?: (key: string) => void;
}) {
  const metaParts: string[] = [];
  const location = job.location ?? job.company.city;
  if (location) metaParts.push(location);
  if (job.seniority && job.seniority !== "unknown") metaParts.push(SENIORITY_LABELS[job.seniority]);
  metaParts.push(formatISOToPTDate(job.first_seen_at));

  return (
    <div className="px-6 py-5">
      <ContextStrip job={job} activeFilters={activeFilters} onFilterRemove={onFilterRemove} />

      {/* Compact metadata line */}
      <p className="text-sm text-slate-500 mb-5">
        <Link
          href={`/empresas/${job.company.slug}`}
          className="font-medium text-slate-700 hover:text-brand-600 transition-colors"
        >
          {job.company.name}
        </Link>
        {metaParts.length > 0 && (
          <span> · {metaParts.join(" · ")}</span>
        )}
      </p>

      {/* Description */}
      {job.description_clean ? (
        <Description content={job.description_clean} />
      ) : (
        <NoDescription />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page variant: full metadata (company, grid, badges, tech) + description
// ──────────────────────────────────────────────────────────────────────────────
function PageContent({ job }: { job: FullJob }) {
  const remote = job.remote_type ?? "unknown";
  const seniority = job.seniority ?? "unknown";

  return (
    <div className="px-6 py-5">
      <ContextStrip job={job} />

      {/* Company */}
      <div className="flex items-center gap-3 mb-4">
        <CompanyAvatar name={job.company.name} size="lg" />
        <div>
          <Link
            href={`/empresas/${job.company.slug}`}
            className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            {job.company.name ?? "—"}
          </Link>
          {job.company.category && (
            <p className="inline-flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <Layers3 className="h-3 w-3" />
              {CATEGORY_LABELS[job.company.category] ?? job.company.category}
            </p>
          )}
        </div>
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-slate-900 leading-snug mb-4">{job.title}</h1>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(job.location ?? job.company.city) && (
          <div>
            <FieldLabel>Localização</FieldLabel>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{job.location ?? job.company.city}</span>
            </div>
          </div>
        )}
        <div>
          <FieldLabel>Publicado</FieldLabel>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{formatISOToPTDate(job.first_seen_at)}</span>
          </div>
        </div>
        <div>
          <FieldLabel>Modalidade</FieldLabel>
          <div className="mt-1">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${REMOTE_COLORS[remote]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${REMOTE_DOT[remote]}`} />
              {REMOTE_LABELS[remote]}
            </span>
          </div>
        </div>
        <div>
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

      {/* Freshness */}
      <div className="mb-1">
        <FreshnessBadge ageDays={job.age_days} />
      </div>
      <JobHistoryBar firstSeenAt={job.first_seen_at} republishCount={job.republish_count} />

      {/* Tech stack */}
      {job.tech_stack.length > 0 && (
        <div className="mt-4">
          <FieldLabel>Tecnologias</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.tech_stack.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-700"
              >
                <BriefcaseBusiness className="mr-1.5 h-3 w-3 text-slate-400" />
                <span className="font-mono">{tech}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {job.description_clean ? (
        <>
          <hr className="my-5 border-slate-100" />
          <Description content={job.description_clean} />
        </>
      ) : (
        <div className="mt-5">
          <NoDescription />
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────────────
export function JobDetail({ jobId, variant = "drawer", activeFilters, onFilterRemove }: Props) {
  const [job, setJob] = useState<FullJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setJob(null);
    api
      .getJob(jobId)
      .then((data) => {
        setJob(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [jobId]);

  if (loading) return <Skeleton />;

  if (error || !job) {
    return (
      <div className="px-6 py-10 text-center text-slate-500 text-sm">
        Não foi possível carregar a vaga.
      </div>
    );
  }

  if (variant === "page") {
    return <PageContent job={job} />;
  }

  return (
    <DrawerContent
      job={job}
      activeFilters={activeFilters}
      onFilterRemove={onFilterRemove}
    />
  );
}
