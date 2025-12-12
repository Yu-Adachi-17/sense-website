// pages/api/formats/prompt.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";

type RegistryJson = {
  version?: number;
  defaultLocale?: string;
  defaultFormatId?: string;
  locales?: string[];
  formats?: Array<{ id: string; order?: number }>;
};

type PromptJson = {
  formatId: string;
  locale: string;
  schemaId?: string;
  title?: string;
  prompt: string;
  notes?: string;
};

type ErrorPayload = { error: string; detail?: any };

const FORMATS_DIR = path.join(process.cwd(), "formats");
const REGISTRY_PATH = path.join(FORMATS_DIR, "registry.json");

let registryCache: { loadedAt: number; data: RegistryJson } | null = null;
const REGISTRY_CACHE_TTL_MS = 60_000;

async function readJsonFile<T = any>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function getRegistry(): Promise<RegistryJson> {
  const now = Date.now();
  if (registryCache && now - registryCache.loadedAt < REGISTRY_CACHE_TTL_MS) {
    return registryCache.data;
  }
  const data = await readJsonFile<RegistryJson>(REGISTRY_PATH);
  registryCache = { loadedAt: now, data };
  return data;
}

function normalizeZh(locale: string): string {
  const lower = locale.toLowerCase();
  if (!lower.startsWith("zh")) return locale;

  const isTraditional =
    lower.includes("hant") ||
    lower.includes("-tw") ||
    lower.includes("-hk") ||
    lower.includes("-mo");

  return isTraditional ? "zh-TW" : "zh-CN";
}

function pickBestLocale(requested: string, registryLocales: string[], defaultLocale: string): string {
  const reqRaw = (requested || "").trim();
  const req = reqRaw.length > 0 ? reqRaw : defaultLocale;

  const normalized = normalizeZh(req);

  // 1) exact (case-sensitive)
  if (registryLocales.includes(normalized)) return normalized;

  // 2) exact (case-insensitive)
  {
    const hit = registryLocales.find((l) => l.toLowerCase() === normalized.toLowerCase());
    if (hit) return hit;
  }

  // 3) base / variants
  const base = normalized.split("-")[0].toLowerCase();
  const variants = registryLocales.filter((l) => l.toLowerCase().startsWith(base + "-"));
  if (variants.length === 1) return variants[0];
  if (variants.length >= 2) {
    // registry.json の順序を尊重（treeを見る限り es-ES が先、pt-BR が先）
    return variants[0];
  }

  // 4) defaultLocale
  if (registryLocales.includes(defaultLocale)) return defaultLocale;
  {
    const hit = registryLocales.find((l) => l.toLowerCase() === defaultLocale.toLowerCase());
    if (hit) return hit;
  }

  // 5) en fallback
  if (registryLocales.includes("en")) return "en";
  {
    const hit = registryLocales.find((l) => l.toLowerCase() === "en");
    if (hit) return hit;
  }

  // 6) 最後に先頭
  return registryLocales[0] || "en";
}

async function tryLoadPromptFile(formatId: string, locale: string): Promise<PromptJson | null> {
  const filePath = path.join(FORMATS_DIR, formatId, `${locale}.json`);
  try {
    const data = await readJsonFile<PromptJson>(filePath);
    if (!data || typeof data.prompt !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PromptJson | ErrorPayload>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const formatIdRaw = String(req.query.formatId || "").trim();
  const localeRaw = String(req.query.locale || "").trim();

  if (!formatIdRaw) {
    return res.status(400).json({ error: "formatId is required" });
  }

  let registry: RegistryJson;
  try {
    registry = await getRegistry();
  } catch (e: any) {
    return res.status(500).json({ error: "Failed to read formats/registry.json", detail: e?.message || String(e) });
  }

  const registryLocales = Array.isArray(registry.locales) ? registry.locales : [];
  const defaultLocale = (registry.defaultLocale || "en").trim() || "en";

  if (registryLocales.length === 0) {
    return res.status(500).json({ error: "registry.json has no locales[]" });
  }

  const pickedLocale = pickBestLocale(localeRaw || defaultLocale, registryLocales, defaultLocale);

  // まずは requested / pickedLocale で探す
  let prompt = await tryLoadPromptFile(formatIdRaw, pickedLocale);

  // 次に defaultLocale で探す
  if (!prompt && pickedLocale !== defaultLocale) {
    prompt = await tryLoadPromptFile(formatIdRaw, defaultLocale);
  }

  // 次に en で探す
  if (!prompt && defaultLocale.toLowerCase() !== "en") {
    prompt = await tryLoadPromptFile(formatIdRaw, "en");
  }

  if (!prompt) {
    return res.status(404).json({
      error: "Prompt JSON not found",
      detail: {
        formatId: formatIdRaw,
        triedLocales: [pickedLocale, defaultLocale, "en"].filter((v, i, a) => a.indexOf(v) === i),
      },
    });
  }

  // 最低限の整合性補正（ファイルの中身を尊重しつつ、欠けてたら埋める）
  const merged: PromptJson = {
    formatId: prompt.formatId || formatIdRaw,
    locale: prompt.locale || pickedLocale,
    schemaId: prompt.schemaId,
    title: prompt.title ?? "",
    prompt: prompt.prompt,
    notes: prompt.notes ?? "",
  };

  if (!merged.prompt || merged.prompt.trim().length === 0) {
    return res.status(404).json({
      error: "Prompt is empty",
      detail: { formatId: formatIdRaw, locale: merged.locale },
    });
  }

  return res.status(200).json(merged);
}
