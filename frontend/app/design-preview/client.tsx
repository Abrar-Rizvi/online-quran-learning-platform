// TODO: Remove this file before launch — internal design review only.
"use client";

import {
  Button,
  Section,
  SectionHeading,
  Badge,
  Reveal,
  IslamicPattern,
} from "@/components/ui";

/* ── Color swatch helper ──────────────────────────────────────── */

function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-[var(--radius-sm)] border border-[var(--border)]"
        style={{ backgroundColor: `var(${cssVar})` }}
      />
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-[var(--text-muted)]">{cssVar}</p>
      </div>
    </div>
  );
}

/* ── Preview sections ─────────────────────────────────────────── */

function ColorTokens() {
  return (
    <div className="space-y-8">
      <h3>Brand Greens</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Swatch name="green-950" cssVar="--green-950" />
        <Swatch name="green-900" cssVar="--green-900" />
        <Swatch name="green-800" cssVar="--green-800" />
        <Swatch name="green-700" cssVar="--green-700" />
        <Swatch name="green-500" cssVar="--green-500" />
        <Swatch name="green-200" cssVar="--green-200" />
        <Swatch name="green-100" cssVar="--green-100" />
        <Swatch name="green-50" cssVar="--green-50" />
      </div>

      <h3>Accent Golds</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Swatch name="gold-700" cssVar="--gold-700" />
        <Swatch name="gold-600" cssVar="--gold-600" />
        <Swatch name="gold-500" cssVar="--gold-500" />
        <Swatch name="gold-400" cssVar="--gold-400" />
        <Swatch name="gold-300" cssVar="--gold-300" />
        <Swatch name="gold-50" cssVar="--gold-50" />
      </div>

      <h3>Neutrals</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Swatch name="bg" cssVar="--bg" />
        <Swatch name="surface" cssVar="--surface" />
        <Swatch name="surface-alt" cssVar="--surface-alt" />
        <Swatch name="border" cssVar="--border" />
        <Swatch name="border-strong" cssVar="--border-strong" />
        <Swatch name="text" cssVar="--text" />
        <Swatch name="text-muted" cssVar="--text-muted" />
      </div>

      <h3>Status</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Swatch name="success" cssVar="--success" />
        <Swatch name="success-bg" cssVar="--success-bg" />
        <Swatch name="error" cssVar="--error" />
        <Swatch name="error-bg" cssVar="--error-bg" />
        <Swatch name="warning" cssVar="--warning" />
        <Swatch name="warning-bg" cssVar="--warning-bg" />
        <Swatch name="info" cssVar="--info" />
        <Swatch name="info-bg" cssVar="--info-bg" />
      </div>
    </div>
  );
}

function TypographyPreview() {
  return (
    <div className="space-y-6">
      <h1>Heading 1 — El Messiri</h1>
      <h2>Heading 2 — Balanced wrap</h2>
      <h3>Heading 3 — Section subhead</h3>
      <p>
        Body text (Source Sans 3) — The quick brown fox jumps over the lazy dog.
        This text should be 17px on mobile and 18px on desktop, with a
        line-height of 1.6 for comfortable reading.
      </p>
      <p className="text-[var(--text-muted)]">
        Muted text — secondary content uses the text-muted token.
      </p>
      <p className="text-xl">
        <span lang="ar" dir="rtl">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</span>
        {" "}— Amiri font, right-to-left
      </p>
    </div>
  );
}

function ButtonPreview() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4">Variants</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link style</Button>
        </div>
      </div>

      <div>
        <h3 className="mb-4">Sizes</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small (36px)</Button>
          <Button size="md">Medium (48px)</Button>
        </div>
      </div>

      <div>
        <h3 className="mb-4">States</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button variant="secondary" disabled>
            Disabled secondary
          </Button>
          <Button variant="secondary" loading>
            Loading secondary
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-4">As Link</h3>
        <div className="flex flex-wrap gap-3">
          <Button href="/design-preview">Link button</Button>
          <Button href="/design-preview" variant="secondary">
            Secondary link
          </Button>
        </div>
      </div>
    </div>
  );
}

function BadgePreview() {
  return (
    <div className="flex flex-wrap gap-3">
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="green">Green</Badge>
      <Badge variant="gold">Gold</Badge>
    </div>
  );
}

function RevealPreview() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Reveal key={i} staggerIndex={i}>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="mb-2">Card {i + 1}</h3>
            <p className="text-sm text-[var(--text-muted)]">
              This card fades in with a {16}px rise and stagger delay.
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function ShadowPreview() {
  return (
    <div className="flex flex-wrap gap-8">
      <div
        className="h-32 w-48 rounded-[var(--radius-lg)] bg-[var(--surface)] p-4 transition-shadow duration-300"
        style={{ boxShadow: "var(--shadow-card-hover)" }}
      >
        <p className="text-sm font-medium">card-hover</p>
      </div>
      <div
        className="h-32 w-48 rounded-[var(--radius-lg)] bg-[var(--surface)] p-4"
        style={{ boxShadow: "var(--shadow-floating)" }}
      >
        <p className="text-sm font-medium">floating</p>
      </div>
    </div>
  );
}

function RadiusPreview() {
  return (
    <div className="flex flex-wrap items-end gap-4">
      {(["sm", "md", "lg", "xl", "full"] as const).map((r) => (
        <div key={r} className="text-center">
          <div
            className="mx-auto h-16 w-16 border-2 border-[var(--green-500)] bg-[var(--green-50)]"
            style={{ borderRadius: `var(--radius-${r})` }}
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">{r}</p>
        </div>
      ))}
    </div>
  );
}

function PatternPreview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="relative h-40 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg)]">
        <IslamicPattern
          className="absolute inset-0"
          color="var(--green-700)"
        />
        <p className="relative p-4 text-sm font-medium">
          Default opacity (0.08)
        </p>
      </div>
      <div className="relative h-40 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--green-900)]">
        <IslamicPattern
          className="absolute inset-0"
          color="var(--gold-400)"
          opacity={0.12}
        />
        <p className="relative p-4 text-sm font-medium text-[var(--green-50)]">
          Gold on dark (0.12)
        </p>
      </div>
    </div>
  );
}

/* ── Main preview page ────────────────────────────────────────── */

export function DesignPreviewClient() {
  return (
    <main>
      {/* Default tone */}
      <Section>
        <SectionHeading
          eyebrow="Design System"
          title="Adan Online Academy — Token Preview"
          description="Internal page for reviewing the design foundation. Not linked anywhere."
        />
        <div className="space-y-16">
          <div>
            <h2 className="mb-6">Color Tokens</h2>
            <ColorTokens />
          </div>
          <div>
            <h2 className="mb-6">Typography</h2>
            <TypographyPreview />
          </div>
          <div>
            <h2 className="mb-6">Buttons</h2>
            <ButtonPreview />
          </div>
          <div>
            <h2 className="mb-6">Badges</h2>
            <BadgePreview />
          </div>
          <div>
            <h2 className="mb-6">Shadows</h2>
            <ShadowPreview />
          </div>
          <div>
            <h2 className="mb-6">Radius</h2>
            <RadiusPreview />
          </div>
          <div>
            <h2 className="mb-6">Islamic Pattern</h2>
            <PatternPreview />
          </div>
        </div>
      </Section>

      {/* Alt tone */}
      <Section tone="alt">
        <SectionHeading
          eyebrow="Reveal Animation"
          title="Staggered Card Entrance"
          description="Cards use the Reveal component with staggerIndex for sequential entrance."
        />
        <RevealPreview />
      </Section>

      {/* Dark tone */}
      <Section tone="dark">
        <SectionHeading
          eyebrow="Start Your Journey"
          title="Begin Learning Quran with Confidence"
          description="All children adapt automatically inside a dark Section via CSS variable overrides — no extra props needed on headings, buttons, or text."
          align="center"
        />
        <div className="space-y-6">
          <div className="flex flex-wrap justify-center gap-3">
            <Button>Primary (gold)</Button>
            <Button variant="secondary">Secondary (outlined)</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link style</Button>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="gold">Gold badge</Badge>
            <Badge variant="green">Green badge</Badge>
          </div>
          <p className="text-center text-[var(--body-muted-color)]">
            Body text uses green-200 for comfortable reading on green-900.{" "}
            <a
              href="/design-preview"
              className="text-[var(--link-color)] underline underline-offset-4 hover:text-[var(--link-hover-color)] transition-colors"
            >
              This is a text link
            </a>
            .
          </p>
        </div>
      </Section>

      {/* Container demo */}
      <Section>
        <SectionHeading
          eyebrow="Layout"
          title="Container & Section"
          description="Container max-width is 1200px. Padding: 20px mobile, 32px at 768px+."
          align="left"
        />
        <div className="rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border-strong)] p-4">
          <p className="text-sm text-[var(--text-muted)]">
            This box sits inside a Container within a Section. Resize the
            browser to see responsive padding.
          </p>
        </div>
      </Section>
    </main>
  );
}
