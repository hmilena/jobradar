import { Suspense } from "react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import JobCard from "@/components/JobCard";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import StatsBar from "@/components/StatsBar";

interface PageProps {
  searchParams: {
    q?: string;
    remote_type?: string;
    seniority?: string;
    city?: string;
    category?: string;
    tech?: string;
    page?: string;
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const page = Number(searchParams.page ?? 1);

  const [jobsData, filters, stats] = await Promise.all([
    api.getJobs({ ...searchParams, page, limit: 20 }),
    api.getFilters(),
    api.getStats(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-50 to-slate-50 border-b border-slate-200/60">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
            Atualizado a cada 6 horas
          </div>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900 tracking-tight">
            Vagas tech em Portugal
          </h1>
          <p className="mt-2 text-slate-500">
            Só empresas que contratam diretamente —{" "}
            <span className="text-slate-700 font-medium">
              zero consultorias
            </span>
            ,{" "}
            <span className="text-slate-700 font-medium">
              zero intermediários
            </span>
            .
          </p>
          <div className="mt-5">
            <StatsBar stats={stats} />
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {/* Filters */}
        <div className="mb-6">
          <Suspense>
            <FilterBar filters={filters} />
          </Suspense>
        </div>

        {/* Results header */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {jobsData.total === 0 ? (
              "Nenhuma vaga encontrada"
            ) : (
              <>
                <strong className="text-slate-900">
                  {jobsData.total.toLocaleString()}
                </strong>{" "}
                {jobsData.total === 1 ? "vaga encontrada" : "vagas encontradas"}
              </>
            )}
          </p>
        </div>

        {/* Job list */}
        {jobsData.results.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🔍
            </span>
            <p className="font-semibold text-slate-700">
              Nenhuma vaga com esses filtros
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Tente remover alguns filtros
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobsData.results.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <Suspense>
          <Pagination total={jobsData.total} page={page} limit={20} />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p className="font-medium text-slate-500">
            JobRadar Portugal{" "}
            <span className="text-xs text-slate-400">por Mia</span>
          </p>
          <p>
            Vagas atualizadas a cada 6 horas ·{" "}
            <a
              href="https://github.com/hmilena/direct-contract"
              className="underline underline-offset-2 hover:text-slate-600 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Source
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
