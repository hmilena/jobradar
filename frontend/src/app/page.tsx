import { Suspense } from "react";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import JobCard from "@/components/JobCard";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import StatsBar from "@/components/StatsBar";
import { Footer } from "@/components/Footer";

interface PageProps {
  searchParams: {
    q?: string;
    remote_type?: string;
    seniority?: string;
    city?: string;
    category?: string;
    tech?: string;
    role?: string;
    max_days?: string;
    page?: string;
  };
}

const JOBS_PAGE_SIZE = 20;

function searchParamsToPageOneQuery(sp: PageProps["searchParams"]): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (!value || key === "page") continue;
    next.set(key, value);
  }
  next.set("page", "1");
  const q = next.toString();
  return q ? `/?${q}` : "/?page=1";
}

export default async function HomePage({ searchParams }: PageProps) {
  const raw = searchParams.page;
  let page: number;
  if (raw === undefined || raw === "") {
    page = 1;
  } else {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) {
      redirect(searchParamsToPageOneQuery(searchParams));
    }
    page = n;
  }

  const [jobsData, filters, stats] = await Promise.all([
    api.getJobs({ ...searchParams, page, limit: JOBS_PAGE_SIZE }),
    api.getFilters(),
    api.getStats(),
  ]);

  const totalPages = Math.ceil(jobsData.total / JOBS_PAGE_SIZE);
  if (jobsData.total === 0) {
    if (page > 1) {
      redirect(searchParamsToPageOneQuery(searchParams));
    }
  } else if (page > totalPages) {
    redirect(searchParamsToPageOneQuery(searchParams));
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-50 to-slate-50 border-b border-slate-200/60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Vagas tech em Portugal
          </h1>
          <p className="mt-2 text-slate-500">
            Só empresas que contratam diretamente —{" "}
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
          <Pagination
            total={jobsData.total}
            page={page}
            limit={JOBS_PAGE_SIZE}
          />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
