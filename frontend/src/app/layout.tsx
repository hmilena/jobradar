import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
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

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="min-h-screen flex flex-col">
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
