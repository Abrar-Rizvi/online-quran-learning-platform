import { Reveal } from "@/components/ui";

type IconProps = { className?: string };

function LineIcon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const UsersIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </LineIcon>
);

const ClockIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </LineIcon>
);

const LaptopIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <rect x="3.5" y="5" width="17" height="11" rx="1.5" />
    <path d="M2 19h20" />
  </LineIcon>
);

const ShieldCheckIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M12 3 4.5 5.5v5c0 5 3.2 8.4 7.5 10 4.3-1.6 7.5-5 7.5-10v-5Z" />
    <path d="m9 12 2 2 4-4" />
  </LineIcon>
);

const TILES: { icon: (p: IconProps) => React.ReactElement; label: string }[] = [
  { icon: UsersIcon, label: "Qualified Teachers" },
  { icon: ClockIcon, label: "Flexible Timings" },
  { icon: LaptopIcon, label: "Online Classes" },
  { icon: ShieldCheckIcon, label: "Trusted by Families" },
];

/** The Contact page's PageHeader feature strip — informational only, no links/hover lift. */
export function HeaderFeatureTiles() {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TILES.map(({ icon: Icon, label }, i) => (
        <li key={label}>
          <Reveal staggerIndex={i} className="h-full">
            <div
              className="flex h-full flex-col items-center justify-center gap-2.5 rounded-[var(--radius-lg)] px-4 py-5 text-center"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <Icon className="size-7 text-[var(--gold-400)]" />
              <p
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {label}
              </p>
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
