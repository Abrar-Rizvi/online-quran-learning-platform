export const SITE_IMAGES = {
  aboutOne: {
    src: "/images/about-one.png",
    alt: "Teacher wearing a headset teaching Arabic letters to a young student through a live video call on a laptop",
  },
  aboutTwo: {
    src: "/images/about-two.png",
    alt: "Father guiding his daughter through an online Quran lesson on a laptop, with Quran books on the desk",
  },
  hero: {
    src: "/images/hero-online.png",
    alt: "Laptop screen showing three children in an online Quran class — a boy reading the Quran on a bookstand, a girl using a tablet, and a boy practicing Arabic writing",
  },
  contact: {
    src: "/images/contact/contact-photo.png",
    alt: "Smiling Quran teacher in a hijab at her desk, following an online class on her laptop, with Islamic books on the shelves behind her",
  },
  heroStudent: { src: "/images/hero-student.jpg", alt: "" },
} as const;

export function courseImageAlt(courseName: string): string {
  return `${courseName} course`;
}
