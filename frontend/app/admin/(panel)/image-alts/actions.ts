"use server";

import { revalidatePath, updateTag } from "next/cache";
import { adminFetch } from "@/lib/admin-api";
import { fieldFromError } from "@/lib/admin-errors";
import { IMAGE_ALTS_TAG, type AdminImageAlt, type ImageAlt } from "@/lib/image-alts";

const PATH = "/admin/image-alts";
const FIELDS = ["image_path", "alt_text", "is_decorative"] as const;
type Field = (typeof FIELDS)[number];
type Result = { ok: true } | { ok: false; message: string; field?: Field };

function refreshImages() {
  updateTag(IMAGE_ALTS_TAG);
  revalidatePath(PATH);
}

export async function saveImageAlt(id: number | null, input: ImageAlt & { image_path: string }): Promise<Result> {
  if (id !== null && (!Number.isSafeInteger(id) || id < 1)) return { ok: false, message: "Invalid image override." };
  const values = { alt_text: input.alt_text, is_decorative: input.is_decorative };
  const body = id === null ? { ...values, image_path: input.image_path } : values;
  const result = await adminFetch<AdminImageAlt>(id === null ? PATH : `${PATH}/${id}`, {
    method: id === null ? "POST" : "PUT",
    body: JSON.stringify(body),
  });
  if (result.ok) {
    refreshImages();
    return { ok: true };
  }
  return {
    ok: false,
    message: result.message.replace(/^Value error, /, ""),
    field: fieldFromError(result.status, result.detail, result.message, FIELDS, "image_path"),
  };
}

export async function removeImageAlt(id: number): Promise<Result> {
  if (!Number.isSafeInteger(id) || id < 1) return { ok: false, message: "Invalid image override." };
  const result = await adminFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
  if (!result.ok) return { ok: false, message: result.message };
  refreshImages();
  return { ok: true };
}
