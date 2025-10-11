// src/lib/blog.js
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

export function listPostIds() {
  return fs.readdirSync(CONTENT_DIR).filter((name) => {
    const p = path.join(CONTENT_DIR, name);
    return fs.statSync(p).isDirectory();
  });
}

export function listLocalesForPost(postId) {
  const dir = path.join(CONTENT_DIR, postId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, "")); // ["en","ja","de",...]
}

export function readPostByLocale(postId, locale) {
  const file = path.join(CONTENT_DIR, postId, `${locale}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  return { frontmatter: data, content };
}

export async function loadMdx(postId, locale) {
  const data = readPostByLocale(postId, locale);
  if (!data) return null;
  const mdx = await serialize(data.content);
  return { mdx, frontmatter: data.frontmatter };
}

// “このロケールのslug” を返す（なければ null）
export function getSlugForLocale(postId, locale) {
  const post = readPostByLocale(postId, locale);
  return post?.frontmatter?.slug || null;
}

// postId を、あるロケールの slug から逆引き（ビルド時に利用）
export function resolvePostIdFromSlug(locale, slug) {
  for (const id of listPostIds()) {
    const s = getSlugForLocale(id, locale);
    if (s === slug) return id;
  }
  return null;
}
