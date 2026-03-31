export const dynamic = "force-dynamic";

import Link from "next/link";
import { MapPin, Flag, Globe } from "lucide-react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CATEGORY_LABELS, getDomain } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  banco: "from-blue-500 to-blue-700",
  fintech: "from-emerald-500 to-teal-700",
  telco: "from-violet-500 to-purple-700",
  seguradora: "from-orange-500 to-amber-700",
  software: "from-brand-500 to-brand-700",
  ecommerce: "from-pink-500 to-rose-700",
  healthtech: "from-green-500 to-emerald-700",
  automotive_tech: "from-slate-500 to-slate-700",
  energia: "from-yellow-500 to-orange-700",
  industrial_tech: "from-zinc-500 to-zinc-700",
  agencia: "from-fuchsia-500 to-purple-700",
  retalho: "from-red-500 to-rose-700",
  pharma: "from-cyan-500 to-blue-700",
  iot: "from-teal-500 to-cyan-700",
  ciberseguranca: "from-red-600 to-rose-800",
  turismo: "from-sky-500 to-blue-600",
  seguranca_publica: "from-indigo-500 to-indigo-700",
  remote: "from-emerald-400 to-teal-600",
};

function CompanyInitials({ name, category }: { name: string; category: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const gradient = CATEGORY_COLORS[category] ?? "from-brand-500 to-brand-700";
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white text-sm font-bold shadow-sm`}
    >
      {initials}
    </span>
  );
}

type Company = Awaited<ReturnType<typeof api.getCompanies>>[number];

function CompanyCard({ company }: { company: Company }) {
  return (
    <Link
      href={`/empresas/${company.slug}`}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-brand-200 hover:shadow-md hover:-translate-y-0.5"
    >
      <CompanyInitials name={company.name} category={company.category} />
      <div className="min-w-0">
        <p className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors truncate text-sm">
          {company.name}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
          {company.city && (
            <>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{company.city}</span>
              {company.domain && <span>·</span>}
            </>
          )}
          {company.domain && (
            <span className="truncate">{getDomain(company.domain)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function EmpresasPage() {
  const companies = await api.getCompanies();

  const ptCompanies = companies.filter((c) => c.category !== "remote");
  const remoteCompanies = companies.filter((c) => c.category === "remote");

  // PT companies grouped by sector
  const byCategory: Record<string, typeof ptCompanies> = {};
  for (const c of ptCompanies) {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  }
  const ptSorted = Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b));

  // Remote companies sorted alphabetically
  const remoteSorted = [...remoteCompanies].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-50 to-slate-50 border-b border-slate-200/60">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Empresas</h1>
          <p className="mt-2 text-slate-500">
            <strong className="text-slate-700">{ptCompanies.length} empresas portuguesas</strong>
            {" "}que contratam diretamente, mais{" "}
            <strong className="text-slate-700">{remoteCompanies.length} empresas remotas</strong>
            {" "}de todo o mundo abertas a Portugal.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 space-y-16">

        {/* ── Secção 1: Empresas em Portugal ── */}
        <section>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
              <Flag className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Empresas em Portugal</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Contratam diretamente — escritório em Portugal, sem intermediários
              </p>
            </div>
            <span className="ml-auto rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
              {ptCompanies.length} empresas
            </span>
          </div>

          <div className="space-y-10">
            {ptSorted.map(([category, list]) => (
              <div key={category}>
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {CATEGORY_LABELS[category] ?? category}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {list.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((company) => (
                    <CompanyCard key={company.id} company={company} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* ── Secção 2: Empresas Remotas ── */}
        <section>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Globe className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Empresas Remotas</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Podem estar em qualquer parte do mundo — aceitam candidatos a partir de Portugal
              </p>
            </div>
            <span className="ml-auto rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              {remoteCompanies.length} empresas
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {remoteSorted.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
