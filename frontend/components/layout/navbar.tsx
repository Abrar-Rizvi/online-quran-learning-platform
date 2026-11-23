import { findNooraniQaidaCourse, getPublicCourses } from "@/lib/courses";
import { NavbarClient } from "./navbar-client";

export async function Navbar() {
  const course = findNooraniQaidaCourse(await getPublicCourses().catch(() => []));
  const qaidaLink = course && { label: course.name, href: `/courses/${course.slug}` };
  return <NavbarClient qaidaLink={qaidaLink} />;
}
