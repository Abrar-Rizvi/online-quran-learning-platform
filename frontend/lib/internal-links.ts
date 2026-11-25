export interface InternalLinkTarget {
  title: string;
  path: string;
  status?: "draft" | "published";
}

export interface InternalLinkGroup {
  label: string;
  links: InternalLinkTarget[];
}

/** The fixed public pages. Additional page sources can join this group. */
export const FIXED_PAGE_LINKS: InternalLinkTarget[] = [
  { title: "Home", path: "/" },
  { title: "Courses", path: "/courses" },
  { title: "FAQ", path: "/faq" },
  { title: "Contact", path: "/contact" },
  { title: "Free trial", path: "/book-free-trial" },
  { title: "Enroll", path: "/enroll" },
  { title: "Blog", path: "/blog" },
];
