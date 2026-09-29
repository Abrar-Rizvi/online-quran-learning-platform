import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Adan Online Academy — Live one-to-one online Quran classes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Site-wide social card. The mark is app/icon.png (the logo emblem in gold-400 on a
 * green-900 square), which blends into the green-900 background here.
 */
export default async function OpengraphImage() {
  const icon = await readFile(join(process.cwd(), "app/icon.png"));
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#08352A",
        }}
      >
        <img src={iconSrc} width={240} height={240} alt="" />
        <div style={{ marginTop: 24, fontSize: 72, fontWeight: 700, color: "#FFFFFF" }}>
          Adan Online Academy
        </div>
        <div style={{ marginTop: 28, width: 120, height: 4, background: "#D8B15A" }} />
        <div style={{ marginTop: 28, fontSize: 36, color: "#B9DCCB" }}>
          Live one-to-one online Quran classes
        </div>
      </div>
    ),
    size,
  );
}
