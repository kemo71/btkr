export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-start justify-center gap-6 px-6 py-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-emerald-500"
        />
        PWA · Installable on iOS & Android
      </span>

      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        btkr
      </h1>

      <p className="max-w-prose text-base text-neutral-600 dark:text-neutral-400">
        A production-ready Next.js 15 Progressive Web App, deployed on Vercel.
        Add to your home screen on iOS or Android and it launches like a native
        app.
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href="https://nextjs.org/docs/app"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Next.js docs
        </a>
        <a
          href="https://web.dev/progressive-web-apps/"
          className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-900"
        >
          About PWAs
        </a>
      </div>
    </main>
  );
}
