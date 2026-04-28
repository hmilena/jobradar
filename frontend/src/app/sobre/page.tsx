import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Sobre — JobRadar Portugal",
  description:
    "Por que o JobRadar PT existe. Um agregador de vagas tech em Portugal que lista só empresas que contratam direto.",
};

export default function SobrePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Sobre
          </h1>
          <p className="mt-1 text-slate-500">Por que o JobRadar PT existe.</p>

          <div className="mt-10 space-y-10">

            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">
                O que é
              </h2>
              <p className="text-slate-700 leading-relaxed">
                O JobRadar PT é um agregador de vagas tech em Portugal que lista{" "}
                <strong className="text-slate-900 font-semibold">
                  só empresas que contratam direto
                </strong>
                . Sem consultorias, sem outsourcing, sem intermediários a ficar
                com parte do teu salário.
              </p>
              <p className="mt-3 text-slate-700 leading-relaxed">
                As vagas vêm direto das páginas de carreiras das empresas. Se a
                empresa não contrata direto, não aparece aqui.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">
                Por quê
              </h2>
              <p className="text-slate-700 leading-relaxed">
                O mercado tech em Portugal é dominado por consultorias.
                Plataformas como ITJobs ou Landing.jobs misturam tudo — empresas
                produto e intermediários — sem distinção. O resultado é que a
                maioria das vagas visíveis não são contratos diretos.
              </p>
              <p className="mt-3 text-slate-700 leading-relaxed">
                Isso cria estagnação salarial (a consultoria precisa de margem),
                processos seletivos intermináveis e falta de transparência sobre
                quanto a empresa realmente paga.
              </p>
              <p className="mt-3 text-slate-700 leading-relaxed">
                Consultorias têm o seu papel. Mas não precisam ser o caminho
                padrão pra todo mundo.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">
                O princípio
              </h2>
              <div className="border-l-2 border-slate-900 bg-white rounded-r-xl px-5 py-4 shadow-sm">
                <p className="text-slate-900 font-medium leading-relaxed">
                  Programadores merecem negociar direto com quem os vai
                  contratar. Salários mais justos, processos mais curtos,
                  relações de trabalho mais claras.
                </p>
              </div>
            </section>

            <hr className="border-slate-200" />

            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">
                Quem fez
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Feito por uma dev frontend com mais de 10 anos no mercado,
                cansada do processo.
              </p>
              <p className="mt-3 text-slate-700 leading-relaxed">
                Se quiseres contribuir com empresas que faltam na lista, está
                tudo no{" "}
                <a
                  href="https://github.com/hmilena/jobradar"
                  className="text-brand-600 font-medium hover:text-brand-700 underline underline-offset-2 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
                .
              </p>
            </section>

          </div>

          <div className="mt-12 pt-6 border-t border-slate-200 text-sm text-slate-400">
            Conheces uma empresa que contrata direto e não está listada?{" "}
            <a
              href="https://github.com/hmilena/jobradar/issues"
              className="text-brand-600 hover:text-brand-700 underline underline-offset-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abre uma issue
            </a>{" "}
            ou manda um PR.
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
