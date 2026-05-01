import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JobDetail } from "@/components/JobDetail";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const job = await api.getJob(params.id);
    const title = `${job.title} — ${job.company.name} | JobRadar PT`;
    const description = job.description_clean
      ? job.description_clean.replace(/<[^>]+>/g, "").slice(0, 160)
      : `Vaga de ${job.title} em ${job.company.name}. Contratação direta, sem intermediários.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://jobradarpt.vercel.app/vagas/${params.id}`,
        siteName: "JobRadar Portugal",
        locale: "pt_PT",
        type: "website",
      },
    };
  } catch {
    return { title: "Vaga não encontrada | JobRadar PT" };
  }
}

export default async function VagaPage({ params }: Props) {
  let job;
  try {
    job = await api.getJob(params.id);
  } catch {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description_clean?.replace(/<[^>]+>/g, "") ?? job.title,
    datePosted: job.first_seen_at,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company.name,
      ...(job.company.domain ? { sameAs: `https://${job.company.domain}` } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: job.location ?? job.company.city ?? "Portugal",
    },
    ...(job.remote_type === "remote"
      ? { jobLocationType: "TELECOMMUTE" }
      : {}),
    employmentType: "FULL_TIME",
    url: job.url,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* Back link */}
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Ver todas as vagas
          </a>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <JobDetail jobId={params.id} variant="page" />
          </div>

          {/* CTA */}
          <div className="mt-4">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full justify-center text-sm py-3.5"
            >
              Ver vaga original
              <ExternalLink className="h-4 w-4 ml-1.5" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
