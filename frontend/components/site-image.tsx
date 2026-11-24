"use client";

import Image, { type ImageProps } from "next/image";
import { createContext, useContext, type ComponentPropsWithRef, type ReactNode } from "react";
import { resolveImageAlt, type ImageAltMap } from "@/lib/image-alts";

const ImageAltContext = createContext<ImageAltMap>({});

export function ImageAltProvider({ alts, children }: { alts: ImageAltMap; children: ReactNode }) {
  return <ImageAltContext.Provider value={alts}>{children}</ImageAltContext.Provider>;
}

type ImageSource = { src: string; alt: string };
type SiteImageProps = ImageSource & (
  | ({ as?: undefined } & Omit<ImageProps, keyof ImageSource>)
  | ({ as: "img" } & Omit<ComponentPropsWithRef<"img">, keyof ImageSource>)
);

export function SiteImage(props: SiteImageProps) {
  const alt = resolveImageAlt(props.src, props.alt, useContext(ImageAltContext));
  if (props.as === "img") {
    const { as: NativeImage, ...native } = props;
    return <NativeImage {...native} alt={alt} />;
  }
  return <Image {...props} alt={alt} />;
}
