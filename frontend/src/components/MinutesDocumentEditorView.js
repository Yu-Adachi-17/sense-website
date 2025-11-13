// components/MinutesDocumentEditorView.js
import React from "react";

export default function MinutesDocumentEditorView({ doc, onChange }) {
  if (!doc) return null;

  const handleFieldChange = (sectionIndex, itemIndex, newText) => {
    const next = structuredClone(doc); // or deep copy
    next.sections[sectionIndex].items[itemIndex].text = newText;
    onChange(next);
  };

  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
      {doc.sections.map((section, sIdx) => (
        <div key={section.id || sIdx} style={{ marginBottom: 24 }}>
          {section.title && (
            <div
              style={{
                fontWeight: "bold",
                fontSize: 16,
                marginBottom: 8,
                borderBottom: "1px solid #eee",
              }}
            >
              {section.title}
            </div>
          )}

          {section.items.map((item, iIdx) => (
            <div key={item.id || iIdx} style={{ marginBottom: 12 }}>
              {item.label && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#888",
                    marginBottom: 4,
                  }}
                >
                  {item.label}
                </div>
              )}
              <textarea
                value={item.text || ""}
                onChange={(e) =>
                  handleFieldChange(sIdx, iIdx, e.target.value)
                }
                style={{
                  width: "100%",
                  minHeight: 60,
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  padding: 8,
                  fontSize: 14,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
