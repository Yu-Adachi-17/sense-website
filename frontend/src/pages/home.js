  // frontend/src/pages/home.js
  import Head from "next/head";
  import { useEffect, useRef, useState, useMemo } from "react";
  import { createPortal } from "react-dom";
  import { FaApple, FaAppStore } from "react-icons/fa";
import { BsGooglePlay } from "react-icons/bs";
  import Link from "next/link";
  import { useRouter } from "next/router";
  import { useTranslation } from "next-i18next";
  import { serverSideTranslations } from "next-i18next/serverSideTranslations";
  import HomeIcon from "./homeIcon"; // 自前アイコン

const SITE_URL = "https://www.sense-ai.world";

// OGロケール（Open Graph）用マップ
const OG_LOCALE_MAP = {
  en: "en_US",
  ja: "ja_JP",
  ar: "ar_AR",
  de: "de_DE",
  es: "es_ES",
  fr: "fr_FR",
  id: "id_ID",
  ko: "ko_KR",
  ms: "ms_MY",
  pt: "pt_PT", // 需要に応じて pt_BR へ
  sv: "sv_SE",
  tr: "tr_TR",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
};

function FixedHeaderPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// --- responsive helper ---
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}


/** =========================
 *  コメット風ネオン円（360°フェード）
 * ========================= */
// 置き換え：NeonCircle（スマホだけ縮小＋クリップ）
// 修正版：React. 接頭辞なしでフックを使用
function NeonCircle({ size = 560, mobileSize = 420, speed = 6, children, ariaLabel }) {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsPhone(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const S = isPhone ? mobileSize : size;

  const W = S, H = S;
  const cx = W / 2, cy = H / 2;
  const r = S * 0.46;
  const strokeW = Math.max(4, Math.floor(S * 0.01));
  const headR = strokeW * 0.95;
  const toRad = (deg) => (Math.PI / 180) * (deg - 90);
  const pt = (deg, rad = r) => [cx + rad * Math.cos(toRad(deg)), cy + rad * Math.sin(toRad(deg))];
  const arc = (a0, a1) =>
    `M ${pt(a0)[0]} ${pt(a0)[1]} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(a1)[0]} ${pt(a1)[1]}`;
  const HEAD = 0;
  const TAIL_START = HEAD - 360;
  const SEGMENTS = 1000;
  const STEP = 360 / SEGMENTS;
  const ease = (t) => Math.pow(t, 2.0);

  const segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const a0 = TAIL_START + i * STEP;
    const a1 = a0 + STEP;
    const t = (i + 1) / SEGMENTS;
    const alpha = 0.04 + 0.82 * ease(t);
    const w = strokeW * (0.72 + 0.32 * ease(t));
    return { a0, a1, alpha, w };
  });

  return (
    <div className="neonCircle" style={{ "--sz": `${S}px` }} aria-label={ariaLabel}>
      <svg className="ringSvg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true" overflow="visible">
        <defs>
          <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
            <stop offset="74%" stopColor="rgba(120,210,255,0.00)" />
            <stop offset="92%" stopColor="rgba(120,210,255,0.55)" />
            <stop offset="100%" stopColor="rgba(120,210,255,0.00)" />
          </radialGradient>
          <radialGradient id="headGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(210,255,255,1)" />
            <stop offset="55%" stopColor="rgba(180,245,255,0.9)" />
            <stop offset="100%" stopColor="rgba(140,220,255,0)" />
          </radialGradient>
        </defs>
        <g filter="url(#softGlow)" stroke="rgba(175,240,255,1)" fill="none" strokeLinecap="round">
          {segments.map((s, i) => (
            <path key={i} d={arc(s.a0, s.a1)} strokeOpacity={s.alpha} strokeWidth={s.w} />
          ))}
        </g>
        <circle cx={pt(HEAD)[0]} cy={pt(HEAD)[1]} r={headR} fill="url(#headGrad)" filter="url(#softGlow)" />
      </svg>

      <div className="neonInner">{children}</div>

      <style jsx>{`
        .neonCircle{
          position: relative;
          width: min(100%, var(--sz));
          aspect-ratio: 1 / 1;
          height: auto;
          display: grid;
          place-items: center;
          isolation: isolate;
          overflow: visible; /* PCは従来通り */
        }
        .ringSvg{
          position: absolute; inset: 0;
          overflow: visible;
          transform: translateZ(0);
          will-change: transform, opacity;
          mix-blend-mode: screen;
          image-rendering: optimizeQuality;
        }
        :global(.pCard){ place-items: start; justify-items: start; align-items: start; text-align: left; gap: 10px; width: 100%; }
        :global(.pKicker){ font-weight: 700; letter-spacing: 0.2px; opacity: 0.85; font-size: clamp(22px, calc(var(--sz) * 0.07), 42px); color: white; text-shadow: 0 2px 6px rgba(255,255,255,0.1); }
        :global(.pPrice .big){ font-size: clamp(28px, calc(var(--sz) * 0.10), 54px); }
        :global(.pPrice .unit){ font-size: clamp(14px, calc(var(--sz) * 0.038), 22px); }
        :global(.pBullets){ font-size: clamp(12px, calc(var(--sz) * 0.028), 16px); line-height: 1.5; }
        .neonInner{ position: relative; z-index: 2; width: min(86%, calc(var(--sz) * 0.9)); max-width: none; text-align: left; }

        /* ▼ スマホのみ：はみ出し防止＋次セクションの被り抑止 */
        @media (max-width: 640px){
          .neonCircle{
            overflow: hidden;
            border-radius: 20px;
          }
          .ringSvg{ overflow: hidden; }
        }
      `}</style>
    </div>
  );
}



/** =========================
 *  言語別コールアウト・パイチャート
 * ========================= */
function CalloutPie({ data, size = 380 }) {
  const { t } = useTranslation(['common','home','seo']);
  const sorted = useMemo(() => {
    const isOther = (s) => String(s.label).toLowerCase() === "other" || s.label === "その他";
    const main = data.filter((d) => !isOther(d)).sort((a, b) => b.value - a.value);
    const others = data.filter(isOther);
    return [...main, ...others];
  }, [data]);

  const total = useMemo(() => sorted.reduce((a, d) => a + d.value, 0), [sorted]);
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  const W = size, H = size, cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * 0.36;
  const rInner = r * 0.82;
  const rEnd = r - 4;

  const polar = (deg, rad) => {
    const a = (deg - 90) * (Math.PI / 180);
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const arcPath = (a0, a1, radius) => {
    const [x0, y0] = polar(a0, radius);
    const [x1, y1] = polar(a1, radius);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`;
  };

  let acc = 0;
  const seams = sorted.map((d) => {
    const ang = (d.value / total) * 360;
    const start = acc; acc += ang;
    return { ...d, start, end: acc };
  });
  const maxVal = sorted[0].value;
  const scale = (v, a, b) => a + (b - a) * (v / maxVal);
  const labelSize = Math.max(12, Math.min(26, size * 0.07));
  const labelStroke = 1.6;

  return (
    <figure className="calloutPie">
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} role="img" style={{ overflow: "visible" }}
           aria-label={"Language share: " + sorted.map((d) => `${d.label} ${d.value}%`).join(", ")}>
        <defs>
          <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
            <stop offset="78%" stopColor="rgba(140,210,255,0.00)" />
            <stop offset="95%" stopColor="rgba(140,210,255,0.55)" />
            <stop offset="100%" stopColor="rgba(140,210,255,0.00)" />
          </radialGradient>
          <radialGradient id="sectorGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(130,200,255,0.00)" />
            <stop offset="55%" stopColor="rgba(130,200,255,0.06)" />
            <stop offset="85%" stopColor="rgba(160,230,255,0.10)" />
            <stop offset="100%" stopColor="rgba(160,230,255,0.00)" />
          </radialGradient>

          {/* 継ぎ目ラインのグラデ／ネオン */}
          {seams.map((s, i) => {
            const [x2, y2] = polar(s.start, rEnd);
            return (
              <linearGradient key={`lg-${i}`} id={`lg-${i}`} gradientUnits="userSpaceOnUse" x1={cx} y1={cy} x2={x2} y2={y2}>
                <stop offset="0%" stopColor="rgba(130,200,255,0)" />
                <stop offset="70%" stopColor="rgba(130,200,255,0.22)" />
                <stop offset="100%" stopColor="rgba(170,240,255,0.95)" />
              </linearGradient>
            );
          })}
          {seams.map((s, i) => (
            <filter id={`neon-${i}`} key={`f-${i}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={scale(s.value, 2.2, 4.0)} result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>

        {/* 扇フィル */}
        <g style={{ mixBlendMode: "screen" }}>
          {seams.map((s, i) => (
            <path key={`sector-${i}`} d={arcPath(s.start, s.end, r)}
                  fill="url(#sectorGrad)" stroke="none"
                  opacity={scale(s.value, 0.26, 0.42)} filter={`url(#neon-${i})`} />
          ))}
        </g>

        {/* 外周リング */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="8" opacity="0.55" />
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="url(#ringGrad)" strokeWidth="5" opacity="0.30" />

        {/* 継ぎ目ライン＋先端キャップ */}
        {seams.map((s, i) => {
          const a = (s.start - 90) * (Math.PI / 180);
          const x = cx + rEnd * Math.cos(a);
          const y = cy + rEnd * Math.sin(a);
          const strokeW = scale(s.value, 2.4, 4.8);
          const capR = strokeW * 0.48;
          return (
            <g key={`seam-${i}`} style={{ mixBlendMode: "screen" }} filter={`url(#neon-${i})`}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={`url(#lg-${i})`} strokeWidth={strokeW} strokeLinecap="round" />
              <circle cx={x} cy={y} r={capR} fill="rgba(170,240,255,0.95)" />
            </g>
          );
        })}

        {/* ★ ラベル＆ガイド（外周ラベルを復活） */}
        {(() => {
          const LABEL_H = 34;
          const PAD = 14;
          const R_LABEL = r + 44;
          const R_LABEL_RIGHT = r + 38;

          const offsetMap = {
            German: { dx: 28, dy: 12 },
            Arabic: { dx: 0, dy: 24 },
            Malay:  { dx: -28, dy: 24 },
            Dutch:  { dx: 0, dy: 0 }
          };
          const stickSnapPx = 10;

          let acc = 0;
          const items = sorted.map((d) => {
            const ang = (d.value / total) * 360;
            const a0 = acc; const a1 = acc + ang; acc += ang;
            const amid = a0 + ang / 2;
            const rad = (amid - 90) * (Math.PI / 180);

            const right = Math.cos(rad) >= 0;
            const rLab = right ? R_LABEL_RIGHT : R_LABEL;

            const xRad = cx + rLab * Math.cos(rad);
            const yRad = cy + rLab * Math.sin(rad);

            const off = offsetMap[d.label] ?? { dx: 0, dy: 0 };
            const xBase = xRad + off.dx;
            const yTarget = yRad + off.dy;

            return { d, amid, right, xBase, yTarget, hasOffset: !!offsetMap[d.label] };
          });

          const left  = items.filter((i) => !i.right).sort((a, b) => a.yTarget - b.yTarget);
          const right = items.filter((i) =>  i.right).sort((a, b) => a.yTarget - b.yTarget);

          const fitColumn = (arr, yMin, yMax) => {
            if (!arr.length) return;
            let y = yMin;
            for (const it of arr) { it.y = Math.max(it.yTarget, y); y = it.y + LABEL_H; }
            y = yMax;
            for (let i = arr.length - 1; i >= 0; i--) { arr[i].y = Math.min(arr[i].y, y - LABEL_H); y = arr[i].y; }
          };

          const yMin = cy - (r + 6), yMax = cy + (r + 6);
          fitColumn(left, yMin, yMax); fitColumn(right, yMin, yMax);
          for (const it of [...left, ...right]) {
            if (it.hasOffset) it.y = clamp(it.y, it.yTarget - stickSnapPx, it.yTarget + stickSnapPx);
          }

          return [...left, ...right].map((it, i) => {
            const tx = clamp(it.xBase, PAD, W - PAD);
            const ty = it.y;
            const anchor = it.right ? "start" : "end";

            const ro = r + 10;
            const a = (it.amid - 90) * (Math.PI / 180);
            const sx = cx + ro * Math.cos(a);
            const sy = cy + ro * Math.sin(a);
            const tcy = ty + 9;
            const gap = 8;
            const ex = it.right ? tx - gap : tx + gap;
            const ey = tcy;

            return (
              <g key={`lbl-${i}`}>
                <g stroke="rgba(200,220,255,0.75)" fill="none">
                  <line x1={sx} y1={sy} x2={ex} y2={ey} strokeWidth="2" />
                  <circle cx={sx} cy={sy} r="2.6" fill="rgba(160,230,255,0.95)" />
                </g>
                <text x={tx} y={ty} textAnchor={anchor} dominantBaseline="middle"
                      style={{ fontWeight: 800, fontSize: 18, fill: "rgba(230,245,255,0.98)",
                               paintOrder: "stroke", stroke: "rgba(10,20,40,0.45)", strokeWidth: 1.2 }}>
                  {it.d.label}
                </text>
                <text x={tx} y={ty + 18} textAnchor={anchor} dominantBaseline="hanging"
                      style={{ fontWeight: 700, fontSize: 14, fill: "rgba(200,225,255,0.92)" }}>
                  {it.d.value}%
                </text>
              </g>
            );
          });
        })()}

        {/* 中央ラベル（i18n対応） */}
        <g style={{ pointerEvents: "none", mixBlendMode: "normal" }}>
          <text x={cx} y={cy - labelSize * 0.6} textAnchor="middle" dominantBaseline="baseline"
                style={{ fontWeight: 800, fontSize: labelSize, fill: "rgba(245,250,255,0.98)",
                         paintOrder: "stroke", stroke: "rgba(10,20,40,0.55)", strokeWidth: labelStroke }}>
            {t("User")}
          </text>
          <text x={cx} y={cy + labelSize * 0.2} textAnchor="middle" dominantBaseline="hanging"
                style={{ fontWeight: 800, fontSize: labelSize, fill: "rgba(245,250,255,0.98)",
                         paintOrder: "stroke", stroke: "rgba(10,20,40,0.55)", strokeWidth: labelStroke }}>
            {t("Language")}
          </text>
        </g>
      </svg>

      <style jsx>{`
        .calloutPie{ margin:0; width:100%; max-width:560px; aspect-ratio:1/1; overflow:visible; }
        @media (max-width: 900px){ .calloutPie{ max-width:520px; } }
        @media (max-width: 640px){ .calloutPie{ max-width:100%; } }
      `}</style>
    </figure>
  );
}


export default function Home() {

  const deviceRef = useRef(null);
  const wrapRef = useRef(null);
  const router = useRouter();
  const { asPath, locale, locales = [router.locale], defaultLocale } = router;
  const { t } = useTranslation(); // 既定NS（例: 'home'）を使用。未訳は英語フォールバック。
  const isPhone = useMediaQuery("(max-width: 640px)");
  const circleSize = isPhone ? 420 : 560;

  const dir = useMemo(() => (["ar", "fa", "he", "ur"].includes(locale) ? "rtl" : "ltr"), [locale]);
  const ogLocale = OG_LOCALE_MAP[locale] || OG_LOCALE_MAP.en;

  // 現在のパスからクエリ/ハッシュを除去し、今のロケールprefixを剥がして "論理的な同一パス" を得る
  const pathNoLocale = useMemo(() => {
    const stripQueryHash = (p) => (p || "/").split("#")[0].split("?")[0] || "/";
    const raw = stripQueryHash(asPath || "/");
    // 例: locale=ja なら ^/ja(/|$) を除去 → "/home"
    const re = new RegExp(`^/${locale}(?=/|$)`);
    const cleaned = raw.replace(re, "");
    return cleaned || "/";
  }, [asPath, locale]);

  // canonical: 既定言語はプレフィックスなし、それ以外は /{locale}
  const canonical = useMemo(() => {
    const prefix = locale === defaultLocale ? "" : `/${locale}`;
    return `${SITE_URL}${prefix}${pathNoLocale}`;
  }, [locale, defaultLocale, pathNoLocale]);

  // hreflang: すべての対応ロケールに対して alternate を出す（値は推奨どおり小文字）
  const altURLs = useMemo(() => {
    return (locales || []).map((l) => {
      const prefix = l === defaultLocale ? "" : `/${l}`;
      return { l, href: `${SITE_URL}${prefix}${pathNoLocale}` };
    });
  }, [locales, defaultLocale, pathNoLocale]);

  const toHrefLang = (l) => String(l || "").toLowerCase();

  useEffect(() => {
    const el = deviceRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          wrap.classList.add("inview");
          io.disconnect();
        }
      },
      { threshold: 0.55 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 言語別データ（ラベルもi18n）
  const LANGUAGE_PIE = useMemo(
    () => [
      { label: t("English"), value: 40 },
      { label: t("German"), value: 9 },
      { label: t("Arabic"), value: 8 },
      { label: t("Malay"), value: 7 },
      { label: t("Dutch"), value: 6 },
      { label: t("Other"), value: 30 },
    ],
    [t]
  );

  const [active, setActive] = useState("tap");
  const radioGroupRef = useRef(null);
  const steps = [
    { key: "tap", label: t("Tap"), img: "/images/demo-tap.png", sub: t("Tap to start recording.") },
    { key: "stop", label: t("Stop"), img: "/images/demo-stop.png", sub: t("Stop when you’re done.") },
    { key: "wrap", label: t("Wrap"), img: "/images/demo-wrap.png", sub: t("AI writes the minutes—automatically.") },
  ];
  const idx = steps.findIndex((s) => s.key === active);
  const move = (d) => {
    const n = (idx + d + steps.length) % steps.length;
    setActive(steps[n].key);
    requestAnimationFrame(() => {
      const nodes = radioGroupRef.current?.querySelectorAll('[role="radio"]');
      nodes?.[n]?.focus();
    });
  };
  const onRadioKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setActive(steps[idx].key);
    }
  };

  const LINK_MAIN = SITE_URL;
  const LINK_IOS =
    "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";
  const LINK_ANDROID =
    "https://play.google.com/store/apps/details?id=world.senseai.minutes";


  // 日付はロケール整形（例: 2025-10-01 JST）
  const demoDateISO = "2025-10-01T00:00:00+09:00";
  const formattedDate = useMemo(() => {
    try {
      const dt = new Date(demoDateISO);
      const fmt = new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZoneName: "short",
      });
      return fmt.format(dt);
    } catch {
      return "Oct 1, 2025 (JST)";
    }
  }, [locale]);

  const pageTitle = t("Minutes.AI — Service Page");
  const ogTitle = t("Minutes.AI — AI Meeting Minutes");
  const metaDesc = t(
    "Automatically create beautiful meeting minutes with AI. Record once, get accurate transcripts with clear decisions and action items. Works on iPhone and the web."
  );
  const ogDesc = t(
    "Record your meeting and let AI produce clean, human-ready minutes—decisions and to-dos at a glance."
  );

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metaDesc} />

        {/* hreflang / canonical */}
        <link rel="canonical" href={canonical} />
        {altURLs.map(({ l, href }) => (
          <link key={l} rel="alternate" hrefLang={toHrefLang(l)} href={href} />
        ))}
        {/* 既定言語（root）を x-default に */}
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${pathNoLocale}`} />

        {/* Open Graph / Twitter */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content={ogLocale} />
        {(locales || [])
          .filter((l) => OG_LOCALE_MAP[l] && l !== locale)
          .map((l) => (
            <meta key={l} property="og:locale:alternate" content={OG_LOCALE_MAP[l]} />
          ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@your_brand" />

        {/* JSON-LD (ローカライズ済みタイトル/説明) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                { "@type": "Organization", name: "Sense LLC", url: SITE_URL, logo: `${SITE_URL}/logo.png` },
                { "@type": "WebSite", url: SITE_URL, name: "Minutes.AI" },
                {
                  "@type": "SoftwareApplication",
                  name: "Minutes.AI",
                  description: ogDesc,
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "iOS, Web",
                  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                  downloadUrl: LINK_IOS,
                },
              ],
            }),
          }}
        />
      </Head>

      {/* ===== Fixed Header ===== */}
<FixedHeaderPortal>
  <header className="top" role="banner">
    <div className="topInner">
      
      {/* 左：ブランド */}
      <Link href="/" className="brand" aria-label={t("Minutes.AI Home")}>
        <span className="brandIcon" aria-hidden="true">
          <HomeIcon size={26} color="currentColor" />
        </span>
        <span className="brandText">{t("Minutes.AI")}</span>
      </Link>

      {/* 右：Blog / Company / iOS / Android → 1つの枠で囲む */}
      <nav className="navGroup" aria-label={t("Primary") || "Primary"}>
        <Link href="/blog" className="navItem">{t("Blog")}</Link>
        <Link href="/company" className="navItem">Company</Link>

        <a
          href={LINK_IOS}
          className="navItem"
          rel="noopener noreferrer"
          aria-label={t("Download on iOS")}
        >
          <FaAppStore className="navIcon" aria-hidden="true" />
          {t("iOS")}
        </a>

        <a
          href={LINK_ANDROID}
          className="navItem"
          rel="noopener noreferrer"
          aria-label={t("Download on Android")}
        >
          <BsGooglePlay className="navIcon" aria-hidden="true" />
          {t("Android")}
        </a>
      </nav>

    </div>
  </header>
</FixedHeaderPortal>



      {/* ===== Main ===== */}
      <main className="scene" dir={dir}>
        <h1 className="heroTop">{t("Just Record.")}</h1>
        <div className="space" aria-hidden />
        <div className="core" aria-hidden>
          <div className="coreGlow" />
          <div className="shine" />
          <div className="orbits" />
          <div className="starEmitter" aria-hidden>
            {Array.from({ length: 36 }).map((_, i) => {
              const spd = 2.4 + ((i % 7) * 0.15);
              const delay = -((i * 173) % 900) / 300;
              const size = 1 + (((i * 37) % 3) * 0.4);
              const alpha = 0.55 + (((i * 29) % 40) / 100);
              const tail = 20 + ((i * 67) % 24);
              return (
                <i
                  key={i}
                  style={{
                    ["--i"]: i,
                    ["--N"]: 36,
                    ["--spd"]: `${spd}s`,
                    ["--delay"]: `${delay}s`,
                    ["--sz"]: `${size}px`,
                    ["--alpha"]: alpha,
                    ["--tail"]: `${tail}px`,
                  }}
                />
              );
            })}
          </div>
          <div className="ring" style={{ ["--d"]: "0s" }} />
          <div className="ring" style={{ ["--d"]: "1.2s" }} />
          <div className="ring" style={{ ["--d"]: "2.4s" }} />
          <div className="ring" style={{ ["--d"]: "3.6s" }} />
          <div className="ring" style={{ ["--d"]: "4.8s" }} />
          <div className="starsBelt" />
        </div>

        {/* ▼ 球体の下 */}
        <section className="below">
          <div className="line1 sameSize">{t("AI Makes")}</div>
          <div className="line2 gradText sameSize">{t("Beautiful Minutes")}</div>

          {/* ガラス調デバイス */}
          <div className="deviceStage">
            <div className="deviceGlass" aria-label={t("Minutes preview surface")} ref={deviceRef}>
              <article className="minutesWrap" ref={wrapRef}>
                <h2 className="mtitle gradDevice">{t("AI Minutes Meeting — Product Launch Planning")}</h2>
                <div className="mdate">
                  <time dateTime="2025-10-01">{formattedDate}</time>
                </div>
                <div className="mhr" />
                <div className="minutesFlow">
                  <h3 className="mhead gradDevice">{t("Meeting Objective")}</h3>
                  <p className="fline">
                    {t("We agreed to create overwhelmingly beautiful minutes by using cutting-edge AI...")}
                  </p>
                  <h3 className="mhead gradDevice">{t("Decisions")}</h3>
                  <p className="fline">
                    {t("We decided to rely on advanced transcription and summarization to deliver clean, human-ready minutes...")}
                  </p>
                  <h3 className="mhead gradDevice">{t("Next Steps")}</h3>
                  <p className="fline">
                    {t("We will record real meetings, refine prompts and layout, and publish a live showcase...")}
                  </p>
                </div>
              </article>
            </div>
          </div>

          {/* ====== Simply ====== */}
          <section className="simply" aria-labelledby="simplyTitle">
            <div className="simplyGrid">
              <div className="simplyLeft">
                <h2 id="simplyTitle" className="simplyH2">
                  {t("Ultimate simplicity.")}
                </h2>
                <div className="stepList" role="radiogroup" aria-label={t("Actions")} ref={radioGroupRef}>
                  {steps.map((s) => {
                    const checked = active === s.key;
                    return (
                      <button
                        key={s.key}
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        className={`stepBtn${checked ? " isActive" : ""}`}
                        onMouseEnter={() => setActive(s.key)}
                        onFocus={() => setActive(s.key)}
                        onKeyDown={onRadioKey}
                        onClick={() => setActive(s.key)}
                        type="button"
                      >
                        <span className="row">
                          <span className="dot" aria-hidden="true" />
                          <span className="lbl">{s.label}</span>
                        </span>
                        <span className="sub">{s.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="simplyRight" aria-live="polite">
                {steps.map((s) => (
                  <figure
                    key={s.key}
                    className={`shot${active === s.key ? " isOn" : ""}`}
                    aria-hidden={active !== s.key}
                    style={{ margin: 0 }}
                  >
                    <img src={s.img} alt={s.label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    <figcaption className="shotCaption">
                      {s.key === "tap" && <p>{t("Press the button to start recording.")}</p>}
                      {s.key === "stop" && <p>{t("Press to finish; AI transcribes and drafts minutes automatically.")}</p>}
                      {s.key === "wrap" && <p>{t("Get beautifully formatted minutes, a To-Do list, and the full transcript.")}</p>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>

          {/* ===== World map background セクション ===== */}
          <section className="reachMap" aria-labelledby="reachTitle">
            <div className="reachMapInner">
              <div className="mapCopy">
                <h2 id="reachTitle" className="mapHeadline">
                  <span className="mapKicker">{t("Supports all major Languages")}</span>
                  <span>
                    <span className="gradText onlyNum">30,000</span>
                    <br />
                    <span>{t("users")}</span>
                  </span>
                </h2>
              </div>

              <div className="mapChart">
                <CalloutPie
                  data={LANGUAGE_PIE}
                  size={360}
                  ariaLabel={`Language share: ${LANGUAGE_PIE.map((d) => `${d.label} ${d.value}%`).join(", ")}`}
                />
              </div>

              <p className="mapNote" aria-label="note">
                {t("Estimated from iOS download counts as of Oct 2025.")}
              </p>
            </div>
          </section>

          {/* ===== ★ Pricing ===== */}
          <section className="pricingSection" aria-labelledby="pricingHead">
            <div className="pricingHeadWrap">
              <h2 id="pricingHead" className="pricingH2">
                {t("Minutes.AI Pricing")}
              </h2>
              <p className="pricingSub">{t("Simple, predictable pricing. Flexible plans for any workflow.")}</p>
            </div>

            <div className="pricingGrid">
              {/* 左：使い切り */}
              <NeonCircle size={560} mobileSize={360} ariaLabel={t("Prepaid minutes pricing")}>
                <div className="pCard">
                  <div className="pKicker">{t("prepaid")}</div>
                  <div className="pPrice">
                    <span className="big">$1.99</span>
                    <span className="unit">/180min</span>
                  </div>
                  <div className="pPrice">
                    <span className="big">$11.99</span>
                    <span className="unit">/1800min</span>
                  </div>
                  <ul className="pBullets">
                    <li>{t("No expiry")}</li>
                    <li>{t("Perfect for occasional meetings")}</li>
                    <li>{t("Unlimited sessions")}</li>
                  </ul>
                </div>
              </NeonCircle>

              {/* 右：サブスク */}
              <NeonCircle size={560} mobileSize={360} ariaLabel={t("Subscription pricing")}>
                <div className="pCard">
                  <div className="pKicker">{t("Subscription")}</div>
                  <div className="pPrice">
                    <span className="big">$17.99</span>
                    <span className="unit">/month</span>
                  </div>
                  <div className="pPrice">
                    <span className="big">$149.99</span>
                    <span className="unit">/year</span>
                  </div>
                  <ul className="pBullets">
                    <li>{t("Unlimited usage")}</li>
                    <li>{t("Best for teams with regular meetings")}</li>
                    <li>{t("Unlock all features on iOS")}</li>
                  </ul>
                </div>
              </NeonCircle>
            </div>

            <p className="pricingNote">{t("Prices in USD. Taxes may apply by region. Auto-renew; cancel anytime.")}</p>
          </section>

          {/* ===== iPhoneアプリ訴求 ===== */}
          <section className="appPromo" aria-labelledby="appPromoHead">
            <div className="promoGrid">
              <div className="promoCopy">
                <h2 id="appPromoHead" className="promoH2">
                  {t("iPhone App is Available").split(" ").map((w, i) =>
                    w.toLowerCase() === "available" ? (
                      <span key={i} className="gradText">
                        {w}
                      </span>
                    ) : (
                      <span key={i}> {" "}{w}</span>
                    )
                  )}
                </h2>
                <p className="promoSub">{t("Record on iPhone and get Beautiful Minutes instantly.")}</p>
                <a href={LINK_IOS} className="promoCta" rel="noopener noreferrer" aria-label={t("Download on iOS")}>
                  <FaApple aria-hidden="true" />
                  <span>{t("Download on iOS")}</span>
                </a>
              </div>
              <div className="promoVisual">
                <img src="/images/hero-phone.png" alt="Minutes.AI iPhone App" loading="lazy" />
              </div>
            </div>
          </section>

          {/* ===== ★ 最終CTA ===== */}
          <section className="finalCta" aria-labelledby="finalCtaHead">
            <h2 id="finalCtaHead" className="srOnly">
              {t("Get Started")}
            </h2>
            <a href={LINK_MAIN} className="ctaBig" rel="noopener noreferrer">
              {t("Get Started")}
            </a>
          </section>
        </section>

        <div className="reflection" aria-hidden />
      </main>

      {/* ===== Footer ===== */}
      <footer className="pageFooter" role="contentinfo">
        <div className="footInner">
          <div className="legal">
            <a href="/terms-of-use" className="legalLink">
              {t("Terms of Use")}
            </a>
            <span className="sep">·</span>
            <a href="/privacy-policy" className="legalLink">
              {t("Privacy Policy")}
            </a>
            {/* ▼ ここを追加：右側に Company */}
            <span className="sep">·</span>
            <a href="/company" className="legalLink">
              {t("Company")}
            </a>
          </div>
          <div className="copyright">&copy; Sense LLC All Rights Reserved</div>
        </div>
      </footer>

      {/* ===== styles ===== */}
      <style jsx>{`
        .scene { --bg-1:#05060e; --bg-2:#0b1030; --halo:255,255,255; --mint:98,232,203; --sky:152,209,255; --ice:204,244,255; --core-size: clamp(420px, 70vmin, 80vh); --ring-start-scale:0.78; --ring-end-scale:1.75; --ripple-period:6s; position:relative; min-height:100vh; padding-top: var(--header-offset); padding-bottom:24vh; overflow:hidden; color:#fff; background:
          radial-gradient(130vmax 130vmax at 50% 120%, #10163a 0%, var(--bg-2) 50%, var(--bg-1) 100%),
          radial-gradient(1px 1px at 20% 30%, rgba(var(--halo), 0.22) 99%, transparent 100%),
          radial-gradient(1px 1px at 80% 20%, rgba(var(--halo), 0.12) 99%, transparent 100%),
          radial-gradient(1px 1px at 30% 70%, rgba(var(--halo), 0.14) 99%, transparent 100%),
          radial-gradient(1px 1px at 60% 50%, rgba(var(--halo), 0.1) 99%, transparent 100%),
          radial-gradient(1px 1px at 75% 80%, rgba(var(--halo), 0.1) 99%, transparent 100%); }
        .heroTop { position:relative; z-index:3; text-align:center; margin:0; letter-spacing:-0.02em; line-height:1.02; font-weight:800; color:#fff; font-size: clamp(33.6px, 7.44vw, 103.2px); filter: drop-shadow(0 0 10px rgba(160,145,255,0.35)) drop-shadow(0 0 2px rgba(130,150,255,0.2)); pointer-events:none; }
        .below { position:relative; z-index:3; text-align:center; pointer-events:auto; width:100%; margin:0 auto; margin-top: calc(60vh + (var(--core-size) / 2) + 6vh); }
        .sameSize { font-weight:800; letter-spacing:-0.02em; line-height:1.06; font-size: clamp(33.6px, 7.44vw, 103.2px); margin:0; }
        .line1 { color:#fff; } .line2 { margin-top:8px; }
        .gradText, .gradDevice { background: linear-gradient(90deg, #65e0c4 0%, #8db4ff 65%, #7cc7ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; -webkit-text-fill-color:transparent; }
        .mapHeadline .onlyNum { font-size:1.65em; letter-spacing:-0.02em; font-weight:900; display:inline-block; }
        .deviceStage { margin: clamp(16px, 5vh, 44px) auto 0; width: min(calc(94vw * 0.8), 1024px); }
        .deviceGlass { --glassA:36,48,72; --glassB:56,78,96; position:relative; width:100%; aspect-ratio: 4 / 3; border-radius: clamp(22px, 3.2vmax, 44px); overflow:hidden; background: linear-gradient(180deg, rgba(var(--glassA), 0.55) 0%, rgba(var(--glassB), 0.5) 100%); -webkit-backdrop-filter: blur(18px) saturate(120%); backdrop-filter: blur(18px) saturate(120%); border:1px solid rgba(255,255,255,0.12); box-shadow: 0 30px 90px rgba(10,20,60,0.35), 0 12px 26px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.2); }
        .minutesWrap { position:absolute; inset:0; box-sizing:border-box; padding: clamp(14px,3vw,28px); color: rgba(255,255,255,0.92); line-height:1.55; text-align:left !important; overflow:hidden; pointer-events:none; clip-path: inset(100% 0 0 0); transform: translateY(8%); opacity:0.001; -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%); mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%); }
        .minutesWrap.inview { animation: fullReveal 900ms cubic-bezier(0.16,0.66,0.38,1) forwards; }
        @keyframes fullReveal { 0%{ clip-path: inset(100% 0 0 0); transform: translateY(12%); opacity:0.001; } 60%{ clip-path: inset(0 0 0 0); transform: translateY(0%); opacity:1; } 100%{ clip-path: inset(0 0 0 0); transform: translateY(0%); opacity:1; } }
        .mtitle { font-weight:800; letter-spacing:-0.01em; font-size: clamp(36px, 4.2vw, 56px); margin:0 0 6px 0; }
        .mdate { font-weight:600; opacity:0.85; font-size: clamp(26px, 2.7vw, 32px); margin-bottom: clamp(12px, 1.6vw, 16px); }
        .mhr { height:1px; background: linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08)); margin: clamp(10px, 1.8vw, 18px) 0; }
        .mhead { font-weight:800; font-size: clamp(28px, 3vw, 36px); margin: clamp(10px, 1.6vw, 16px) 0 8px 0; }
        .minutesFlow > * { opacity:0; transform: translateY(18px); }
        .minutesWrap.inview .minutesFlow > * { animation: rise 700ms cubic-bezier(0.16,0.66,0.38,1) forwards; }
        .minutesWrap.inview .minutesFlow > *:nth-child(1){ animation-delay:80ms; } .minutesWrap.inview .minutesFlow > *:nth-child(2){ animation-delay:150ms; } .minutesWrap.inview .minutesFlow > *:nth-child(3){ animation-delay:220ms; } .minutesWrap.inview .minutesFlow > *:nth-child(4){ animation-delay:290ms; } .minutesWrap.inview .minutesFlow > *:nth-child(5){ animation-delay:360ms; } .minutesWrap.inview .minutesFlow > *:nth-child(6){ animation-delay:430ms; } .minutesWrap.inview .minutesFlow > *:nth-child(7){ animation-delay:500ms; }
        @keyframes rise { from{ opacity:0; transform: translateY(18px); } to{ opacity:1; transform: translateY(0); } }
        .fline { font-weight:700; font-size: clamp(24px, 2.5vw, 30px); margin:0 0 clamp(16px, 2.4vw, 22px) 0; }
        .space { position:absolute; inset:-20vmin; background: radial-gradient(closest-side, transparent 56%, rgba(var(--halo),0.05) 57%, transparent 58%) center/120vmin 120vmin no-repeat; filter: blur(0.4px); opacity:0.35; }
        .core { position:absolute; left:50%; top:60vh; transform: translate(-50%, -50%); width: var(--core-size); height: var(--core-size); border-radius: 50%; pointer-events:none; z-index:1; }
        .coreGlow { position:absolute; inset:0; border-radius:50%; background: radial-gradient(circle at 50% 50%, rgba(var(--halo),1) 0%, rgba(242,238,255,0.98) 8%, rgba(206,196,255,0.92) 18%, rgba(178,164,255,0.8) 32%, rgba(131,146,255,0.58) 48%, rgba(92,118,255,0.38) 62%, rgba(55,88,255,0.22) 72%, rgba(0,0,0,0) 78%); filter: blur(10px) saturate(125%) contrast(105%); animation: breathe 6s ease-in-out infinite; }
        .shine { position:absolute; inset:0; border-radius:50%; background: radial-gradient(60% 18% at 50% 50%, rgba(var(--halo),0.95) 0%, rgba(var(--halo),0) 100%), radial-gradient(28% 10% at 50% 50%, rgba(var(--halo),0.85) 0%, rgba(var(--halo),0) 100%); mix-blend-mode:screen; filter: blur(6px); opacity:0.7; animation: breathe 6s ease-in-out infinite reverse; }
        .orbits { position:absolute; inset:-3%; border-radius:50%; background: radial-gradient(closest-side, rgba(255,255,255,0.04) 55%, transparent 56%) center/100% 100% no-repeat; mix-blend-mode:screen; filter: blur(0.5px); opacity:0.45; }
        .starEmitter { position:absolute; inset:0; border-radius:50%; pointer-events:none; z-index:2; --N:36; --emit-radius: calc(var(--core-size) * 0.96); }
        .starEmitter i { position:absolute; left:50%; top:50%; width: var(--sz, 1.4px); height: var(--sz, 1.4px); border-radius:50%; background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.65) 60%, rgba(255,255,255,0) 70%); box-shadow: 0 0 6px rgba(180,200,255,0.55); opacity:0; mix-blend-mode:screen; backface-visibility:hidden; will-change: transform, opacity; --a: calc(360deg * (var(--i) / var(--N))); transform: rotate(var(--a)) translateX(0) scale(1); animation: shoot var(--spd, 2.8s) linear infinite; animation-delay: var(--delay, 0s); }
        .starEmitter i::after { content:""; position:absolute; left: calc(-1 * var(--tail, 28px)); top:50%; transform: translateY(-50%); width: var(--tail, 28px); height:1px; background: linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0)); filter: blur(0.6px); opacity: calc(var(--alpha,0.8) * 0.7); pointer-events:none; }
        @keyframes shoot { 0%{ transform: rotate(var(--a)) translateX(0) scale(1); opacity:0; } 8%{ opacity: var(--alpha, 0.9); } 60%{ transform: rotate(var(--a)) translateX(calc(var(--emit-radius) * 0.66)) scale(0.9); opacity: calc(var(--alpha,0.9) * 0.5); } 100%{ transform: rotate(var(--a)) translateX(var(--emit-radius)) scale(0.82); opacity:0; } }
        .ring { --size: calc(var(--core-size) * 0.82); position:absolute; left:50%; top:50%; transform: translate(-50%, -50%) scale(var(--ring-start-scale)); width: var(--size); height: var(--size); border-radius:50%; box-shadow: 0 0 42px rgba(188,166,255,0.45), inset 0 0 38px rgba(107,134,255,0.28); background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(188,166,255,0.55) 30%, rgba(120,140,255,0.22) 52%, rgba(0,0,0,0) 62%); filter: blur(0.25px); opacity:0.9; animation: ripple var(--ripple-period) cubic-bezier(0.16,0.66,0.38,1) infinite; animation-delay: var(--d); }
        .starsBelt { position:absolute; left:50%; top:50%; transform: translate(-50%, -50%); width: calc(var(--core-size) * 1.06); height: calc(var(--core-size) * 1.06); border-radius:50%; pointer-events:none; mix-blend-mode:screen; opacity:0.55; background:
          radial-gradient(1.2px 1.2px at 12% 18%, rgba(255,255,255,0.95) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 22% 36%, rgba(255,255,255,0.85) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 32% 64%, rgba(255,255,255,0.9) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 44% 26%, rgba(255,255,255,0.8) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 58% 72%, rgba(255,255,255,0.75) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 66% 40%, rgba(255,255,255,0.85) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 74% 58%, rgba(255,255,255,0.9) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 82% 30%, rgba(255,255,255,0.8) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 16% 76%, rgba(255,255,255,0.85) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 88% 64%, rgba(255,255,255,0.75) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 38% 86%, rgba(255,255,255,0.9) 99%, transparent 100%),
          radial-gradient(1.2px 1.2px at 70% 86%, rgba(255,255,255,0.8) 99%, transparent 100%); -webkit-mask: radial-gradient(circle at 50% 50%, transparent 0 62%, #fff 64% 70%, transparent 72% 100%); mask: radial-gradient(circle at 50% 50%, transparent 0 62%, #fff 64% 70%, transparent 72% 100%); animation: twinkle 4s ease-in-out infinite alternate; }
        .reflection { position:absolute; left:50%; bottom:0; transform: translateX(-50%); width:200vmax; height:40vh; background: radial-gradient(120vmin 60% at 50% 0%, rgba(140,150,255,0.28) 0%, rgba(140,150,255,0.1) 40%, transparent 75%); filter: blur(14px); opacity:0.7; }
        .ctaBig { display:inline-flex; align-items:center; justify-content:center; padding:14px 28px; border-radius:999px; background:#0b2b3a; color:#eaf4f7; text-decoration:none; font-weight:700; box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset, 0 8px 24px rgba(0,0,0,0.25); margin: clamp(16px, 3.5vh, 28px) auto 0; }
        .simply { margin: clamp(28px, 8vh, 80px) auto; padding:0 22px; max-width:1200px; }
        .simplyGrid { display:grid; grid-template-columns:0.9fr 1.1fr; align-items:center; gap: clamp(16px, 3.5vw, 36px); }
        .simplyLeft { text-align:left; }
        .simplyH2 { margin:0 0 12px 0; font-weight:900; letter-spacing:-0.02em; line-height:1.02; font-size: clamp(48px, 9vw, 128px); color:#fff; }
        .stepList { display:flex; flex-direction:column; gap: clamp(4px, 1vh, 8px); }
        .stepBtn { display:flex; flex-direction:column; align-items:flex-start; background:transparent; border:0; padding:12px 10px; cursor:pointer; text-align:left; border-radius:14px; transition: background 200ms ease, transform 200ms ease; }
        .stepBtn:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }
        .stepBtn .row { display:inline-flex; align-items:center; gap:12px; }
        .stepBtn .dot { width:10px; height:10px; border-radius:50%; box-shadow: 0 0 0 2px rgba(255,255,255,0.2) inset; background: rgba(255,255,255,0.35); }
        .stepBtn.isActive .dot { background: linear-gradient(90deg, #65e0c4, #8db4ff); }
        .stepBtn .lbl { font-weight:900; letter-spacing:-0.02em; line-height:1.02; font-size: clamp(28px, 6vw, 64px); color:#eaf4f7; }
        .stepBtn.isActive .lbl, .stepBtn:hover .lbl { background: linear-gradient(90deg, #65e0c4, #8db4ff 65%, #7cc7ff); -webkit-background-clip:text; background-clip:text; color:transparent; -webkit-text-fill-color:transparent; }
        .stepBtn .sub { margin-left:22px; margin-top:4px; font-weight:700; line-height:1.35; color:#cfe7ff; opacity:0.92; font-size: clamp(14px, 1.8vw, 18px); }
        .simplyRight { position:relative; border-radius: clamp(18px, 2.2vmax, 28px); min-height:340px; aspect-ratio:16 / 11; overflow:hidden; background: linear-gradient(180deg, rgba(36,48,72,0.55) 0%, rgba(56,78,96,0.5) 100%); -webkit-backdrop-filter: blur(14px) saturate(120%); backdrop-filter: blur(14px) saturate(120%); border:1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18); }
        .shot { position:absolute; inset:0; opacity:0; transition: opacity 0.28s ease; }
        .shot.isOn { opacity:1; }
        .shotCaption { position:absolute; left:50%; bottom:16px; transform: translateX(-50%); max-width:86%; text-align:center; font-weight:700; line-height:1.35; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); border-radius:12px; padding:10px 12px; }
        .reachMap { position:relative; margin: clamp(24px, 10vh, 120px) 0; }
        .reachMap::before { content:""; position:absolute; inset:0; background: url("/images/worldmap.png") center / contain no-repeat; opacity:0.5; filter: saturate(110%) contrast(105%); }
        .reachMap::after { content:""; position:absolute; inset:0; background: radial-gradient(90vmax 90vmax at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.25) 100%); }
        .reachMapInner { position:relative; z-index:1; max-width:1200px; margin:0 auto; padding:0 22px; display:grid; grid-template-columns:1.1fr 0.9fr; align-items:center; gap: clamp(16px, 3vw, 32px); min-height: clamp(360px, 40vw, 520px); overflow:visible; transform: translateY(-4%); }
        .mapCopy { display:flex; align-items:center; }
        .mapHeadline { margin:0; font-weight:900; letter-spacing:-0.02em; line-height:1.02; font-size: clamp(32px, 6vw, 80px); color:#ffffff; background:transparent; padding:0; border-radius:0; box-shadow:none; text-shadow: 0 2px 10px rgba(0,0,0,0.35); }
        .mapChart { display:flex; justify-content:center; align-items:center; overflow:visible; padding-right: clamp(12px, 4vw, 36px); }
        .mapKicker { display:block; font-weight:700; font-size:1em; line-height:1.02; letter-spacing:-0.02em; color:#eaf4f7; opacity:0.95; margin:0 0 0.12em; text-shadow: 0 2px 8px rgba(0,0,0,0.35); }
        .mapNote { position:absolute; left:22px; bottom:-50px; z-index:2; font-size:12px; line-height:1.4; opacity:0.75; color: rgba(230,245,255,0.9); user-select:none; }
        .pricingSection { margin: clamp(26px, 9vh, 120px) auto; padding:0 22px; max-width:1200px; text-align:center; position:relative; isolation:isolate; overflow:visible; padding-bottom: clamp(48px, 10vh, 140px); margin-bottom: clamp(8px, 4vh, 40px); }
        @media (max-width: 640px){
          .pricingSection{ overflow: hidden; padding-bottom: max(20vh, 140px); }
          .pricingGrid{ row-gap: 28px; }
        }
        .pricingH2 { margin:0; font-weight:900; letter-spacing:-0.02em; line-height:1.02; font-size: clamp(36px, 6.3vw, 92px); }
        .pricingSub { margin:8px 0 18px 0; opacity:0.9; font-weight:700; font-size: clamp(14px, 1.9vw, 18px); }
        .pricingGrid { display:grid; grid-template-columns:1fr 1fr; gap: clamp(16px, 3vw, 40px); align-items:center; justify-items:center; margin-top: clamp(10px, 3vh, 20px); }
        .pCard { display:grid; gap:8px; place-items:center; color:#eaf4f7; }
        .pKicker { font-weight:800; letter-spacing:0.2px; opacity:0.9; }
        .pPrice { display:flex; align-items:baseline; justify-content:center; gap:8px; line-height:1; }
        .pPrice .big { font-weight:900; letter-spacing:-0.02em; font-size: clamp(28px, 5.2vw, 54px); background: linear-gradient(90deg, #65e0c4, #8db4ff 60%, #7cc7ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; -webkit-text-fill-color:transparent; text-shadow: 0 4px 22px rgba(100,160,255,0.25); }
        .pPrice .unit { font-weight:800; opacity:0.9; font-size: clamp(16px, 2.2vw, 22px); }
        .pBullets { list-style:none; padding:0; margin:8px 0 0 0; font-weight:700; font-size: clamp(12px, 1.7vw, 16px); line-height:1.5; opacity:0.95; }
        .pBullets li::before { content:"• "; opacity:0.9; }
        .pricingNote { margin-top:10px; opacity:0.7; font-size:12px; }
        .appPromo { margin: clamp(18px, 4vh, 36px) auto clamp(64px, 10vh, 120px); padding:0 22px; max-width:1200px; text-align:left; }
        .promoGrid { display:grid; grid-template-columns:1.1fr 0.9fr; align-items:center; gap: clamp(16px, 3vw, 32px); }
        .promoH2 { margin:0 0 10px 0; font-weight:800; letter-spacing:-0.02em; line-height:1.05; font-size: clamp(36px, 7vw, 84px); color:#eaf4f7; }
        .promoSub { margin:0 0 18px 0; opacity:0.85; font-weight:700; font-size: clamp(16px, 2.2vw, 20px); }
        .promoCta { display:inline-flex; align-items:center; gap:8px; padding:12px 20px; border-radius:999px; background: rgba(20,40,60,0.8); color:#eaf4f7; text-decoration:none; font-weight:800; border:1px solid rgba(255,255,255,0.08); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
        .promoCta:hover { background: rgba(20,40,60,0.92); }
        .promoVisual { display:flex; justify-content:center; }
        .promoVisual img { width:100%; max-width:560px; height:auto; display:block; border-radius:22px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
        .finalCta { margin: clamp(24px, 6vh, 72px) auto 0; padding:0 22px; max-width:1200px; display:flex; justify-content:center; }
        @keyframes breathe { 0%{ transform:scale(1); filter: blur(10px) saturate(125%) contrast(105%); } 50%{ transform:scale(1.02); filter: blur(12px) saturate(140%) contrast(110%); } 100%{ transform:scale(1); filter: blur(10px) saturate(125%) contrast(105%); } }
        @keyframes ripple { 0%{ transform: translate(-50%, -50%) scale(var(--ring-start-scale)); opacity:0.9; } 70%{ opacity:0.22; } 100%{ transform: translate(-50%, -50%) scale(var(--ring-end-scale)); opacity:0; } }
        @media (prefers-reduced-motion: reduce) {
          .minutesWrap, .minutesWrap.inview, .minutesFlow > *, .minutesWrap.inview .minutesFlow > * { animation:none !important; transition:none !important; clip-path: inset(0 0 0 0) !important; transform:none !important; opacity:1 !important; }
          .orbiter { animation:none !important; }
        }
        @media (max-width: 1220px) { .pricingGrid { grid-template-columns:1fr; } }
        @media (max-width: 1024px) { .simplyGrid { grid-template-columns:1fr; } .simplyRight { order:-1; margin-bottom:10px; } }
        @media (max-width: 900px) { .promoGrid { grid-template-columns:1fr; gap:18px; } .promoVisual { order:-1; } }
        @media (max-width: 820px) { .reachMapInner { grid-template-columns:1fr; transform: translateY(-2%); } }
        @media (max-width: 640px) {
          .scene { --core-size: clamp(320px, 86vmin, 80vh); padding-bottom: 28vh; }
          .heroTop, .sameSize { font-size: clamp(26.4px, 8.88vw, 72px); }
          .deviceStage { width: min(calc(92vw * 0.8), 416px); }
          .deviceGlass { aspect-ratio: 9 / 19.5; border-radius: clamp(26px, 7.5vw, 40px); }
          .mapNote { left:16px; bottom:8px; font-size:11px; }
        }
      `}</style>
      <style jsx global>{`
        :root {
          --header-h: clamp(56px, 7.2vh, 72px);
          --header-py: 10px;
          --header-offset: calc(
            var(--header-h) + env(safe-area-inset-top, 0px) +
              (var(--header-py) * 2)
          );
        }

header.top {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 2147483647;
  padding: calc(var(--header-py) + env(safe-area-inset-top, 0px)) 22px var(--header-py);
  height: calc(var(--header-h) + env(safe-area-inset-top, 0px));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(5, 8, 20, 0.82);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

header.top .topInner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 左ロゴ */
header.top .brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #ffffff;
  text-decoration: none;
}
header.top .brandText {
  font-weight: 800;
  font-size: 22px;
}

/* ▼ 右ナビ全体をひとつの枠で囲む */
header.top .navGroup {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 8px 18px;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 999px;
  background: rgba(20,40,60,0.4);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

header.top .navItem {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #ffffff;
  text-decoration: none;
  font-weight: 700;
  opacity: 0.85;
}
header.top .navItem:hover {
  opacity: 1;
}

header.top .navIcon {
  font-size: 14px;
}

/* モバイル時：必要ならナビを折り畳む（お好みで） */
@media (max-width: 720px) {
  header.top .navGroup {
    gap: 14px;
    padding: 6px 14px;
  }
  header.top .brandText {
    font-size: 18px;
  }
}

      `}</style>


      <style jsx>{`
        .pageFooter { position:relative; z-index:3; padding:20px 22px 28px; border-top:1px solid rgba(255,255,255,0.06); background: linear-gradient(0deg, rgba(10,14,28,0.6) 0%, rgba(10,14,28,0.3) 100%); color:#eaf4f7; }
        .footInner { max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .legal { display:flex; gap:12px; align-items:center; font-size:13px; opacity:0.7; }
        .legalLink { color:#ffffff; text-decoration:none; }
        .sep { opacity:0.55; }
        .copyright { font-size:13px; opacity:0.7; white-space:nowrap; }
        @media (max-width: 640px) { .footInner { flex-direction:column; gap:8px; } }
        @media (max-width: 640px) {
          .heroTop { margin-top: clamp(18px, 6vh, 72px); }
          .simplyGrid { display:grid; grid-template-columns:1fr; grid-auto-rows:auto; align-items:start; position:relative; }
          .simplyLeft { display:contents; }
          .simplyH2 { grid-row:1; margin:0 0 8px; padding:0 16px; position:relative; z-index:3; text-shadow:0 4px 18px rgba(0,0,0,0.45); }
          .simplyRight { grid-row:2; margin:8px 0 12px; padding:10px; min-height:48vh; aspect-ratio:auto; overflow:visible; }
          .simplyRight img { width:100%; height:auto; object-fit:contain; }
          .shotCaption { bottom:10px; }
          .stepList { grid-row:3; margin-top:4px; }
          .reachMapInner { grid-template-columns:1fr; gap:14px; }
          .mapChart { max-width:86vw; margin-inline:auto; padding-right:0; }
          .reachMap { padding-bottom:144px; }
          .mapNote { bottom:-88px; font-size:11px; }
          .promoGrid { grid-template-columns:1fr; }
          .promoCopy { order:1; }
          .promoVisual { order:2; }
        }
      `}</style>
    </>
  );
}

// i18n（SSRで辞書を読み込み）
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common", "home", "seo"])),
    },
  };
}
