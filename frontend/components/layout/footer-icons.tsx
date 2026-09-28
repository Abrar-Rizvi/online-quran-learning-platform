import type { SocialPlatform } from "@/lib/site-config";

type IconProps = { className?: string };

export function PhoneIcon({ className }: IconProps) {
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
      <path d="M4.5 3.5h3.4l1.6 4.4-2.1 1.6a13.5 13.5 0 0 0 6.1 6.1l1.6-2.1 4.4 1.6v3.4a1.5 1.5 0 0 1-1.6 1.5C9.9 19.5 4.5 14.1 3 6.1a1.5 1.5 0 0 1 1.5-1.6Z" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 6.5 8 6 8-6" />
    </svg>
  );
}

/** Shared circle-outline shell (matches the site's circle+glyph icon convention, e.g. how-it-works.tsx). */
function SocialShell({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" />
      {children}
    </svg>
  );
}

function FacebookIcon({ className }: IconProps) {
  return (
    <SocialShell className={className}>
      <path
        d="M13.6 17.5v-5.1h1.7l.3-2h-2v-1.3c0-.55.2-.93.98-.93h1.05V6.4c-.18 0-.8-.07-1.5-.07-1.5 0-2.53.9-2.53 2.6v1.5H10v2h1.6v5.1Z"
        fill="currentColor"
        stroke="none"
      />
    </SocialShell>
  );
}

function XIcon({ className }: IconProps) {
  return (
    <SocialShell className={className}>
      <path d="M7.5 7.5 16.5 16.5M16.5 7.5 7.5 16.5" strokeLinecap="round" />
    </SocialShell>
  );
}

function InstagramIcon({ className }: IconProps) {
  return (
    <SocialShell className={className}>
      <rect x="7.5" y="7.5" width="9" height="9" rx="2.5" />
      <circle cx="12" cy="12" r="2.25" />
      <circle cx="15.4" cy="8.6" r="0.6" fill="currentColor" stroke="none" />
    </SocialShell>
  );
}

function YouTubeIcon({ className }: IconProps) {
  return (
    <SocialShell className={className}>
      <rect x="6.5" y="8.5" width="11" height="7" rx="2" />
      <path d="M10.7 10.6v2.8l2.6-1.4Z" fill="currentColor" stroke="none" />
    </SocialShell>
  );
}

function PinterestIcon({ className }: IconProps) {
  return (
    <SocialShell className={className}>
      <path
        d="M10.6 17.2c.25-1 .8-3.5.8-3.5a1.8 1.8 0 0 1-.17-.83c0-.78.45-1.36 1.02-1.36.48 0 .71.36.71.8 0 .48-.31 1.2-.47 1.87-.13.56.28 1.02.84 1.02 1 0 1.77-1.06 1.77-2.58 0-1.35-.97-2.3-2.36-2.3-1.6 0-2.55 1.2-2.55 2.44 0 .48.19 1 .42 1.28a.17.17 0 0 1 .04.16l-.16.64c-.02.1-.08.12-.19.07-.7-.33-1.15-1.35-1.15-2.18 0-1.78 1.29-3.42 3.72-3.42 1.95 0 3.47 1.39 3.47 3.25 0 1.94-1.22 3.5-2.92 3.5-.57 0-1.1-.3-1.29-.65l-.35 1.34c-.12.48-.46 1.08-.7 1.45Z"
        fill="currentColor"
        stroke="none"
      />
    </SocialShell>
  );
}

function TikTokIcon({ className }: IconProps) {
  return (
    <SocialShell className={className}>
      <path
        d="M13.2 6.7c.3 1.3 1.2 2.2 2.6 2.4v1.7a4.6 4.6 0 0 1-2.6-.8v3.9a3.4 3.4 0 1 1-3.4-3.4c.1 0 .2 0 .3.01v1.75a1.65 1.65 0 1 0 1.4 1.63V6.7Z"
        fill="currentColor"
        stroke="none"
      />
    </SocialShell>
  );
}

const SOCIAL_ICONS: Record<SocialPlatform, (props: IconProps) => React.ReactElement> = {
  facebook: FacebookIcon,
  x: XIcon,
  instagram: InstagramIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
  tiktok: TikTokIcon,
};

export function SocialIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const Icon = SOCIAL_ICONS[platform];
  return <Icon className={className} />;
}

/** WhatsApp glyph (same path as the mobile menu's icon); colored via currentColor. */
export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
