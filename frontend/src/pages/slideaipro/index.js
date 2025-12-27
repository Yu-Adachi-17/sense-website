// src/pages/slideaipro/index.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";

function AtomIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M12 12c3.6-3.6 7.9-5.7 9.6-4 1.7 1.7-.4 6-4 9.6-3.6 3.6-7.9 5.7-9.6 4-1.7-1.7.4-6 4-9.6Z" />
        <path d="M12 12c-3.6-3.6-7.9-5.7-9.6-4-1.7 1.7.4 6 4 9.6 3.6 3.6 7.9 5.7 9.6 4 1.7-1.7-.4-6-4-9.6Z" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

function ProgressOverlay({ progress, label }) {
  const pct = Math.max(0, Math.min(100, Math.floor(progress)));
  const RING_SIZE = 150;
  const STROKE = 10;
  const r = (RING_SIZE - STROKE) / 2;
  const C = 2 * Math.PI * r;
  const dashoffset = C * (1 - pct / 100);

  return (
    <div className="overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="ringWrap">
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <g style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}>
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={STROKE}
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth={STROKE}
              strokeDasharray={C}
              strokeDashoffset={dashoffset}
              style={{ transition: "stroke-dashoffset 280ms ease-in-out" }}
            />
          </g>
        </svg>
        <div className="pct">{pct}%</div>
        {!!label && <div className="label">{label}</div>}
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: grid;
          place-items: center;
          z-index: 9999;
        }
        .ringWrap {
          width: ${RING_SIZE}px;
          height: ${RING_SIZE}px;
          position: relative;
          display: grid;
          place-items: center;
        }
        .pct {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #fff;
          font-family: Impact, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          font-size: 35px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          user-select: none;
          transform: translateY(-6px);
        }
        .label {
          position: absolute;
          bottom: -34px;
          width: 260px;
          text-align: center;
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
          font-weight: 650;
          letter-spacing: 0.2px;
          user-select: none;
        }
      `}</style>
    </div>
  );
}

function pickPdfUrl(obj) {
  if (!obj) return "";
  const candidates = [
    obj.pdfUrl,
    obj.url,
    obj.fileUrl,
    obj.pdf_url,
    obj.pdfURL,
    obj.result?.pdfUrl,
    obj.result?.url,
    obj.data?.pdfUrl,
    obj.data?.url,
  ].filter(Boolean);

  const first = candidates.find((v) => typeof v === "string" && v.length > 0);
  if (first) return first;

  // どこかにURLが埋まってるケースも拾う（保険）
  try {
    const s = JSON.stringify(obj);
    const m = s.match(/https?:\/\/[^\s"']+\.pdf(\?[^\s"']*)?/i);
    return m?.[0] || "";
  } catch {
    return "";
  }
}

export default function SlideAIProHome() {
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isIntelMode, setIsIntelMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [agendaJson, setAgendaJson] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const taRef = useRef(null);
  const stopProgressRef = useRef(null);
  const mountedRef = useRef(true);

  const trimmed = useMemo(() => prompt.trim(), [prompt]);

  const questionText = "どんな資料が欲しいですか？";
  const placeholderText = "例：新規事業の提案資料（課題→提案→効果）を作りたい";
  const pageTitle = "SlideAI Pro — Web";

  const background = useMemo(() => {
    if (!isIntelMode) return { from: "#ffffff", to: "#ffffff" };
    return { from: "#000000", to: "rgb(28, 46, 62)" };
  }, [isIntelMode]);

  const textColor = isIntelMode ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.92)";

  const API_BASE = useMemo(() => {
    // 環境変数があれば優先（例: NEXT_PUBLIC_SLIDEAIPRO_API_BASE=https://xxx）
    const env = process.env.NEXT_PUBLIC_SLIDEAIPRO_API_BASE || process.env.NEXT_PUBLIC_API_BASE;
    if (env && typeof env === "string") return env.replace(/\/+$/, "");
    return "https://sense-website-production.up.railway.app";
  }, []);

  const focusIdea = () => {
    try {
      taRef.current?.focus();
    } catch {}
  };

  const autosize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const h = Math.min(140, Math.max(70, el.scrollHeight));
    el.style.height = `${h}px`;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        stopProgressRef.current?.();
      } catch {}
    };
  }, []);

  useEffect(() => {
    autosize();
  }, [prompt]);

  useEffect(() => {
    const onKey = (e) => {
      if (!isMenuOpen) return;
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  const stopProgressTicker = () => {
    try {
      stopProgressRef.current?.();
    } catch {}
    stopProgressRef.current = null;
  };

  const startProgressTicker = (cap, base = 3, speedMs = 220) => {
    stopProgressTicker();

    setProgress(base);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const step = base + Math.min(cap - base, Math.floor(elapsed / speedMs));
      setProgress((p) => Math.min(cap, Math.max(p, step)));
    }, 120);

    const stop = () => window.clearInterval(id);
    stopProgressRef.current = stop;
    return stop;
  };

  const safeCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleGenerate = async () => {
    const brief = trimmed;
    if (!brief) return;
    if (isSending) return;

    setErrorMsg("");
    setPdfUrl("");
    setAgendaJson(null);
    setCopied(false);

    setIsSending(true);
    setProgressLabel("アウトライン生成中");
    const stop1 = startProgressTicker(28, 3, 240);

    const locale = typeof navigator !== "undefined" ? navigator.language : "ja";
    const theme = isIntelMode ? "dark" : "light";
    const renderMode = "vibeSlidingIdea";

    try {
      // 1) agenda-json
      const agendaResp = await fetch(`${API_BASE}/api/slideaipro/agenda-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, renderMode, locale, theme }),
      });

      if (!agendaResp.ok) throw new Error(`agenda-json HTTP ${agendaResp.status}`);
      const agenda = await agendaResp.json();
      if (!mountedRef.current) return;

      setAgendaJson(agenda);
      setProgress(34);

      // 2) generate (pdfUrlを返す前提)
      stop1();
      setProgressLabel("PDF生成中");
      const stop2 = startProgressTicker(92, 36, 260);

      const genResp = await fetch(`${API_BASE}/api/slideaipro/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          renderMode,
          locale,
          theme,
          agendaJson: agenda,
          agenda,
        }),
      });

      if (!genResp.ok) throw new Error(`generate HTTP ${genResp.status}`);
      const gen = await genResp.json();
      if (!mountedRef.current) return;

      const url = pickPdfUrl(gen);
      if (!url) {
        throw new Error("pdfUrl not found in generate response");
      }

      setPdfUrl(url);
      setProgress(100);
      stop2();

      // 自動で開く（UX: 生成完了の到達点）
      window.setTimeout(() => {
        try {
          window.open(url, "_blank", "noopener,noreferrer");
        } catch {}
      }, 120);
    } catch (e) {
      console.error(e);
      if (!mountedRef.current) return;

      const msg =
        typeof e?.message === "string"
          ? e.message
          : "生成に失敗しました。サーバー側ログを確認してください。";
      setErrorMsg(msg);

      // 失敗時も表示は0へ戻す
      setProgress(0);
    } finally {
      stopProgressTicker();
      if (!mountedRef.current) return;

      window.setTimeout(() => setIsSending(false), 180);
      window.setTimeout(() => {
        setProgress(0);
        setProgressLabel("");
      }, 260);
    }
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        className="page"
        onClick={() => {
          if (isMenuOpen) return;
          try {
            document.activeElement?.blur?.();
          } catch {}
        }}
      >
        <div className="bg" />

        <header className="header">
          <button
            className="iconBtn"
            aria-label="Menu"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(true);
              try {
                document.activeElement?.blur?.();
              } catch {}
            }}
          >
            <span className="hamburger" />
          </button>

          <div className="title"></div>

          <button
            className="pillBtn"
            aria-label="Toggle theme"
            onClick={(e) => {
              e.stopPropagation();
              setIsIntelMode((v) => !v);
            }}
          >
            {isIntelMode ? "Dark" : "Light"}
          </button>
        </header>

        <div className="divider" />

        <main className="main">
          <div className="q">{questionText}</div>

          <div
            className={`card ${isIntelMode ? "cardDark" : "cardLight"}`}
            onClick={(e) => {
              e.stopPropagation();
              focusIdea();
            }}
            role="group"
            aria-label="Idea input card"
          >
            <div className="taWrap">
              {!trimmed && <div className="ph">{placeholderText}</div>}
              <textarea
                ref={taRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onInput={autosize}
                className="ta"
                rows={3}
                spellCheck={false}
                placeholder=""
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
            </div>

            <button
              className="send"
              aria-label="Generate"
              disabled={!trimmed || isSending}
              onClick={(e) => {
                e.stopPropagation();
                handleGenerate();
              }}
            >
              <AtomIcon size={16} />
            </button>
          </div>

          {!!errorMsg && (
            <div className={`msg ${isIntelMode ? "msgDark" : "msgLight"}`} role="status" aria-live="polite">
              <div className="msgTitle">Error</div>
              <div className="msgBody">{errorMsg}</div>
            </div>
          )}

          {!!pdfUrl && (
            <div className={`result ${isIntelMode ? "resultDark" : "resultLight"}`} role="group" aria-label="Result">
              <div className="resultTop">
                <div className="resultTitle">PDF</div>
                <div className="actions">
                  <button
                    className="miniBtn"
                    onClick={() => {
                      try {
                        window.open(pdfUrl, "_blank", "noopener,noreferrer");
                      } catch {}
                    }}
                  >
                    Open
                  </button>
                  <a className="miniBtn" href={pdfUrl} download>
                    Download
                  </a>
                  <button
                    className="miniBtn"
                    onClick={async () => {
                      const ok = await safeCopy(pdfUrl);
                      if (ok) {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1200);
                      }
                    }}
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
              </div>

              <div className="urlRow">
                <code className="url">{pdfUrl}</code>
              </div>
            </div>
          )}
        </main>

        {isMenuOpen && (
          <div
            className="menuOverlay"
            onClick={() => {
              setIsMenuOpen(false);
              setTimeout(() => focusIdea(), 120);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className={`menuPanel ${isIntelMode ? "menuDark" : "menuLight"}`} onClick={(e) => e.stopPropagation()}>
              <div className="menuHeader">
                <div className="menuTitle">Menu</div>
                <button className="iconBtn" aria-label="Close" onClick={() => setIsMenuOpen(false)}>
                  <span className="closeX" />
                </button>
              </div>

              <div className="menuItem">
                <div className="miLeft">
                  <div className="miTitle">Theme</div>
                  <div className="miSub">Light / Dark</div>
                </div>
                <button className="pillBtn" onClick={() => setIsIntelMode((v) => !v)}>
                  {isIntelMode ? "Dark" : "Light"}
                </button>
              </div>

              <div className="menuItem">
                <div className="miLeft">
                  <div className="miTitle">API Base</div>
                  <div className="miSub">{API_BASE}</div>
                </div>
              </div>

              <div className="menuHint">
                フローは <code>/api/slideaipro/agenda-json</code> → <code>/api/slideaipro/generate</code>（pdfUrl返却）です。
              </div>

              {!!agendaJson && (
                <details className="debug">
                  <summary>Debug: agenda-json response</summary>
                  <pre>{JSON.stringify(agendaJson, null, 2)}</pre>
                </details>
              )}
            </div>
          </div>
        )}

        {isSending && <ProgressOverlay progress={progress} label={progressLabel} />}

        <style jsx>{`
          .page {
            min-height: 100vh;
            position: relative;
            overflow: hidden;
            color: ${textColor};
          }
          .bg {
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, ${background.from}, ${background.to});
          }

          .header {
            position: relative;
            z-index: 2;
            height: 62px;
            display: grid;
            grid-template-columns: 52px 1fr auto;
            align-items: center;
            padding: 0 14px;
          }
          .title {
            text-align: center;
            font-weight: 700;
            letter-spacing: 0.3px;
            font-size: 16px;
            user-select: none;
          }

          .iconBtn {
            width: 40px;
            height: 40px;
            border: none;
            background: transparent;
            color: inherit;
            border-radius: 10px;
            display: grid;
            place-items: center;
            cursor: pointer;
          }
          .iconBtn:active {
            transform: scale(0.98);
          }
          .hamburger {
            width: 18px;
            height: 12px;
            position: relative;
            display: inline-block;
          }
          .hamburger::before,
          .hamburger::after,
          .hamburger {
            background: transparent;
          }
          .hamburger::before,
          .hamburger::after {
            content: "";
            position: absolute;
            left: 0;
            width: 18px;
            height: 2px;
            border-radius: 2px;
            background: ${textColor};
            opacity: 0.9;
          }
          .hamburger::before {
            top: 1px;
          }
          .hamburger::after {
            bottom: 1px;
          }

          .closeX {
            width: 18px;
            height: 18px;
            position: relative;
            display: inline-block;
          }
          .closeX::before,
          .closeX::after {
            content: "";
            position: absolute;
            left: 8px;
            top: 1px;
            width: 2px;
            height: 16px;
            border-radius: 2px;
            background: ${isIntelMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)"};
          }
          .closeX::before {
            transform: rotate(45deg);
          }
          .closeX::after {
            transform: rotate(-45deg);
          }

          .pillBtn {
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};
            color: ${textColor};
            padding: 8px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            user-select: none;
          }
          .pillBtn:active {
            transform: scale(0.99);
          }

          .divider {
            position: relative;
            z-index: 2;
            height: 1px;
            background: ${isIntelMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)"};
            margin: 0 14px;
          }

          .main {
            position: relative;
            z-index: 2;
            min-height: calc(100vh - 62px);
            display: grid;
            align-content: center;
            justify-items: center;
            padding: 28px 18px 40px;
            gap: 16px;
          }

          .q {
            font-size: 30px;
            font-weight: 600;
            text-align: center;
            line-height: 1.28;
            opacity: 0.98;
            padding: 0 10px;
            max-width: 860px;
          }

          .card {
            width: min(860px, calc(100vw - 36px));
            border-radius: 18px;
            position: relative;
            padding: 12px 12px 12px 12px;
            cursor: text;
          }

          .cardDark {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.13);
            backdrop-filter: blur(12px);
            box-shadow: 0 12px 28px rgba(64, 110, 255, 0.10);
          }

          .cardLight {
            background: rgb(250, 250, 250);
            border: 1px solid rgba(255, 255, 255, 0.7);
            box-shadow:
              -4px -4px 10px rgba(255, 255, 255, 0.9),
               6px 10px 20px rgba(0, 0, 0, 0.12);
          }

          .taWrap {
            position: relative;
            padding-right: 56px;
          }

          .ph {
            position: absolute;
            left: 10px;
            top: 10px;
            right: 10px;
            color: ${isIntelMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"};
            font-size: 17px;
            pointer-events: none;
            user-select: none;
          }

          .ta {
            width: 100%;
            resize: none;
            border: none;
            outline: none;
            background: transparent;
            color: ${textColor};
            font-size: 17px;
            line-height: 1.35;
            padding: 10px 10px 10px 10px;
            min-height: 70px;
            max-height: 140px;
          }

          .send {
            position: absolute;
            right: 12px;
            bottom: 10px;
            width: 40px;
            height: 40px;
            border-radius: 999px;
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.95)"};
            color: rgba(0, 0, 0, 0.85);
            display: grid;
            place-items: center;
            cursor: pointer;
            user-select: none;
          }
          .send:disabled {
            opacity: 0.35;
            cursor: default;
          }
          .send:active:not(:disabled) {
            transform: scale(0.99);
          }

          .msg {
            width: min(860px, calc(100vw - 36px));
            border-radius: 16px;
            padding: 14px 14px 12px;
          }
          .msgDark {
            border: 1px solid rgba(255, 140, 140, 0.22);
            background: rgba(255, 140, 140, 0.08);
          }
          .msgLight {
            border: 1px solid rgba(200, 40, 40, 0.18);
            background: rgba(200, 40, 40, 0.06);
          }
          .msgTitle {
            font-weight: 800;
            font-size: 12px;
            letter-spacing: 0.2px;
            opacity: 0.9;
          }
          .msgBody {
            margin-top: 6px;
            font-size: 13px;
            opacity: 0.92;
            line-height: 1.45;
            word-break: break-word;
          }

          .result {
            width: min(860px, calc(100vw - 36px));
            border-radius: 16px;
            padding: 14px 14px 12px;
          }
          .resultDark {
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(12px);
          }
          .resultLight {
            border: 1px solid rgba(0, 0, 0, 0.08);
            background: rgba(0, 0, 0, 0.03);
          }

          .resultTop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .resultTitle {
            font-weight: 900;
            letter-spacing: 0.2px;
            font-size: 13px;
            opacity: 0.95;
          }
          .actions {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .miniBtn {
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.65)"};
            color: ${textColor};
            padding: 7px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 800;
            text-decoration: none;
            cursor: pointer;
            user-select: none;
          }
          .miniBtn:active {
            transform: scale(0.99);
          }

          .urlRow {
            margin-top: 10px;
          }
          .url {
            display: block;
            width: 100%;
            padding: 10px 10px;
            border-radius: 12px;
            background: ${isIntelMode ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.7)"};
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"};
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 12px;
            overflow-x: auto;
            color: ${textColor};
          }

          .menuOverlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.22);
            z-index: 9000;
            display: flex;
            justify-content: flex-end;
          }
          .menuPanel {
            width: min(420px, 70vw);
            height: 100%;
            padding: 16px;
            overflow: auto;
          }
          .menuDark {
            background: rgba(0, 0, 0, 0.78);
            backdrop-filter: blur(14px);
            border-left: 1px solid rgba(255, 255, 255, 0.10);
            color: rgba(255, 255, 255, 0.92);
          }
          .menuLight {
            background: rgba(255, 255, 255, 0.82);
            backdrop-filter: blur(14px);
            border-left: 1px solid rgba(0, 0, 0, 0.08);
            color: rgba(0, 0, 0, 0.86);
          }

          .menuHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 4px 12px;
          }
          .menuTitle {
            font-weight: 800;
            letter-spacing: 0.2px;
          }

          .menuItem {
            margin-top: 10px;
            padding: 14px 12px;
            border-radius: 14px;
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"};
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .miLeft {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }
          .miTitle {
            font-weight: 800;
            font-size: 13px;
          }
          .miSub {
            font-size: 12px;
            opacity: 0.75;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 280px;
          }

          .menuHint {
            margin-top: 14px;
            font-size: 12px;
            opacity: 0.8;
            line-height: 1.5;
          }
          .menuHint code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 8px;
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"};
          }

          .debug {
            margin-top: 14px;
            border-radius: 14px;
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)"};
            padding: 10px;
          }
          .debug summary {
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
            opacity: 0.9;
          }
          .debug pre {
            margin: 10px 0 0;
            font-size: 11px;
            line-height: 1.45;
            overflow: auto;
            white-space: pre;
          }
        `}</style>

        <style jsx global>{`
          html,
          body,
          #__next {
            height: 100%;
          }
          body {
            margin: 0;
            overflow-x: hidden;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          }
        `}</style>
      </div>
    </>
  );
}
