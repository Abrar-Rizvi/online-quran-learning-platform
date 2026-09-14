export default function Home() {
  return (
    <main className="construction-bg flex min-h-screen flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        {/* Brand / logo placeholder */}
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-cream shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <rect x="5" y="5" width="14" height="14" rx="1" />
              <rect
                x="5"
                y="5"
                width="14"
                height="14"
                rx="1"
                transform="rotate(45 12 12)"
              />
            </svg>
          </span>
          <span className="text-2xl font-semibold tracking-tight text-primary">
            Adan Online Academy
          </span>
        </div>

        {/* Status badge */}
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-surface/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary backdrop-blur-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
          Coming Soon
        </span>

        <h1 className="text-4xl font-bold leading-tight tracking-tight text-primary sm:text-5xl md:text-6xl">
          Our Website is Under Construction
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/70 sm:text-lg">
          We are building an online Quran learning platform to serve students
          worldwide. Exciting things are coming soon!
        </p>

        <div className="mt-10 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />

        <p className="mt-6 text-sm font-medium tracking-wide text-ink/50">
          quranclass.us
        </p>
      </div>
    </main>
  );
}
