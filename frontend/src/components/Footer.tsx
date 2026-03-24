import clsx from "clsx";

type Props = {
  className?: string;
  displayLinks?: boolean;
};

const LINKS = [
  {
    label: "RemoteOK",
    href: "https://remoteok.com",
  },
  {
    label: "WeWorkRemotely",
    href: "https://weworkremotely.com",
  },
];

const linkClass =
  "underline underline-offset-2 hover:text-slate-600 transition-colors";

export function Footer({ className, displayLinks = false }: Props) {
  return (
    <footer className={clsx("border-t border-slate-200 bg-white py-8", className)}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-400 sm:flex-row">
        <div className="font-medium text-slate-500">
          JobRadar Portugal <span className="text-xs text-slate-400"> por </span>
          <a
            href="https://www.linkedin.com/in/hmilena/"
            className={clsx("text-xs text-slate-400", linkClass)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mia
          </a>
        </div>
        {displayLinks && (
          <div className="flex flex-col items-center gap-2 text-center text-sm text-slate-400">
            <span>Vagas via</span>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={linkClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
        <div>
          Vagas atualizadas diariamente ·{" "}
          <a
            href="https://github.com/hmilena/jobradar"
            className={linkClass}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Source
          </a>
        </div>
      </div>
    </footer>
  );
}
