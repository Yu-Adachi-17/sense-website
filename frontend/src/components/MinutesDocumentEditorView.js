// components/MinutesDocumentEditorView.js
import React, { useEffect, useState, useCallback } from "react";

/**
 * text: JSON文字列（```json ... ``` でもOK）
 * onChangeText: 編集結果を pretty JSON 文字列で返す
 *
 * ポイント：
 * - JSON構造（{}, [], key）は編集させない
 * - string の値と string の配列だけ編集可能
 * - それ以外（number, boolean, null）は閲覧専用
 */

const containerStyle = {
  width: "100%",
  height: "100%",
  overflowY: "auto",
};

const sectionTitleStyle = (level) => ({
  fontWeight: "bold",
  fontSize: 14,
  marginBottom: 8,
  marginTop: level === 0 ? 0 : 12,
  marginLeft: level * 12,
  borderLeft: "3px solid #000000",
  paddingLeft: 8,
});

const labelStyle = (level) => ({
  fontSize: 13,
  color: "#555555",
  marginBottom: 4,
  marginLeft: level * 12 + 4,
});

const textareaStyle = {
  width: "100%",
  minHeight: 48,
  borderRadius: 8,
  border: "1px solid #CCCCCC",
  padding: 8,
  fontSize: 14,
  resize: "vertical",
  boxSizing: "border-box",
  lineHeight: 1.5,
};

const readonlyValueStyle = (level) => ({
  marginLeft: level * 12 + 4,
  fontSize: 14,
  color: "#888888",
  padding: "4px 0",
});

/** ```json ... ``` の囲いを外す */
const stripCodeFence = (raw) => {
  if (typeof raw !== "string") return "";
  let text = raw.trim();
  if (!text.startsWith("```")) return raw;
  const lines = text.split("\n");
  // 先頭行: ```json など
  const first = lines[0].trim();
  if (!first.startsWith("```")) return raw;
  // 末尾の ``` を削る
  let endIndex = lines.length;
  if (lines[lines.length - 1].trim() === "```") {
    endIndex = lines.length - 1;
  }
  const body = lines.slice(1, endIndex).join("\n");
  return body;
};

export default function MinutesDocumentEditorView({ text, onChangeText }) {
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState(null);

  // text が変わったら JSON パース
  useEffect(() => {
    const clean = stripCodeFence(text);
    try {
      const obj = JSON.parse(clean);
      setParsed(obj);
      setParseError(null);
    } catch (e) {
      setParsed(null);
      setParseError(e.message || "Failed to parse JSON");
    }
  }, [text]);

  const updateValueAtPath = useCallback(
    (path, newValue) => {
      setParsed((prev) => {
        if (!prev) return prev;
        // JSON データなので stringify/parse で深いコピー
        const next = JSON.parse(JSON.stringify(prev));
        let cursor = next;
        for (let i = 0; i < path.length - 1; i++) {
          cursor = cursor[path[i]];
        }
        cursor[path[path.length - 1]] = newValue;

        const jsonString = JSON.stringify(next, null, 2);
        onChangeText(jsonString);
        return next;
      });
    },
    [onChangeText]
  );

  const renderField = (value, path, label, level = 0) => {
    const key = path.join(".") || "root";

    // 文字列は編集可能
    if (typeof value === "string") {
      return (
        <div key={key} style={{ marginBottom: 12 }}>
          {label && <div style={labelStyle(level)}>{label}</div>}
          <textarea
            style={textareaStyle}
            value={value}
            onChange={(e) => updateValueAtPath(path, e.target.value)}
          />
        </div>
      );
    }

    // 配列
    if (Array.isArray(value)) {
      const allStrings = value.every((v) => typeof v === "string");

      // 文字列配列 → 各要素だけ編集可能（追加/削除は不可）
      if (allStrings) {
        return (
          <div key={key} style={{ marginBottom: 16 }}>
            {label && <div style={sectionTitleStyle(level)}>{label}</div>}
            {value.map((item, index) => (
              <div key={`${key}.${index}`} style={{ marginBottom: 8 }}>
                <div style={labelStyle(level + 1)}>{`${label || ""}[${index}]`}</div>
                <textarea
                  style={textareaStyle}
                  value={item}
                  onChange={(e) =>
                    updateValueAtPath(
                      [...path],
                      value.map((v, i) => (i === index ? e.target.value : v))
                    )
                  }
                />
              </div>
            ))}
          </div>
        );
      }

      // オブジェクト配列など → ネスト表示、構造そのまま
      return (
        <div key={key} style={{ marginBottom: 16 }}>
          {label && <div style={sectionTitleStyle(level)}>{label}</div>}
          {value.map((item, index) => (
            <div key={`${key}.${index}`} style={{ marginLeft: (level + 1) * 12 }}>
              {renderField(
                item,
                [...path, index],
                Array.isArray(item) || typeof item === "object"
                  ? `[${index}]`
                  : `${label || ""}[${index}]`,
                level + 1
              )}
            </div>
          ))}
        </div>
      );
    }

    // オブジェクト → フィールドごとに再帰
    if (value && typeof value === "object") {
      const entries = Object.entries(value);
      return (
        <div key={key} style={{ marginBottom: 16 }}>
          {label && <div style={sectionTitleStyle(level)}>{label}</div>}
          {entries.map(([k, v]) => (
            <div key={`${key}.${k}`} style={{ marginLeft: (level + 1) * 12 }}>
              {renderField(v, [...path, k], k, level + 1)}
            </div>
          ))}
        </div>
      );
    }

    // number / boolean / null は閲覧専用
    return (
      <div key={key} style={{ marginBottom: 8 }}>
        {label && <div style={labelStyle(level)}>{label}</div>}
        <div style={readonlyValueStyle(level)}>{String(value)}</div>
      </div>
    );
  };

  // JSONとして読めない場合 → プレーンテキスト編集にフォールバック
  if (parseError || parsed == null) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            color: "#cc0000",
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          JSON として解釈できなかったため、そのままテキスト編集モードになっています。
        </div>
        <textarea
          style={{ ...textareaStyle, height: "100%" }}
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
        />
      </div>
    );
  }

  // ルートオブジェクトの中身を全部レンダリング
  return (
    <div style={containerStyle}>
      {renderField(parsed, [], null, 0)}
    </div>
  );
}
