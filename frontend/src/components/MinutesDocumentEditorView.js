// components/MinutesDocumentEditorView.js
import React, { useEffect, useState, useCallback } from "react";

/**
 * props:
 *  - text: JSON文字列（```json ... ``` でもOK）
 *  - onChangeText: (newText: string) => void
 *  - t: next-i18next の t（既存の minutes レンダリングと同じもの）
 *
 * 仕様:
 *  - JSON構造（{}, [], key）は編集させない
 *  - string / string配列だけ編集可能
 *  - ラベルは既存の i18n ("minutes.*", "minutes.oneonone.*" など) を使う
 *  - インデントは付けず、シンプルなフォーム＋カード表示
 */

const containerStyle = {
  width: "100%",
  height: "100%",
  overflowY: "auto",
  maxWidth: "900px",
  margin: "0 auto",
  paddingRight: 4,
};

const sectionTitleStyle = {
  fontWeight: 600,
  fontSize: 16,
  marginTop: 24,
  marginBottom: 8,
};

const fieldLabelStyle = {
  fontSize: 13,
  color: "#555555",
  marginBottom: 4,
};

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

const readonlyValueStyle = {
  fontSize: 14,
  color: "#888888",
  padding: "4px 0",
};

const cardStyle = {
  border: "1px solid #EEEEEE",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
  backgroundColor: "#FAFAFA",
};

const cardTitleStyle = {
  fontSize: 15,
  fontWeight: 600,
  marginBottom: 10,
};

/** ```json ... ``` の囲いを外す */
const stripCodeFence = (raw) => {
  if (typeof raw !== "string") return "";
  let text = raw.trim();
  if (!text.startsWith("```")) return raw;
  const lines = text.split("\n");
  const first = lines[0].trim();
  if (!first.startsWith("```")) return raw;
  let endIndex = lines.length;
  if (lines[lines.length - 1].trim() === "```") {
    endIndex = lines.length - 1;
  }
  const body = lines.slice(1, endIndex).join("\n");
  return body;
};

// minutes.oneonone.xxx などの「カテゴリキー」
const SCOPE_KEYS = ["brainstorming", "jobInterview", "lecture", "oneonone"];

/**
 * JSONキー → ラベル
 * 1. scopeKey があれば minutes.scopeKey.key を試す
 * 2. なければ minutes.key
 * 3. それでも無ければ key をそこそこ読みやすく整形
 */
const getLabelFromI18n = (rawKey, scopeKey, t) => {
  if (!rawKey) return "";

  if (scopeKey) {
    const scopedKey = `minutes.${scopeKey}.${rawKey}`;
    const scoped = t(scopedKey);
    if (scoped !== scopedKey) return scoped;
  }

  const directKey = `minutes.${rawKey}`;
  const direct = t(directKey);
  if (direct !== directKey) return direct;

  // fallback: key名をそれっぽく
  return rawKey
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function MinutesDocumentEditorView({ text, onChangeText, t }) {
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState(null);

  // text → JSON パース
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
        const next = JSON.parse(JSON.stringify(prev)); // 深いコピー
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

  /**
   * value: 現在の値
   * path: ["topics", 0, "proposal"] など
   * rawKey: このノードの key（配列要素なら親 key）
   * label: 画面に出すラベル
   * scopeKey: minutes.oneonone.xxx のようなカテゴリキー
   * level: ネスト（見た目の強弱にだけ使う。横インデントはしない）
   */
  const renderNode = (value, path, rawKey, label, scopeKey, level = 0) => {
    const reactKey = path.join(".") || "root";

    // 文字列：シンプルなテキストエリア
    if (typeof value === "string") {
      return (
        <div key={reactKey} style={{ marginBottom: 16 }}>
          {label && <div style={fieldLabelStyle}>{label}</div>}
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

      // 文字列配列 → ラベル＋1行ずつ
      if (allStrings) {
        return (
          <section key={reactKey} style={{ marginBottom: 24 }}>
            {label && <div style={sectionTitleStyle}>{label}</div>}
            {value.map((item, index) => (
              <div key={`${reactKey}.${index}`} style={{ marginBottom: 10 }}>
                {/* 行番号だけ薄く表示（keyDiscussion[2] 的な文字列は出さない） */}
                <div
                  style={{
                    fontSize: 11,
                    color: "#888888",
                    marginBottom: 4,
                  }}
                >
                  {index + 1}
                </div>
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
          </section>
        );
      }

      // オブジェクト配列 → 大きなカード
      return (
        <section key={reactKey} style={{ marginBottom: 24 }}>
          {label && <div style={sectionTitleStyle}>{label}</div>}
          {value.map((item, index) => {
            const titleLabel =
              label != null && label !== ""
                ? `${label} ${index + 1}`
                : `${index + 1}`;
            return (
              <div key={`${reactKey}.${index}`} style={cardStyle}>
                <div style={cardTitleStyle}>{titleLabel}</div>
                {renderObject(item, [...path, index], scopeKey, level + 1)}
              </div>
            );
          })}
        </section>
      );
    }

    // オブジェクトは renderObject に任せる
    if (value && typeof value === "object") {
      return (
        <section key={reactKey} style={{ marginBottom: 24 }}>
          {label && (
            <div
              style={{
                ...sectionTitleStyle,
                fontSize: level === 0 ? 18 : 16,
              }}
            >
              {label}
            </div>
          )}
          {renderObject(value, path, scopeKey, level + 1)}
        </section>
      );
    }

    // number / boolean / null → 閲覧専用
    return (
      <div key={reactKey} style={{ marginBottom: 12 }}>
        {label && <div style={fieldLabelStyle}>{label}</div>}
        <div style={readonlyValueStyle}>{String(value)}</div>
      </div>
    );
  };

  const renderObject = (obj, path, scopeKey, level) => {
    const entries = Object.entries(obj);

    return entries.map(([key, childValue]) => {
      // oneonone / lecture などのカテゴリを検知
      const nextScope = SCOPE_KEYS.includes(key) ? key : scopeKey;
      const label = getLabelFromI18n(key, nextScope, t);

      return renderNode(
        childValue,
        [...path, key],
        key,
        label,
        nextScope,
        level
      );
    });
  };

  // JSON として解釈できない場合 → 最後の砦としてプレーンテキスト編集
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

  // ルートオブジェクトを展開
  return (
    <div style={containerStyle}>
      {renderObject(parsed, [], null, 0)}
    </div>
  );
}
