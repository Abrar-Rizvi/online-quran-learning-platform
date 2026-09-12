const TRUST_ITEMS = [
  { icon: "✦", label: "5 Days Free Trial" },
  { icon: "◆", label: "Qualified Teachers" },
  { icon: "◍", label: "Flexible Classes" },
];

export default function HeroContentTwo() {
  return (
    <div className="relative z-10 text-center lg:text-left">
      <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-gold">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
        Learn Quran Online
      </p>

      <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-cream sm:text-5xl xl:text-[3.6rem]">
        Learn Quran with{" "}
        <span className="bg-gradient-to-r from-gold via-gold to-cream bg-clip-text text-transparent">
          Confidence &amp; Guidance
        </span>
      </h1>

      <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg lg:mx-0">
        Learn Quran online with qualified teachers through structured,
        flexible and personalized lessons for students of all ages.
      </p>

      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
        <a
          href="#start-free-trial"
          className="inline-flex w-full items-center justify-center rounded-full bg-secondary px-8 py-4 text-base font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:w-auto"
        >
          Start Free Trial
        </a>
        <a
          href="#explore-courses"
          className="inline-flex w-full items-center justify-center rounded-full border border-cream/35 px-8 py-4 text-base font-semibold text-cream transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:w-auto"
        >
          Explore Courses
        </a>
      </div>

      <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start">
        {TRUST_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm font-medium text-cream/80">
            <span aria-hidden="true" className="text-gold">
              {item.icon}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
