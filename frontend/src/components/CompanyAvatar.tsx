const COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-yellow-600",
  "from-indigo-500 to-blue-600",
  "from-teal-500 to-green-600",
];

interface Props {
  name: string | null;
  size?: "sm" | "md" | "lg";
}

export function CompanyAvatar({ name, size = "md" }: Props) {
  const initials = (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colorIndex = (name ?? "?").charCodeAt(0) % COLORS.length;

  const sizeClass = {
    sm: "h-8 w-8 rounded-lg text-xs",
    md: "h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl text-sm",
    lg: "h-14 w-14 rounded-2xl text-base",
  }[size];

  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br ${COLORS[colorIndex]} ${sizeClass} text-white font-bold shadow-sm ring-1 ring-black/5`}
    >
      {initials}
    </span>
  );
}
