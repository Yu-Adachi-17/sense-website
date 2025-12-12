import { Router, type Request, type Response } from "express";
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

// スクショを見る限り formats は backend/formats 配下
const FORMATS_DIR = path.resolve(process.cwd(), "backend", "formats");
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

  if (registryLocales.includes(normalized)) return normalized;

  {
    const hit = registryLocales.find((l) => l.toLowerCase() === normalized.toLowerCase());
    if (hit) return hit;
  }

  const base = normalized.split("-")[0].toLowerCase();
  const variants = registryLocales.filter((l) => l.toLowerCase().startsWith(base + "-"));
  if (variants.length === 1) return variants[0];
  if (variants.length >= 2) return variants[0];

  if (registryLocales.includes(defaultLocale)) return defaultLocale;
  {
    const hit = registryLocales.find((l) => l.toLowerCase() === defaultLocale.toLowerCase());
    if (hit) return hit;
  }

  if (registryLocales.includes("en")) return "en";
  {
    const hit = registryLocales.find((l) => l.toLowerCase() === "en");
    if (hit) return hit;
  }

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

const router = Router();

router.get(
  "/formats/prompt",
  async (req: Request, res: Response<PromptJson | ErrorPayload>) => {
    const formatIdRaw = String(req.query.formatId || "").trim();
    const localeRaw = String(req.query.locale || "").trim();

    if (!formatIdRaw) {
      return res.status(400).json({ error: "formatId is required" });
    }

    let registry: RegistryJson;
    try {
      registry = await getRegistry();
    } catch (e: any) {
      return res.status(500).json({
        error: "Failed to read backend/formats/registry.json",
        detail: e?.message || String(e),
      });
    }

    const registryLocales = Array.isArray(registry.locales) ? registry.locales : [];
    const defaultLocale = (registry.defaultLocale || "en").trim() || "en";

    if (registryLocales.length === 0) {
      return res.status(500).json({ error: "registry.json has no locales[]" });
    }

    const pickedLocale = pickBestLocale(localeRaw || defaultLocale, registryLocales, defaultLocale);

    let prompt = await tryLoadPromptFile(formatIdRaw, pickedLocale);

    if (!prompt && pickedLocale !== defaultLocale) {
      prompt = await tryLoadPromptFile(formatIdRaw, defaultLocale);
    }

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
);

export default router;
