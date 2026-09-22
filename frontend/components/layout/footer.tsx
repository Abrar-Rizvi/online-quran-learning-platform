import Link from "next/link";
import { Container, IslamicPattern } from "@/components/ui";
import { Logo } from "./logo";
import {
  brandTagline,
  footerAcademyLinks,
  getContactConfig,
} from "@/lib/site-config";
import { fetchCourses } from "@/lib/api";

export async function Footer() {
  const [courses, contact] = await Promise.all([
    fetchCourses(),
    Promise.resolve(getContactConfig()),
  ]);

  const topCourses = courses.slice(0, 5);

  return (
    <footer className="relative bg-[var(--green-950)] text-[var(--green-200)]">
      {/* Decorative pattern */}
      <IslamicPattern
        className="absolute inset-0"
        color="var(--gold-400)"
        opacity={0.06}
        patternId="khatam-footer"
      />

      {/* Main content */}
      <div className="relative">
        <Container>
          <div className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo variant="light" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed">
                {brandTagline}
              </p>
            </div>

            {/* Courses */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">
                Courses
              </h3>
              <ul className="space-y-2.5">
                {topCourses.map((course) => (
                  <li key={course.id}>
                    <FooterLink href={`/courses/${course.id}`}>
                      {course.name}
                    </FooterLink>
                  </li>
                ))}
                <li>
                  <FooterLink href="/courses">All courses</FooterLink>
                </li>
              </ul>
            </div>

            {/* Academy */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">
                Academy
              </h3>
              <ul className="space-y-2.5">
                {footerAcademyLinks.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            {(contact.whatsappUrl || contact.emailUrl) && (
              <div>
                <h3 className="mb-4 text-sm font-semibold text-white">
                  Contact
                </h3>
                <ul className="space-y-2.5">
                  {contact.whatsappUrl && (
                    <li>
                      <a
                        href={contact.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[var(--green-200)] transition-colors hover:text-white focus-visible:outline-3 focus-visible:outline-[var(--gold-300)] focus-visible:outline-offset-2 rounded-[var(--radius-sm)]"
                      >
                        WhatsApp
                      </a>
                    </li>
                  )}
                  {contact.emailUrl && (
                    <li>
                      <a
                        href={contact.emailUrl}
                        className="text-sm text-[var(--green-200)] transition-colors hover:text-white focus-visible:outline-3 focus-visible:outline-[var(--gold-300)] focus-visible:outline-offset-2 rounded-[var(--radius-sm)]"
                      >
                        {contact.email}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </Container>

        {/* Bottom bar */}
        <div className="border-t border-[var(--gold-500)]/15">
          <Container>
            <p className="py-6 text-center text-xs text-[var(--green-200)]/70">
              &copy; {new Date().getFullYear()} Adan Online Academy. All rights
              reserved.
            </p>
          </Container>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm text-[var(--green-200)] transition-colors hover:text-white focus-visible:outline-3 focus-visible:outline-[var(--gold-300)] focus-visible:outline-offset-2 rounded-[var(--radius-sm)]"
    >
      {children}
    </Link>
  );
}
