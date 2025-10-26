import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
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
          </div>
        </div>
        <div className="text-sm text-center text-zinc-500 dark:text-zinc-400">
          <p>Powered by Next.js</p>
        </div>
      </main>
    </div>
  );
}
