const path = require("path");
const fs = require("fs");
const SitemapGenerator = require("sitemap-generator");

// サイトマップを生成する対象のURL
const SITE_URL = "https://www.sense-ai.world";

// `public` フォルダが存在しない場合は作成
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// サイトマップの保存先
const OUTPUT_PATH = path.join(publicDir, "sitemap.xml");

// サイトマップのジェネレーターを作成
const generator = SitemapGenerator(SITE_URL, {
    stripQuerystring: true,
    filepath: OUTPUT_PATH
});

// エラー処理
generator.on("error", (error) => {
    console.error("Sitemap generation error:", error);
});

// サイトマップの作成開始
generator.start();
