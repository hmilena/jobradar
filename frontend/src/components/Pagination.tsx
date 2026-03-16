"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  total: number;
  page: number;
  limit: number;
}

export default function Pagination({ total, page, limit }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  function goTo(p: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`/?${next.toString()}`);
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  return (
    <div className="flex items-center justify-center gap-1 py-8">
      <button
        onClick={() => goTo(page - 1)}
        disabled={page === 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) => {
        const prev = pages[i - 1];
        const showEllipsis = prev && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-1">
            {showEllipsis && (
              <span className="px-1 text-sm text-slate-300">…</span>
            )}
            <button
              onClick={() => goTo(p)}
              className={`h-9 w-9 rounded-xl text-sm font-medium transition-all ${
                p === page
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {p}
            </button>
          </span>
        );
      })}

      <button
        onClick={() => goTo(page + 1)}
        disabled={page === totalPages}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
