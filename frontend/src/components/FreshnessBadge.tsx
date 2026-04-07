import { Clock } from "lucide-react";
import { getJobFreshness } from "@/lib/utils";

export function FreshnessBadge({ ageDays }: { ageDays: number }) {
  const { label, color, bgColor } = getJobFreshness(ageDays);

  return (
    <span
      style={{
        fontSize: "12px",
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: "8px",
        backgroundColor: bgColor,
        color: color,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
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
    <div
      style={{
        backgroundColor: "#F5F5F0",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "12px",
        color: "#6B6B6B",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "12px",
      }}
    >
      <Clock size={14} style={{ flexShrink: 0 }} />
      <span>
        Vista pela primeira vez em{" "}
        <strong style={{ color: "#1A1A1A" }}>{formattedDate}</strong>
        {" · "}
        <span
          style={{
            fontWeight: 500,
            color: republishCount > 0 ? "#A32D2D" : undefined,
          }}
        >
          {republishText}
        </span>
      </span>
    </div>
  );
}
