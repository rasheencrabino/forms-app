import { randomBytes } from "node:crypto";
import { prisma } from "../db";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "form";
}

/** Generates a unique, human-readable slug for a form's public URL
 * (/f/:slug): a slugified title plus a short random suffix, re-rolling the
 * suffix on the rare collision. */
export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = randomBytes(3).toString("hex");
    const candidate = `${base}-${suffix}`;
    const existing = await prisma.form.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }
  // Astronomically unlikely fallback.
  return `${base}-${randomBytes(8).toString("hex")}`;
}
