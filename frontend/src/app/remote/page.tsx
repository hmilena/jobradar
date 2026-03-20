import { Suspense } from "react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import JobCard from "@/components/JobCard";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";

interface PageProps {
  searchParams: {
    q?: string;
    seniority?: string;
    role?: string;
    page?: string;
  };
}

export default async function RemotePage({ searchParams }: PageProps) {
  const page = Number(searchParams.page ?? 1);

  const [jobsData, filters] = await Promise.all([
    api.getJobs({
      ...searchParams,
      source: "remote",
      remote_type: "remote",
      page,
      limit: 20,
    }),
    api.getFilters(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-b from-emerald-50 to-slate-50 border-b border-slate-200/60">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            100% Remote
          </div>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900 tracking-tight">
            Remote from Portugal
          </h1>
          <p className="mt-2 text-slate-500">
            Vagas de empresas de todo o mundo, trabalha a partir de Portugal.
          </p>

          {/* Disclaimer */}
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Atenção:</strong> Nem todas as empresas aceitam candidatos em Portugal.
              Verifica sempre a política de localização antes de te candidatares.
            </span>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            <strong className="text-slate-700">{jobsData.total.toLocaleString()}</strong> vagas remotas disponíveis
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {/* Filters */}
        <div className="mb-6">
          <Suspense>
            <FilterBar
              filters={filters}
              basePath="/remote"
              allowedKeys={["seniority", "role"]}
            />
          </Suspense>
        </div>

        {jobsData.results.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🌍
            </span>
            <p className="font-semibold text-slate-700">
              Nenhuma vaga remota de momento
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Tenta mais tarde — atualizamos a cada 6 horas
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobsData.results.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        <Suspense>
          <Pagination total={jobsData.total} page={page} limit={20} />
        </Suspense>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p className="font-medium text-slate-500">
            JobRadar Portugal{" "}
            <span className="text-xs text-slate-400">por Mia</span>
          </p>
          <p>
            Vagas via{" "}
            <a href="https://remoteok.com" className="underline underline-offset-2 hover:text-slate-600 transition-colors" target="_blank" rel="noopener noreferrer">
              RemoteOK
            </a>
            {" & "}
            <a href="https://weworkremotely.com" className="underline underline-offset-2 hover:text-slate-600 transition-colors" target="_blank" rel="noopener noreferrer">
              WeWorkRemotely
            </a>
            {" · "}
            <a href="https://github.com/hmilena/jobradar" className="underline underline-offset-2 hover:text-slate-600 transition-colors" target="_blank" rel="noopener noreferrer">
              Open Source
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
