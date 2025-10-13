// src/components/MinutesDocumentView.js
import React from "react";

const base = {
  heading1: { fontSize: 30, fontWeight: "bold", margin: "0 0 8px 0" },
  heading2: { fontSize: 24, fontWeight: "bold", margin: "14px 0 6px 0" },
  heading3: { fontSize: 18, fontWeight: "bold", margin: "8px 0 4px 0" },
  paragraph: { whiteSpace: "pre-wrap", margin: "4px 0" },
  ul: { margin: "4px 0 0 18px", padding: 0 },
  ol: { margin: "4px 0 0 18px", padding: 0 },
  li: { marginBottom: "4px" },
  hr: { height: 1, backgroundColor: "#e5e5e5", border: "none", margin: "14px 0" },
  kvTable: { width: "100%", borderCollapse: "collapse", marginTop: 6 },
  kvTh: { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #eee", width: "28%" },
  kvTd: { padding: "6px 8px", borderBottom: "1px solid #eee" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 6 },
  th: { textAlign: "left", padding: 8, borderBottom: "1px solid #eee" },
  td: { padding: 8, borderBottom: "1px solid #eee" },
  quote: { fontStyle: "italic", fontWeight: "bold", marginTop: 10 },
  meta: { opacity: 0.9, marginBottom: 12, fontWeight: "bold" },
};

export default function MinutesDocumentView({ doc }) {
  if (!doc) return null;
  return (
    <div style={{ whiteSpace: "normal", width: "100%" }}>
      {doc.title ? <h1 style={base.heading1}>{doc.title}</h1> : null}

      {doc.meta && (doc.meta.date || doc.meta.location || (doc.meta.attendees && doc.meta.attendees.length)) ? (
        <div style={base.meta}>
          {doc.meta.date ? <p style={{ margin: 0 }}>{doc.meta.date}</p> : null}
          {doc.meta.location ? <p style={{ margin: 0 }}>{doc.meta.location}</p> : null}
          {Array.isArray(doc.meta.attendees) && doc.meta.attendees.length
            ? <p style={{ margin: 0 }}>{doc.meta.attendees.join(", ")}</p>
            : null}
        </div>
      ) : null}

      {(doc.blocks || []).map((b, i) => {
        switch (b.type) {
          case "heading":
            if (b.level === 1) return <h1 key={i} style={base.heading1}>{b.text}</h1>;
            if (b.level === 2) return <h2 key={i} style={base.heading2}>{b.text}</h2>;
            return <h3 key={i} style={base.heading3}>{b.text}</h3>;

          case "paragraph":
            return <p key={i} style={base.paragraph}>{b.text}</p>;

          case "list":
            if (b.ordered) {
              return (
                <ol key={i} style={base.ol}>
                  {(b.items || []).map((it, idx) => <li key={idx} style={base.li}>{it}</li>)}
                </ol>
              );
            }
            return (
              <ul key={i} style={base.ul}>
                {(b.items || []).map((it, idx) => <li key={idx} style={base.li}>{it}</li>)}
              </ul>
            );

          case "table":
            return (
              <table key={i} style={base.table}>
                {b.header ? (
                  <thead>
                    <tr>{b.header.map((h, j) => <th key={j} style={base.th}>{h}</th>)}</tr>
                  </thead>
                ) : null}
                <tbody>
                  {(b.rows || []).map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => <td key={c} style={base.td}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            );

          case "keyValue":
            return (
              <table key={i} style={base.kvTable}>
                <tbody>
                  {(b.pairs || []).map(([k, v], r) => (
                    <tr key={r}>
                      <th style={base.kvTh}>{k}</th>
                      <td style={base.kvTd}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );

          case "quote":
            return <p key={i} style={base.quote}>{b.text}</p>;

          case "divider":
            return <hr key={i} style={base.hr} />;

          case "callout":
            return (
              <div key={i} style={{
                border: "1px solid #e5e5e5",
                borderLeft: "4px solid #000",
                padding: 12,
                borderRadius: 8,
                margin: "10px 0"
              }}>
                {b.title ? <div style={{ ...base.heading3, marginTop: 0 }}>{b.title}</div> : null}
                {b.text ? <div style={base.paragraph}>{b.text}</div> : null}
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
