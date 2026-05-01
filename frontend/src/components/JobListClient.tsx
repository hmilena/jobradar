"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Job } from "@/lib/api";
import JobCard from "@/components/JobCard";
import { JobDetail } from "@/components/JobDetail";
import { Drawer } from "@/components/Drawer";
import {
  REMOTE_LABELS,
  SENIORITY_LABELS,
  CATEGORY_LABELS,
} from "@/lib/utils";

const FILTER_LABEL_FNS: Record<string, (v: string) => string> = {
  remote_type: (v) => REMOTE_LABELS[v] ?? v,
  seniority: (v) => SENIORITY_LABELS[v] ?? v,
  category: (v) => CATEGORY_LABELS[v] ?? v,
  city: (v) => v,
  tech: (v) => v,
  role: (v) => v,
  max_days: (v) => `Últimos ${v} dias`,
};

interface Props {
  jobs: Job[];
  activeFilters: Record<string, string>;
}

export function JobListClient({ jobs, activeFilters }: Props) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  // Sync URL when drawer opens/closes
  useEffect(() => {
    if (selectedJobId) {
      const url = new URL(window.location.href);
      url.searchParams.set("job", selectedJobId);
      window.history.pushState({ jobId: selectedJobId }, "", url.toString());
    } else {
      const url = new URL(window.location.href);
      if (url.searchParams.has("job")) {
        url.searchParams.delete("job");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [selectedJobId]);

  // Browser back button closes the drawer
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("job")) {
        setSelectedJobId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSelect = useCallback((id: string) => {
    lastFocusedRef.current = document.querySelector(
      `[data-job-id="${id}"]`
    ) as HTMLElement | null;
    setSelectedJobId(id);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedJobId(null);
    setTimeout(() => {
      lastFocusedRef.current?.focus();
    }, 650);
  }, []);

  const handleFilterRemove = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      params.delete("page");
      router.push(`/?${params.toString()}`);
      handleClose();
    },
    [searchParams, router, handleClose]
  );

  if (jobs.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
          🔍
        </span>
        <p className="font-semibold text-slate-700">Nenhuma vaga com esses filtros</p>
        <p className="mt-1 text-sm text-slate-400">Tente remover alguns filtros</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onSelect={handleSelect} />
        ))}
      </div>

      <Drawer
        isOpen={!!selectedJobId}
        onClose={handleClose}
        title={selectedJob?.title}
        footer={
          selectedJob ? (
            <a
              href={selectedJob.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full justify-center text-sm py-3"
            >
              Ver vaga original
              <svg className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ) : null
        }
      >
        {selectedJobId && (
          <JobDetail
            jobId={selectedJobId}
            activeFilters={activeFilters}
            onFilterRemove={handleFilterRemove}
          />
        )}
      </Drawer>
    </>
  );
}
