// src/components/slideaipro/SlideEditorPanel.js
import React, { useEffect, useMemo, useState } from "react";

function safeStr(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalizeLines(arr, max = 50) {
  const a = Array.isArray(arr) ? arr : [];
  return a.map((x) => safeStr(x)).map((s) => s.trim()).filter(Boolean).slice(0, max);
}

function updateAt(list, idx, nextValue) {
  const a = Array.isArray(list) ? [...list] : [];
  a[idx] = nextValue;
  return a;
}

function removeAt(list, idx) {
  const a = Array.isArray(list) ? [...list] : [];
  a.splice(idx, 1);
  return a;
}

export default function SlideEditorPanel({
  isOpen,
  slide,
  isIntelMode,
  onClose,
  onSave,
}) {
  const theme = isIntelMode ? "dark" : "light";
  const canShow = !!isOpen && !!slide;

  const kind = safeStr(slide?.kind);

  const initialDraft = useMemo(() => {
    if (!slide) return null;
    // deep-ish clone for editable fields
    return JSON.parse(JSON.stringify(slide));
  }, [slide?.id]);

  const [draft, setDraft] = useState(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    if (!canShow) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      // Cmd/Ctrl+Enter = Save
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (draft) onSave?.(draft);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canShow, draft, onClose, onSave]);

  if (!canShow) return null;

  const setField = (path, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev };

      // very small path setter (one-level or two-level only)
      if (path.includes(".")) {
        const [a, b] = path.split(".");
        next[a] = { ...(next[a] || {}) };
        next[a][b] = value;
        return next;
      }
      next[path] = value;
      return next;
    });
  };

  const setListItem = (field, idx, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev[field]) ? prev[field] : [];
      return { ...prev, [field]: updateAt(list, idx, value) };
    });
  };

  const addListItem = (field, value = "") => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev[field]) ? prev[field] : [];
      return { ...prev, [field]: [...list, value] };
    });
  };

  const removeListItem = (field, idx) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev[field]) ? prev[field] : [];
      return { ...prev, [field]: removeAt(list, idx) };
    });
  };

  const setBarGroup = (idx, patch) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.barGroups) ? prev.barGroups : [];
      const cur = list[idx] || {};
      const nextItem = { ...cur, ...patch };
      return { ...prev, barGroups: updateAt(list, idx, nextItem) };
    });
  };

  const addBarGroup = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.barGroups) ? prev.barGroups : [];
      return { ...prev, barGroups: [...list, { category: "", value: 0 }] };
    });
  };

  const removeBarGroup = (idx) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.barGroups) ? prev.barGroups : [];
      return { ...prev, barGroups: removeAt(list, idx) };
    });
  };

  const setTaskRow = (idx, patch) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.rows) ? prev.rows : [];
      const cur = list[idx] || {};
      const nextItem = { ...cur, ...patch };
      return { ...prev, rows: updateAt(list, idx, nextItem) };
    });
  };

  const addTaskRow = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.rows) ? prev.rows : [];
      return { ...prev, rows: [...list, { title: "", assignee: "", deadline: "" }] };
    });
  };

  const removeTaskRow = (idx) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.rows) ? prev.rows : [];
      return { ...prev, rows: removeAt(list, idx) };
    });
  };

  const save = () => {
    if (!draft) return;
    // normalize commonly-edited fields
    const next = { ...draft };

    if (kind === "problem" || kind === "proposal") {
      next.title = safeStr(next.title).trim();
      next.message = safeStr(next.message).trim();
      next.bullets = normalizeLines(next.bullets, 12);
    }

    if (kind === "effects") {
      next.title = safeStr(next.title).trim();
      next.message = safeStr(next.message).trim();
      next.before = normalizeLines(next.before, 12);
      next.after = normalizeLines(next.after, 12);
    }

    if (kind === "bar") {
      next.title = safeStr(next.title).trim();
      next.yAxisName = safeStr(next.yAxisName).trim();
      next.unit = safeStr(next.unit).trim();
      next.message = safeStr(next.message).trim();
      next.barGroups = (Array.isArray(next.barGroups) ? next.barGroups : [])
        .map((g) => ({
          category: safeStr(g?.category).trim(),
          value: Number.isFinite(Number(g?.value)) ? Number(g.value) : 0,
        }))
        .filter((g) => g.category || g.value !== 0)
        .slice(0, 20);
    }

    if (kind === "tasks") {
      next.title = safeStr(next.title).trim();
      next.rows = (Array.isArray(next.rows) ? next.rows : [])
        .map((r) => ({
          title: safeStr(r?.title).trim(),
          assignee: safeStr(r?.assignee).trim(),
          deadline: safeStr(r?.deadline).trim(),
        }))
        .filter((r) => r.title || r.assignee || r.deadline)
        .slice(0, 30);
    }

    if (kind === "cover") {
      next.title = safeStr(next.title).trim();
      next.subtitle = safeStr(next.subtitle).trim();
    }

    onSave?.(next);
  };

  const textColor = theme === "dark" ? "rgba(255,255,255,0.92)" : "rgba(10,15,27,0.96)";
  const panelBg = theme === "dark" ? "rgba(0,0,0,0.86)" : "#ffffff";
  const borderC = theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const cardBg = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.03)";

  return (
    <>
      <div className="sepOverlay" onClick={onClose} role="presentation" />
      <aside className="panel" role="dialog" aria-modal="true" aria-label="Edit slide">
        <div className="top">
          <div className="ttl">Edit</div>
          <div className="meta">
            <div className="k">kind: {kind}</div>
            <div className="k">id: {safeStr(slide?.id)}</div>
          </div>
          <button className="x" onClick={onClose} aria-label="Close" />
        </div>

        <div className="body">
          {/* Cover */}
          {kind === "cover" && (
            <div className="section">
              <div className="h">Cover</div>
              <label className="lbl">Title</label>
              <input
                className="in"
                value={safeStr(draft?.title)}
                onChange={(e) => setField("title", e.target.value)}
              />
              <label className="lbl">Subtitle</label>
              <input
                className="in"
                value={safeStr(draft?.subtitle)}
                onChange={(e) => setField("subtitle", e.target.value)}
              />
            </div>
          )}

          {/* Problem / Proposal */}
          {(kind === "problem" || kind === "proposal") && (
            <div className="section">
              <div className="h">{kind === "problem" ? "Problem" : "Proposal"}</div>

              <label className="lbl">Title</label>
              <input
                className="in"
                value={safeStr(draft?.title)}
                onChange={(e) => setField("title", e.target.value)}
              />

              <div className="rowHead">
                <div className="lbl2">Bullets</div>
                <button className="mini" onClick={() => addListItem("bullets", "")}>
                  Add
                </button>
              </div>

              {(Array.isArray(draft?.bullets) ? draft.bullets : []).map((b, i) => (
                <div className="row" key={`b-${i}`}>
                  <input
                    className="in"
                    value={safeStr(b)}
                    onChange={(e) => setListItem("bullets", i, e.target.value)}
                  />
                  <button className="del" onClick={() => removeListItem("bullets", i)} aria-label="Remove" />
                </div>
              ))}

              <label className="lbl">Message</label>
              <textarea
                className="ta"
                rows={3}
                value={safeStr(draft?.message)}
                onChange={(e) => setField("message", e.target.value)}
              />

              <div className="note">
                Cmd/Ctrl+Enter で保存、Esc で閉じます。
              </div>
            </div>
          )}

          {/* Effects */}
          {kind === "effects" && (
            <div className="section">
              <div className="h">Effects</div>

              <label className="lbl">Title</label>
              <input
                className="in"
                value={safeStr(draft?.title)}
                onChange={(e) => setField("title", e.target.value)}
              />

              <div className="twoCols">
                <div className="col">
                  <div className="rowHead">
                    <div className="lbl2">Before</div>
                    <button className="mini" onClick={() => addListItem("before", "")}>
                      Add
                    </button>
                  </div>
                  {(Array.isArray(draft?.before) ? draft.before : []).map((x, i) => (
                    <div className="row" key={`bf-${i}`}>
                      <input className="in" value={safeStr(x)} onChange={(e) => setListItem("before", i, e.target.value)} />
                      <button className="del" onClick={() => removeListItem("before", i)} aria-label="Remove" />
                    </div>
                  ))}
                </div>

                <div className="col">
                  <div className="rowHead">
                    <div className="lbl2">After</div>
                    <button className="mini" onClick={() => addListItem("after", "")}>
                      Add
                    </button>
                  </div>
                  {(Array.isArray(draft?.after) ? draft.after : []).map((x, i) => (
                    <div className="row" key={`af-${i}`}>
                      <input className="in" value={safeStr(x)} onChange={(e) => setListItem("after", i, e.target.value)} />
                      <button className="del" onClick={() => removeListItem("after", i)} aria-label="Remove" />
                    </div>
                  ))}
                </div>
              </div>

              <label className="lbl">Message</label>
              <textarea
                className="ta"
                rows={3}
                value={safeStr(draft?.message)}
                onChange={(e) => setField("message", e.target.value)}
              />
            </div>
          )}

          {/* Bar */}
          {kind === "bar" && (
            <div className="section">
              <div className="h">Bar</div>

              <label className="lbl">Title</label>
              <input className="in" value={safeStr(draft?.title)} onChange={(e) => setField("title", e.target.value)} />

              <div className="twoCols">
                <div className="col">
                  <label className="lbl">Y Axis</label>
                  <input className="in" value={safeStr(draft?.yAxisName)} onChange={(e) => setField("yAxisName", e.target.value)} />
                </div>
                <div className="col">
                  <label className="lbl">Unit</label>
                  <input className="in" value={safeStr(draft?.unit)} onChange={(e) => setField("unit", e.target.value)} />
                </div>
              </div>

              <div className="rowHead">
                <div className="lbl2">Bars</div>
                <button className="mini" onClick={addBarGroup}>
                  Add
                </button>
              </div>

              {(Array.isArray(draft?.barGroups) ? draft.barGroups : []).map((g, i) => (
                <div className="barRow" key={`bg-${i}`}>
                  <input
                    className="in"
                    value={safeStr(g?.category)}
                    onChange={(e) => setBarGroup(i, { category: e.target.value })}
                    placeholder="Category"
                  />
                  <input
                    className="in num"
                    value={safeStr(g?.value)}
                    onChange={(e) => setBarGroup(i, { value: e.target.value })}
                    placeholder="Value"
                  />
                  <button className="del" onClick={() => removeBarGroup(i)} aria-label="Remove" />
                </div>
              ))}

              <label className="lbl">Message</label>
              <textarea className="ta" rows={3} value={safeStr(draft?.message)} onChange={(e) => setField("message", e.target.value)} />
            </div>
          )}

          {/* Tasks */}
          {kind === "tasks" && (
            <div className="section">
              <div className="h">Tasks</div>

              <label className="lbl">Title</label>
              <input className="in" value={safeStr(draft?.title)} onChange={(e) => setField("title", e.target.value)} />

              <div className="rowHead">
                <div className="lbl2">Rows</div>
                <button className="mini" onClick={addTaskRow}>
                  Add
                </button>
              </div>

              {(Array.isArray(draft?.rows) ? draft.rows : []).map((r, i) => (
                <div className="taskRow" key={`tr-${i}`}>
                  <input className="in" value={safeStr(r?.title)} onChange={(e) => setTaskRow(i, { title: e.target.value })} placeholder="Task" />
                  <input className="in" value={safeStr(r?.assignee)} onChange={(e) => setTaskRow(i, { assignee: e.target.value })} placeholder="Assignee" />
                  <input className="in" value={safeStr(r?.deadline)} onChange={(e) => setTaskRow(i, { deadline: e.target.value })} placeholder="Deadline" />
                  <button className="del" onClick={() => removeTaskRow(i)} aria-label="Remove" />
                </div>
              ))}
            </div>
          )}

          {/* Read-only image info */}
          {safeStr(slide?.image?.cacheKey) && (
            <div className="section">
              <div className="h">Image (read-only)</div>
              <div className="ro">{safeStr(slide?.image?.cacheKey)}</div>
            </div>
          )}
        </div>

        <div className="bottom">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={() => {
              save();
            }}
          >
            Save
          </button>
        </div>

        <style jsx>{`
          .sepOverlay {
            position: fixed;
            inset: 0;
            background: ${theme === "dark" ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.10)"};
            z-index: 9200;
          }

          .panel {
            position: fixed;
            top: 0;
            right: 0;
            height: 100vh;
            width: min(560px, 92vw);
            background: ${panelBg};
            color: ${textColor};
            z-index: 9300;
            border-left: 1px solid ${borderC};
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.22);
            display: grid;
            grid-template-rows: auto 1fr auto;
            backdrop-filter: ${theme === "dark" ? "blur(14px)" : "none"};
          }

          .top {
            padding: 18px 18px 10px;
            border-bottom: 1px solid ${borderC};
            display: grid;
            grid-template-columns: 1fr auto;
            grid-template-rows: auto auto;
            column-gap: 10px;
            row-gap: 6px;
          }

          .ttl {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 0.2px;
          }

          .meta {
            grid-column: 1 / 2;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            opacity: 0.75;
            font-size: 11px;
            font-weight: 800;
          }

          .k {
            padding: 6px 10px;
            border-radius: 999px;
            background: ${cardBg};
            border: 1px solid ${borderC};
          }

          .x {
            grid-column: 2 / 3;
            grid-row: 1 / 3;
            width: 36px;
            height: 36px;
            border: 1px solid ${borderC};
            border-radius: 12px;
            background: ${cardBg};
            cursor: pointer;
            position: relative;
          }
          .x::before,
          .x::after {
            content: "";
            position: absolute;
            left: 16px;
            top: 9px;
            width: 2px;
            height: 18px;
            background: ${textColor};
            opacity: 0.75;
            border-radius: 2px;
          }
          .x::before {
            transform: rotate(45deg);
          }
          .x::after {
            transform: rotate(-45deg);
          }

          .body {
            padding: 14px 18px;
            overflow: auto;
            display: grid;
            gap: 12px;
          }

          .section {
            border: 1px solid ${borderC};
            background: ${cardBg};
            border-radius: 16px;
            padding: 12px 12px;
          }

          .h {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.2px;
            margin-bottom: 10px;
            opacity: 0.92;
          }

          .lbl {
            display: block;
            font-size: 11px;
            font-weight: 900;
            opacity: 0.78;
            margin: 10px 0 6px;
          }

          .lbl2 {
            font-size: 11px;
            font-weight: 900;
            opacity: 0.78;
          }

          .in {
            width: 100%;
            border: 1px solid ${borderC};
            background: ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#ffffff"};
            color: ${textColor};
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 13px;
            font-weight: 800;
            outline: none;
            box-sizing: border-box;
          }

          .in.num {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          .ta {
            width: 100%;
            border: 1px solid ${borderC};
            background: ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#ffffff"};
            color: ${textColor};
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 13px;
            font-weight: 800;
            outline: none;
            box-sizing: border-box;
            resize: vertical;
          }

          .rowHead {
            margin-top: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .row {
            margin-top: 8px;
            display: grid;
            grid-template-columns: 1fr 38px;
            gap: 8px;
            align-items: center;
          }

          .barRow {
            margin-top: 8px;
            display: grid;
            grid-template-columns: 1fr 120px 38px;
            gap: 8px;
            align-items: center;
          }

          .taskRow {
            margin-top: 8px;
            display: grid;
            grid-template-columns: 1.2fr 1fr 1fr 38px;
            gap: 8px;
            align-items: center;
          }

          .twoCols {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .col {
            min-width: 0;
          }

          .mini {
            border: 1px solid ${borderC};
            background: ${theme === "dark" ? "rgba(255,255,255,0.10)" : "#ffffff"};
            color: ${textColor};
            padding: 8px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 900;
            cursor: pointer;
            user-select: none;
          }

          .del {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            border: 1px solid ${borderC};
            background: ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#ffffff"};
            cursor: pointer;
            position: relative;
          }
          .del::before,
          .del::after {
            content: "";
            position: absolute;
            left: 18px;
            top: 10px;
            width: 2px;
            height: 18px;
            background: ${textColor};
            opacity: 0.75;
            border-radius: 2px;
          }
          .del::before {
            transform: rotate(45deg);
          }
          .del::after {
            transform: rotate(-45deg);
          }

          .note {
            margin-top: 10px;
            font-size: 11px;
            font-weight: 800;
            opacity: 0.7;
          }

          .ro {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 11px;
            opacity: 0.78;
            word-break: break-all;
            padding: 10px 10px;
            border: 1px solid ${borderC};
            border-radius: 12px;
            background: ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#ffffff"};
          }

          .bottom {
            padding: 12px 18px 16px;
            border-top: 1px solid ${borderC};
            display: flex;
            justify-content: flex-end;
            gap: 10px;
          }

          .btn {
            border: 1px solid ${borderC};
            background: ${theme === "dark" ? "rgba(255,255,255,0.10)" : "#ffffff"};
            color: ${textColor};
            padding: 10px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
            user-select: none;
          }
          .btn.ghost {
            opacity: 0.82;
          }

          @media (max-width: 520px) {
            .twoCols {
              grid-template-columns: 1fr;
            }
            .taskRow {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </aside>
    </>
  );
}
