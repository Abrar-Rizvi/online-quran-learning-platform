import { NavbarClient } from "./navbar-client";

/** The "Courses" dropdown is a static category menu, so the navbar needs no data fetching. */
export function Navbar() {
  return <NavbarClient />;
}
