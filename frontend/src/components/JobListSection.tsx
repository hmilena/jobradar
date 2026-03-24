import type { Job } from "@/lib/api";
import JobCard from "@/components/JobCard";

export interface JobListEmptyCopy {
  emoji: string;
  title: string;
  subtitle: string;
}

interface JobListSectionProps {
  jobs: Job[];
  empty: JobListEmptyCopy;
}

/**
 * Lista de vagas com estado vazio consistente entre páginas (home, remote, etc.).
 */
export function JobListSection({ jobs, empty }: JobListSectionProps) {
  if (jobs.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
          {empty.emoji}
        </span>
        <p className="font-semibold text-slate-700">{empty.title}</p>
        <p className="mt-1 text-sm text-slate-400">{empty.subtitle}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
