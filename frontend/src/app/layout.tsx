import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobRadar Portugal — Vagas diretas em tech, sem consultorias",
  description:
    "Vagas de programação e tecnologia em Portugal publicadas diretamente pelas empresas. Sem consultorias, sem intermediários.",
  openGraph: {
    title: "JobRadar Portugal",
    description: "Vagas de tech diretas em Portugal. Zero consultorias.",
    url: "https://jobradarpt.vercel.app/",
    siteName: "JobRadar Portugal",
    locale: "pt_PT",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
