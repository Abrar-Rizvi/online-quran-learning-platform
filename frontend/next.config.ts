import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only badge; bottom-left would cover the admin sidebar's "Log out" button.
  devIndicators: {
    position: "bottom-right",
  },
  // Enrollment confirmation pages carry a private token in the URL: keep them out of
  // search engines and never send the URL as a Referer to other sites (WhatsApp link etc.).
  async headers() {
    return [
      {
        source: "/enroll/confirmation/:token*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
