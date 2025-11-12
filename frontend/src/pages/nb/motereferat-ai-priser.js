import Pricing from "../blog/pricing";

// nbページでも中身は同じコンポーネントを再利用し、canonicalだけ専用URLに。
export default function NbMotereferatPriser(props) {
  return <Pricing canonicalPath="/nb/motereferat-ai-priser" {...props} />;
}

// 既存の i18n 読み込み（blog_pricing）をそのまま流用
export { getStaticProps } from "../blog/pricing";
