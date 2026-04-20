import { Clock } from "lucide-react";
import { getJobFreshness } from "@/lib/utils";

export function FreshnessBadge({ ageDays }: { ageDays: number }) {
  const { label, color, bgColor } = getJobFreshness(ageDays);

  return (
    <span
      className="text-xs font-medium py-[3px] px-[10px] rounded-lg whitespace-nowrap inline-flex items-center gap-1"
      style={{ backgroundColor: bgColor, color }}
    >
      <Clock size={12} />
      {label}
    </span>
  );
}

export function JobHistoryBar({
  firstSeenAt,
  republishCount,
}: {
  firstSeenAt: string;
  republishCount: number;
}) {
  const formattedDate = new Date(firstSeenAt).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const republishText =
    republishCount === 0
      ? "Nunca republicada"
      : `Republicada ${republishCount} ${republishCount === 1 ? "vez" : "vezes"}`;

  return (
    <div className="bg-[#F5F5F0] rounded-lg py-2.5 px-3.5 text-xs text-[#6B6B6B] flex flex-wrap items-center gap-2 mt-3">
      <Clock size={14} className="flex-shrink-0" />
      <span>
        Vista pela primeira vez em{" "}
        <strong className="text-[#1A1A1A]">{formattedDate}</strong>
        {" · "}
        <span className={`font-medium${republishCount > 0 ? " text-[#A32D2D]" : ""}`}>
          {republishText}
        </span>
      </span>
    </div>
  );
}
