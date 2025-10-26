import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Advocacy Helper
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Ferramentas para auxiliar em cálculos jurídicos e financeiros.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <Link
              href="/selic"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-white transition-colors hover:bg-blue-700"
            >
              Calculadora SELIC
            </Link>
            <Link
              href="/fine-correction"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 text-white transition-colors hover:bg-green-700"
            >
              Correção de Multa
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Desenvolvido por Pedro Leale</span>
            <a
              href="https://github.com/PedroLeale/advocacy-helper"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="GitHub Repository"
            >
              <Image
                src="/github_icon.png"
                alt="GitHub"
                width={20}
                height={20}
                className="dark:invert"
              />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
