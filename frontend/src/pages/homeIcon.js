// frontend/src/pages/homeIcon.js
import { useRouter } from "next/router";
import Image from "next/image";

const HomeIcon = ({ size = "40px", src = "/images/home.png", alt = "Home" }) => {
  const router = useRouter();

  // "40px" / 40 いずれでも数値化
  const toNumberPx = (v) => (typeof v === "number" ? v : parseInt(String(v).replace("px", ""), 10) || 0);
  const px = Math.max(1, toNumberPx(size)); // 0ガード

  return (
    <div
      onClick={() => router.push("/")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: px,
        height: px,
        cursor: "pointer",
        // PNGの視認性を少しだけ上げたい時の影（任意）
        // filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
      }}
      aria-label="Go to Home"
      role="button"
    >
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        // CSSで実寸と合わせる（CLS防止のため width/height は必須）:contentReference[oaicite:4]{index=4}
        style={{ width: px, height: px, objectFit: "contain" }}
        priority={false} // ヘッダー等のLCP要素なら true を検討 :contentReference[oaicite:5]{index=5}
      />
    </div>
  );
};

export default HomeIcon;
