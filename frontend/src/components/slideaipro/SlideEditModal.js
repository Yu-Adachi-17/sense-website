// src/components/slideaipro/SlideEditModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";

function deepClone(x) {
  try {
    return JSON.parse(JSON.stringify(x));
  } catch {
    return x;
  }
}

function normalizeBullets(arr) {
  const a = Array.isArray(arr) ? arr : [];
  return a
    .map((s) => String(s || "").trim())
    .filter((s) => !!s);
}

function canFormEdit(kind) {
  return kind === "cover" || kind === "proposal";
}

function FormEditor({ draft, setDraft, isIntelMode }) {
  const kind = String(draft?.kind || "");

  const textColor = isIntelMode ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.92)";
  const subText = isIntelMode ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.62)";
  const border = isIntelMode ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
  const bg = isIntelMode ? "rgba(255,255,255,0.06)" : "#ffffff";

  if (kind === "cover") {
    return (
      <div className="form">
        <div className="row">
          <div className="label">Title</div>
          <input
            className="input"
            value={String(draft?.title || "")}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
          />
        </div>

        <div className="row">
          <div className="label">Subtitle (date)</div>
          <input
            className="input"
            value={String(draft?.subtitle || "")}
            onChange={(e) => setDraft((p) => ({ ...p, subtitle: e.target.value }))}
          />
        </div>

        <style jsx>{`
          .form {
            display: grid;
            gap: 12px;
          }
          .row {
            display: grid;
            gap: 6px;
          }
          .label {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.2px;
            color: ${subText};
          }
          .input {
            width: 100%;
            border-radius: 12px;
            border: 1px solid ${border};
            background: ${bg};
            color: ${textColor};
            padding: 12px 12px;
            font-size: 14px;
            outline: none;
          }
        `}</style>
      </div>
    );
  }

  if (kind === "proposal") {
    const bullets = Array.isArray(draft?.bullets) ? draft.bullets : [];

    return (
      <div className="form">
        <div className="row">
          <div className="label">Title</div>
          <input
            className="input"
            value={String(draft?.title || "")}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
          />
        </div>

        <div className="row">
          <div className="label">Bullets</div>

          <div className="bullets">
            {bullets.map((b, i) => (
              <div className="bulletRow" key={`b-${i}`}>
                <input
                  className="input"
                  value={String(b || "")}
                  onChange={(e) => {
                    const next = bullets.slice();
                    next[i] = e.target.value;
                    setDraft((p) => ({ ...p, bullets: next }));
                  }}
                />
                <button
                  className="miniBtn"
                  onClick={() => {
                    const next = bullets.slice();
                    next.splice(i, 1);
                    setDraft((p) => ({ ...p, bullets: next }));
                  }}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            className="miniBtn addBtn"
            onClick={() => setDraft((p) => ({ ...p, bullets: bullets.concat([""]) }))}
            type="button"
          >
            Add bullet
          </button>
        </div>

        <div className="row">
          <div className="label">Message</div>
          <textarea
            className="ta"
            value={String(draft?.message || "")}
            onChange={(e) => setDraft((p) => ({ ...p, message: e.target.value }))}
            rows={5}
          />
        </div>

        <div className="row">
          <div className="label">Image cacheKey</div>
          <input
            className="input"
            value={String(draft?.image?.cacheKey || "")}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                image: { ...(p?.image || {}), cacheKey: e.target.value },
              }))
            }
          />
          <div className="hint">画像そのものは別キャッシュで引いているので、ここはキーのみ編集にしています。</div>
        </div>

        <style jsx>{`
          .form {
            display: grid;
            gap: 12px;
          }
          .row {
            display: grid;
            gap: 6px;
          }
          .label {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.2px;
            color: ${subText};
          }
          .hint {
            font-size: 12px;
            color: ${subText};
          }
          .input {
            width: 100%;
            border-radius: 12px;
            border: 1px solid ${border};
            background: ${bg};
            color: ${textColor};
            padding: 12px 12px;
            font-size: 14px;
            outline: none;
          }
          .ta {
            width: 100%;
            border-radius: 12px;
            border: 1px solid ${border};
            background: ${bg};
            color: ${textColor};
            padding: 12px 12px;
            font-size: 14px;
            outline: none;
            resize: vertical;
            min-height: 120px;
          }
          .bullets {
            display: grid;
            gap: 8px;
          }
          .bulletRow {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 10px;
            align-items: center;
          }
          .miniBtn {
            border-radius: 999px;
            border: 1px solid ${border};
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "#ffffff"};
            color: ${textColor};
            padding: 10px 12px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
            white-space: nowrap;
          }
          .miniBtn:active {
            transform: scale(0.99);
          }
          .addBtn {
            justify-self: start;
          }
        `}</style>
      </div>
    );
  }

  return null;
}

export default function SlideEditModal({
  open,
  slide,
  slideIndex,
  isIntelMode,
  onCancel,
  onSave,
}) {
  const [mode, setMode] = useState("form"); // "form" | "json"
  const [draftObj, setDraftObj] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [error, setError] = useState("");

  const taRef = useRef(null);

  const kind = useMemo(() => String(slide?.kind || ""), [slide]);
  const supportsForm = canFormEdit(kind);

  useEffect(() => {
    if (!open) return;

    const base = deepClone(slide || {});
    setDraftObj(base);
    setDraftText(JSON.stringify(base, null, 2));
    setError("");
    setMode(supportsForm ? "form" : "json");

    // body scroll lock
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus (json mode)
    const t = window.setTimeout(() => {
      try {
        if (!supportsForm) taRef.current?.focus();
      } catch {}
    }, 0);

    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open, slide, supportsForm]);

  if (!open) return null;

  const textColor = isIntelMode ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.92)";
  const subText = isIntelMode ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.62)";

  const doCancel = () => {
    setError("");
    onCancel?.();
  };

  const doSave = () => {
    setError("");

    try {
      if (mode === "form") {
        const d = deepClone(draftObj || {});
        const k = String(d?.kind || "");

        // 軽い正規化
        if (k === "proposal") {
          d.bullets = normalizeBullets(d.bullets);
          d.title = String(d.title || "").trim();
          d.message = String(d.message || "").trim();
        }
        if (k === "cover") {
          d.title = String(d.title || "").trim();
          d.subtitle = String(d.subtitle || "").trim();
        }

        onSave?.(slideIndex, d);
        return;
      }

      const parsed = JSON.parse(String(draftText || ""));
      if (!parsed || typeof parsed !== "object") throw new Error("JSONはオブジェクトである必要があります");
      if (!String(parsed.kind || "")) throw new Error("kind が空です");
      if (!String(parsed.id || "")) throw new Error("id が空です");

      onSave?.(slideIndex, parsed);
    } catch (e) {
      const msg = String(e?.message || e);
      setError(msg);
    }
  };

  const stopAll = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit Slide ${slideIndex + 1}`}
      onMouseDownCapture={stopAll}
      onClick={doCancel}
    >
      <div
        className="panel"
        onMouseDownCapture={stopAll}
        onClick={stopAll}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            doCancel();
          }
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            doSave();
          }
        }}
        tabIndex={-1}
      >
        <div className="top">
          <div className="ttl">{`Edit Slide ${slideIndex + 1}`}</div>

          <button className="x" onClick={doCancel} type="button" aria-label="Close">
            <span className="xIcon" />
          </button>
        </div>

        <div className="sub">編集できる内容だけを見せる「フォーム編集」を優先し、必要時のみJSON編集に切り替えます。</div>

        <div className="tabs">
          <button
            className={`tab ${mode === "form" ? "on" : ""}`}
            type="button"
            disabled={!supportsForm}
            onClick={() => supportsForm && setMode("form")}
          >
            Form
          </button>
          <button className={`tab ${mode === "json" ? "on" : ""}`} type="button" onClick={() => setMode("json")}>
            JSON
          </button>
        </div>

        <div className="body">
          {mode === "form" && supportsForm && draftObj && (
            <FormEditor draft={draftObj} setDraft={setDraftObj} isIntelMode={isIntelMode} />
          )}

          {mode === "form" && !supportsForm && (
            <div className="note">
              このスライド種別はまだフォーム編集未対応です。JSONタブで編集してください。
            </div>
          )}

          {mode === "json" && (
            <textarea
              ref={taRef}
              className="ta"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              onMouseDownCapture={stopAll}
              onClick={stopAll}
            />
          )}

          {!!error && <div className="err">{error}</div>}
        </div>

        <div className="bottom">
          <button className="btn ghost" onClick={doCancel} type="button">
            Cancel
          </button>
          <button className="btn solid" onClick={doSave} type="button">
            Save
          </button>
        </div>

        <style jsx>{`
          .overlay {
            position: fixed;
            inset: 0;
            z-index: 14000;
            background: ${isIntelMode ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)"};
            display: grid;
            place-items: center;
            padding: 24px;
          }

          .panel {
            width: min(1100px, calc(100vw - 48px));
            max-height: min(820px, calc(100vh - 48px));
            overflow: hidden;
            border-radius: 18px;
            background: ${isIntelMode ? "rgba(0,0,0,0.86)" : "#ffffff"};
            color: ${textColor};
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"};
            box-shadow: ${isIntelMode ? "0 24px 70px rgba(0,0,0,0.55)" : "0 24px 70px rgba(0,0,0,0.20)"};
            display: grid;
            grid-template-rows: auto auto auto 1fr auto;
            padding: 18px 18px 16px;
          }

          .top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .ttl {
            font-weight: 900;
            font-size: 18px;
            letter-spacing: 0.2px;
          }
          .x {
            width: 40px;
            height: 40px;
            border: none;
            border-radius: 12px;
            background: transparent;
            color: inherit;
            cursor: pointer;
            display: grid;
            place-items: center;
          }
          .x:active {
            transform: scale(0.99);
          }
          .xIcon {
            width: 18px;
            height: 18px;
            position: relative;
            display: inline-block;
          }
          .xIcon::before,
          .xIcon::after {
            content: "";
            position: absolute;
            left: 8px;
            top: 1px;
            width: 2px;
            height: 16px;
            border-radius: 2px;
            background: ${isIntelMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)"};
          }
          .xIcon::before {
            transform: rotate(45deg);
          }
          .xIcon::after {
            transform: rotate(-45deg);
          }

          .sub {
            margin-top: 6px;
            font-size: 12px;
            color: ${subText};
          }

          .tabs {
            margin-top: 12px;
            display: flex;
            gap: 10px;
            align-items: center;
          }
          .tab {
            border-radius: 999px;
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "#ffffff"};
            color: ${textColor};
            padding: 10px 14px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
            user-select: none;
          }
          .tab:disabled {
            opacity: 0.35;
            cursor: default;
          }
          .tab.on {
            box-shadow: ${isIntelMode ? "0 10px 22px rgba(0,0,0,0.30)" : "0 8px 18px rgba(0,0,0,0.08)"};
          }

          .body {
            margin-top: 12px;
            min-height: 0;
            overflow: auto;
            border-radius: 14px;
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"};
            padding: 14px;
          }

          .note {
            font-size: 13px;
            color: ${subText};
            padding: 8px 4px;
          }

          .ta {
            width: 100%;
            min-height: 420px;
            border: none;
            outline: none;
            background: transparent;
            color: ${textColor};
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
              monospace;
            font-size: 13px;
            line-height: 1.45;
            resize: vertical;
            padding: 0;
            margin: 0;
          }

          .err {
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 900;
            color: ${isIntelMode ? "rgba(255,210,210,0.95)" : "rgba(140,0,0,0.92)"};
            background: ${isIntelMode ? "rgba(255,80,80,0.12)" : "rgba(255,80,80,0.10)"};
            border: 1px solid ${isIntelMode ? "rgba(255,80,80,0.25)" : "rgba(255,80,80,0.18)"};
          }

          .bottom {
            margin-top: 12px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
          }
          .btn {
            border-radius: 999px;
            padding: 12px 16px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
            user-select: none;
          }
          .ghost {
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.06)" : "#ffffff"};
            color: ${textColor};
          }
          .solid {
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)"};
            color: ${textColor};
          }
          .btn:active {
            transform: scale(0.99);
          }
        `}</style>
      </div>
    </div>
  );
}
