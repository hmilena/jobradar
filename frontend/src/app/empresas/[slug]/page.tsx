import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin, Briefcase } from "lucide-react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import JobCard from "@/components/JobCard";
import { Footer } from "@/components/Footer";
import { CATEGORY_LABELS, getDomain } from "@/lib/utils";

interface Props {
  params: { slug: string };
}

function CompanyAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xl font-bold shadow-md">
      {initials}
    </span>
  );
}

export default async function EmpresaDetailPage({ params }: Props) {
  try {
    const company = await api.getCompany(params.slug);

    return (
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          {/* Back */}
          <Link
            href="/empresas"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Todas as empresas
          </Link>

          {/* Company card */}
          <div className="card p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <CompanyAvatar name={company.name} />
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {company.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="badge bg-brand-50 text-brand-700 border border-brand-100 text-xs">
                      {CATEGORY_LABELS[company.category] ?? company.category}
                    </span>
                    {company.city && (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {company.city}
                      </span>
                    )}
                    {company.domain && (
                      <a
                        href={company.domain}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 transition-colors"
                      >
                        {getDomain(company.domain)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {company.careers_url && (
                <a
                  href={company.careers_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary shrink-0"
                >
                  <Briefcase className="h-4 w-4" />
                  Ver todas as vagas
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Jobs section */}
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-900">Vagas abertas</h2>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-semibold text-brand-700">
              {company.jobs.length}
            </span>
          </div>

          {company.jobs.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                💼
              </span>
              <p className="font-semibold text-slate-600">
                Nenhuma vaga ativa no momento
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Confira a página de carreiras da empresa
              </p>
              {company.careers_url && (
                <a
                  href={company.careers_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 btn-outline text-sm"
                >
                  Ver página de carreiras
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {company.jobs.map((job) => (
                <JobCard key={job.id} job={{ ...job, company }} />
              ))}
            </div>
          )}
        </main>

        <Footer className="mt-8" />
      </div>
    );
  } catch {
    notFound();
  }
}
