// src/pages/blog.js
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Inter } from "next/font/google";
import Image from "next/image";
import HomeIcon from "./homeIcon"; // パスが同じ階層にある想定

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const inter = Inter({ subsets: ["latin"] });

/* ===================== i18n (UI翻訳) ===================== */
// SlideAI用のキー (tabSlide等) を追加しています
/* ===================== i18n (UI翻訳) ===================== */
const I18N = {
  ar: {
    title: "مدونة Sense AI",
    desc: "تحديثات وسير عمل ومقالات حول Minutes.AI و SlideAI.",
    heroP: "أتقن اجتماعاتك وعروضك التقديمية باستخدام الذكاء الاصطناعي.",
    tabMinutes: "Minutes.AI",
    tabSlide: "SlideAI",
    allTags: "كل الوسوم",
    loadMore: "اعرض المزيد",
    noPosts: "لا توجد مقالات بعد. عد لاحقًا.",
    backHome: "العودة إلى الصفحة الرئيسية",
  },
  cs: {
    title: "Sense AI Blog",
    desc: "Novinky, pracovní postupy a články pro Zápisník AI a SlideAI.",
    heroP: "Ovládněte své schůzky a prezentace s AI.",
    tabMinutes: "Zápisník AI",
    tabSlide: "SlideAI",
    allTags: "Všechny štítky",
    loadMore: "Načíst další",
    noPosts: "Zatím žádné příspěvky. Vraťte se brzy.",
    backHome: "Zpět na domovskou stránku",
  },
  da: {
    title: "Sense AI Blog",
    desc: "Opdateringer, arbejdsgange og artikler for Referat AI og SlideAI.",
    heroP: "Mestrer dine møder og præsentationer med AI.",
    tabMinutes: "Referat AI",
    tabSlide: "SlideAI",
    allTags: "Alle tags",
    loadMore: "Indlæs mere",
    noPosts: "Ingen indlæg endnu. Kig forbi snart.",
    backHome: "Til forsiden",
  },
  de: {
    title: "Sense AI Blog",
    desc: "Updates, Workflows und Artikel für Protokoll KI und SlideAI.",
    heroP: "Meistern Sie Ihre Meetings und Präsentationen mit KI.",
    tabMinutes: "Protokoll KI",
    tabSlide: "SlideAI",
    allTags: "Alle Tags",
    loadMore: "Mehr laden",
    noPosts: "Noch keine Beiträge. Schauen Sie bald wieder vorbei.",
    backHome: "Zur Startseite",
  },
  el: {
    title: "Ιστολόγιο Sense AI",
    desc: "Ενημερώσεις, ροές εργασίας και άρθρα για το Πρακτικά AI και το SlideAI.",
    heroP: "Τελειοποιήστε τις συναντήσεις και τις παρουσιάσεις σας με AI.",
    tabMinutes: "Πρακτικά AI",
    tabSlide: "SlideAI",
    allTags: "Όλες οι ετικέτες",
    loadMore: "Φόρτωση περισσότερων",
    noPosts: "Δεν υπάρχουν ακόμη άρθρα. Επιστρέψτε σύντομα.",
    backHome: "Πίσω στην αρχική",
  },
  en: {
    title: "Sense AI Blog",
    desc: "Updates, workflows, and articles for Minutes.AI and SlideAI.",
    heroP: "Master your meetings and presentations with AI.",
    tabMinutes: "Minutes AI",
    tabSlide: "SlideAI",
    allTags: "All Tags",
    loadMore: "Load more",
    noPosts: "No posts yet. Come back soon.",
    backHome: "Back to Home",
  },
  "es-ES": {
    title: "Blog de Sense AI",
    desc: "Actualizaciones, flujos de trabajo y artículos para Actas IA y SlideAI.",
    heroP: "Domina tus reuniones y presentaciones con IA.",
    tabMinutes: "Actas IA",
    tabSlide: "SlideAI",
    allTags: "Todas las etiquetas",
    loadMore: "Cargar más",
    noPosts: "Aún no hay artículos. Vuelve pronto.",
    backHome: "Volver al inicio",
  },
  "es-MX": {
    title: "Blog de Sense AI",
    desc: "Actualizaciones, flujos de trabajo y artículos para Actas IA y SlideAI.",
    heroP: "Domina tus reuniones y presentaciones con IA.",
    tabMinutes: "Actas IA",
    tabSlide: "SlideAI",
    allTags: "Todas las etiquetas",
    loadMore: "Cargar más",
    noPosts: "Todavía no hay artículos. Vuelve pronto.",
    backHome: "Volver al inicio",
  },
  fi: {
    title: "Sense AI -blogi",
    desc: "Päivityksiä, työnkulkuja ja artikkeleita Pöytäkirja AI:lle ja SlideAI:lle.",
    heroP: "Hallitse kokouksiasi ja esityksiäsi tekoälyn avulla.",
    tabMinutes: "Pöytäkirja AI",
    tabSlide: "SlideAI",
    allTags: "Kaikki tunnisteet",
    loadMore: "Lataa lisää",
    noPosts: "Ei vielä artikkeleita. Palaa pian.",
    backHome: "Takaisin etusivulle",
  },
  fr: {
    title: "Blog Sense AI",
    desc: "Mises à jour, flux de travail et articles pour Minutes.AI et SlideAI.",
    heroP: "Maîtrisez vos réunions et vos présentations avec l'IA.",
    tabMinutes: "Minutes.AI",
    tabSlide: "SlideAI",
    allTags: "Toutes les étiquettes",
    loadMore: "Charger plus",
    noPosts: "Aucun article pour le moment. Revenez bientôt.",
    backHome: "Retour à l’accueil",
  },
  he: {
    title: "הבלוג של Sense AI",
    desc: "עדכונים, תהליכי עבודה ומאמרים עבור Minutes.AI ו-SlideAI.",
    heroP: "שלטו בפגישות ובמצגות שלכם עם AI.",
    tabMinutes: "Minutes.AI",
    tabSlide: "SlideAI",
    allTags: "כל התגים",
    loadMore: "טען עוד",
    noPosts: "אין עדיין פוסטים. חזרו בקרוב.",
    backHome: "חזרה לדף הבית",
  },
  hi: {
    title: "Sense AI ब्लॉग",
    desc: "कार्यवृत्त AI और SlideAI के लिए अपडेट, वर्कफ़्लो और लेख।",
    heroP: "AI के साथ अपनी मीटिंग और प्रेजेंटेशन में महारत हासिल करें।",
    tabMinutes: "कार्यवृत्त AI",
    tabSlide: "SlideAI",
    allTags: "सभी टैग",
    loadMore: "और लोड करें",
    noPosts: "अभी कोई पोस्ट नहीं। जल्द लौटें।",
    backHome: "होम पर वापस",
  },
  hr: {
    title: "Sense AI Blog",
    desc: "Ažuriranja, tijekovi rada i članci za AI Zapisnik i SlideAI.",
    heroP: "Usavršite svoje sastanke i prezentacije uz AI.",
    tabMinutes: "AI Zapisnik",
    tabSlide: "SlideAI",
    allTags: "Sve oznake",
    loadMore: "Učitaj još",
    noPosts: "Još nema objava. Navratite uskoro.",
    backHome: "Natrag na početnu",
  },
  hu: {
    title: "Sense AI Blog",
    desc: "Frissítések, munkafolyamatok és cikkek a Jegyzőkönyv AI és SlideAI számára.",
    heroP: "Tegye tökéletessé megbeszéléseit és prezentációit AI-val.",
    tabMinutes: "Jegyzőkönyv AI",
    tabSlide: "SlideAI",
    allTags: "Összes címke",
    loadMore: "Továbbiak betöltése",
    noPosts: "Még nincsenek bejegyzések. Nézzen vissza később.",
    backHome: "Vissza a kezdőlapra",
  },
  id: {
    title: "Blog Sense AI",
    desc: "Pembaruan, alur kerja, dan artikel untuk Minutes AI dan SlideAI.",
    heroP: "Kuasai rapat dan presentasi Anda dengan AI.",
    tabMinutes: "Minutes AI",
    tabSlide: "SlideAI",
    allTags: "Semua tag",
    loadMore: "Muat lebih banyak",
    noPosts: "Belum ada artikel. Kunjungi lagi nanti.",
    backHome: "Kembali ke Beranda",
  },
  it: {
    title: "Blog Sense AI",
    desc: "Aggiornamenti, flussi di lavoro e articoli per Verbali IA e SlideAI.",
    heroP: "Padroneggia riunioni e presentazioni con l'IA.",
    tabMinutes: "Verbali IA",
    tabSlide: "SlideAI",
    allTags: "Tutte le etichette",
    loadMore: "Carica altro",
    noPosts: "Non ci sono ancora articoli. Torna presto.",
    backHome: "Torna alla Home",
  },
  ja: {
    title: "Sense AI ブログ",
    desc: "議事録AIとSlideAIの活用法、アップデート情報をお届けします。",
    heroP: "AIで、会議もプレゼンも完璧に。",
    tabMinutes: "議事録AI",
    tabSlide: "SlideAI",
    allTags: "すべてのタグ",
    loadMore: "もっと見る",
    noPosts: "まだ記事がありません。後日またお越しください。",
    backHome: "ホームへ戻る",
  },
  ko: {
    title: "Sense AI 블로그",
    desc: "회의록AI 및 SlideAI를 위한 업데이트, 워크플로 및 기사.",
    heroP: "AI로 회의와 프레젠테이션을 완벽하게 마스터하세요.",
    tabMinutes: "회의록AI",
    tabSlide: "SlideAI",
    allTags: "모든 태그",
    loadMore: "더 보기",
    noPosts: "아직 게시물이 없습니다. 곧 다시 방문해 주세요.",
    backHome: "홈으로",
  },
  ms: {
    title: "Blog Sense AI",
    desc: "Kemas kini, aliran kerja dan artikel untuk Minit AI dan SlideAI.",
    heroP: "Kuasai mesyuarat dan pembentangan anda dengan AI.",
    tabMinutes: "Minit AI",
    tabSlide: "SlideAI",
    allTags: "Semua tag",
    loadMore: "Muat lagi",
    noPosts: "Belum ada artikel. Datang semula nanti.",
    backHome: "Kembali ke Laman Utama",
  },
  nl: {
    title: "Sense AI Blog",
    desc: "Updates, workflows en artikelen voor Notulen AI en SlideAI.",
    heroP: "Beheer uw vergaderingen en presentaties met AI.",
    tabMinutes: "Notulen AI",
    tabSlide: "SlideAI",
    allTags: "Alle tags",
    loadMore: "Meer laden",
    noPosts: "Nog geen artikelen. Kom later terug.",
    backHome: "Terug naar startpagina",
  },
  no: {
    title: "Sense AI Blogg",
    desc: "Oppdateringer, arbeidsflyter og artikler for Referat AI og SlideAI.",
    heroP: "Mestre møter og presentasjoner med AI.",
    tabMinutes: "Referat AI",
    tabSlide: "SlideAI",
    allTags: "Alle tagger",
    loadMore: "Vis mer",
    noPosts: "Ingen innlegg ennå. Kom tilbake snart.",
    backHome: "Tilbake til forsiden",
  },
  pl: {
    title: "Blog Sense AI",
    desc: "Aktualizacje, przepływy pracy i artykuły dotyczące Protokół AI i SlideAI.",
    heroP: "Opanuj swoje spotkania i prezentacje dzięki AI.",
    tabMinutes: "Protokół AI",
    tabSlide: "SlideAI",
    allTags: "Wszystkie tagi",
    loadMore: "Wczytaj więcej",
    noPosts: "Brak wpisów. Wróć wkrótce.",
    backHome: "Powrót do strony głównej",
  },
  pt: {
    title: "Blog Sense AI",
    desc: "Atualizações, fluxos de trabalho e artigos para Ata AI e SlideAI.",
    heroP: "Domine as suas reuniões e apresentações com IA.",
    tabMinutes: "Ata AI",
    tabSlide: "SlideAI",
    allTags: "Todas as etiquetas",
    loadMore: "Carregar mais",
    noPosts: "Ainda não há artigos. Volte em breve.",
    backHome: "Voltar à Página Inicial",
  },
  ro: {
    title: "Blog Sense AI",
    desc: "Actualizări, fluxuri de lucru și articole pentru Proces-verbal AI și SlideAI.",
    heroP: "Stăpânește ședințele și prezentările cu AI.",
    tabMinutes: "Proces-verbal AI",
    tabSlide: "SlideAI",
    allTags: "Toate etichetele",
    loadMore: "Încarcă mai mult",
    noPosts: "Nu există articole încă. Revino curând.",
    backHome: "Înapoi la Acasă",
  },
  ru: {
    title: "Блог Sense AI",
    desc: "Обновления, рабочие процессы и статьи для «Протоколы АИ» и SlideAI.",
    heroP: "Совершенствуйте встречи и презентации с помощью ИИ.",
    tabMinutes: "Протоколы АИ",
    tabSlide: "SlideAI",
    allTags: "Все теги",
    loadMore: "Загрузить ещё",
    noPosts: "Пока нет публикаций. Загляните позже.",
    backHome: "Назад на главную",
  },
  sk: {
    title: "Blog Sense AI",
    desc: "Aktualizácie, pracovné postupy a články pre AI Zápisnica a SlideAI.",
    heroP: "Ovládnite svoje stretnutia a prezentácie pomocou AI.",
    tabMinutes: "AI Zápisnica",
    tabSlide: "SlideAI",
    allTags: "Všetky štítky",
    loadMore: "Načítať viac",
    noPosts: "Zatiaľ žiadne príspevky. Vráťte sa čoskoro.",
    backHome: "Späť na domov",
  },
  sv: {
    title: "Sense AI Blogg",
    desc: "Uppdateringar, arbetsflöden och artiklar för Protokoll AI och SlideAI.",
    heroP: "Bemästra dina möten och presentationer med AI.",
    tabMinutes: "Protokoll AI",
    tabSlide: "SlideAI",
    allTags: "Alla taggar",
    loadMore: "Ladda mer",
    noPosts: "Inga inlägg ännu. Kom tillbaka snart.",
    backHome: "Tillbaka till startsidan",
  },
  th: {
    title: "บล็อก Sense AI",
    desc: "อัปเดต เวิร์กโฟลว์ และบทความสำหรับ บันทึกการประชุม AI และ SlideAI",
    heroP: "ยกระดับการประชุมและการนำเสนอของคุณด้วย AI",
    tabMinutes: "บันทึกการประชุม AI",
    tabSlide: "SlideAI",
    allTags: "แท็กทั้งหมด",
    loadMore: "โหลดเพิ่มเติม",
    noPosts: "ยังไม่มีบทความ โปรดกลับมาใหม่เร็ว ๆ นี้",
    backHome: "กลับสู่หน้าแรก",
  },
  tr: {
    title: "Sense AI Blogu",
    desc: "Tutanakları AI ve SlideAI için güncellemeler, iş akışları ve makaleler.",
    heroP: "Yapay zekâ ile toplantılarınıza ve sunumlarınıza hakim olun.",
    tabMinutes: "Tutanakları AI",
    tabSlide: "SlideAI",
    allTags: "Tüm etiketler",
    loadMore: "Daha fazlası",
    noPosts: "Henüz yazı yok. Yakında tekrar bakın.",
    backHome: "Ana sayfaya dön",
  },
  uk: {
    title: "Блог Sense AI",
    desc: "Оновлення, робочі процеси та статті для «Протокол ШІ» та SlideAI.",
    heroP: "Вдосконалюйте зустрічі та презентації за допомогою ШІ.",
    tabMinutes: "Протокол ШІ",
    tabSlide: "SlideAI",
    allTags: "Усі теги",
    loadMore: "Завантажити ще",
    noPosts: "Поки що немає публікацій. Завітайте згодом.",
    backHome: "Назад на головну",
  },
  vi: {
    title: "Blog Sense AI",
    desc: "Cập nhật, quy trình làm việc và bài viết cho Biên bản AI và SlideAI.",
    heroP: "Làm chủ các cuộc họp và bài thuyết trình của bạn với AI.",
    tabMinutes: "Biên bản AI",
    tabSlide: "SlideAI",
    allTags: "Tất cả thẻ",
    loadMore: "Tải thêm",
    noPosts: "Chưa có bài viết. Quay lại sau.",
    backHome: "Về Trang chủ",
  },
  "zh-CN": {
    title: "Sense AI 博客",
    desc: "Minutes AI 和 SlideAI 的更新、工作流程与文章。",
    heroP: "用 AI 掌控您的会议与演示。",
    tabMinutes: "Minutes AI",
    tabSlide: "SlideAI",
    allTags: "全部标签",
    loadMore: "加载更多",
    noPosts: "暂无文章，敬请期待。",
    backHome: "返回首页",
  },
  "zh-TW": {
    title: "Sense AI 部落格",
    desc: "會議紀錄AI 與 SlideAI 的更新、工作流程與文章。",
    heroP: "用 AI 掌握您的會議與簡報。",
    tabMinutes: "會議紀錄AI",
    tabSlide: "SlideAI",
    allTags: "全部標籤",
    loadMore: "載入更多",
    noPosts: "尚無文章，敬請期待。",
    backHome: "返回首頁",
  },
};

/* ===================== UI Components ===================== */

function Badge({ children, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400/60 ${
        active
          ? "bg-indigo-600 text-white border-indigo-600 shadow"
          : "bg-white/5 text-indigo-100 border-white/15 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// 新規追加: プロダクト切り替えタブ
function ProductTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all border ${
        active
          ? "bg-white text-indigo-900 border-white shadow-lg scale-105 ring-2 ring-indigo-400/50"
          : "bg-white/5 text-indigo-200 border-white/10 hover:bg-white/10"
      }`}
    >
      {/* 簡易的なアイコン表示 (SVG等を入れなくても動くように文字で表現) */}
      <span className={`text-lg ${active ? "opacity-100" : "opacity-50"}`}>
        {label === "SlideAI" ? "📊" : "🎙️"}
      </span>
      {label}
    </button>
  );
}

/* ===== Hydration-safe locale handling for dates ===== */
function localeWithExtensions(loc) {
  if (!loc) return undefined;
  const base = String(loc).replace(/-u-.*$/i, "");
  return `${base}-u-ca-gregory-nu-latn`;
}

function formatDate(d, locale) {
  if (!d) return "";
  try {
    const date = new Date(d);
    const normalized = localeWithExtensions(locale || undefined);
    return new Intl.DateTimeFormat(normalized, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return d;
  }
}

function Card({ post, locale }) {
  const safeHref =
    typeof post?.href === "string" ? post.href : `/blog/${post?.slug || ""}`;

  // SlideAI用の画像フォールバックを分岐
  const FALLBACK_IMG = post.product === 'slide' 
    ? "/images/slideai/hero.jpg" // SlideAI用のデフォルト画像（なければ適当なパス）
    : "/images/General03.jpeg";  // 議事録AI用のデフォルト
  
  const coverSrc = post.coverImage || FALLBACK_IMG;

  return (
    <Link
      href={safeHref}
      className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur transition-colors hover:bg-white/10"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {/* Next/Imageの最適化 */}
        <div className="absolute inset-0 bg-gray-800 animate-pulse" /> 
        <Image
          alt={post.title}
          src={coverSrc}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          // 画像が見つからない場合のエラーハンドリングは省略(Next.js標準挙動)
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-indigo-100/90">
          {/* プロダクトラベルを表示（デバッグ兼ユーザーへの明示） */}
          <span className={`rounded-full px-2 py-0.5 font-bold border border-white/10 ${
            post.product === 'slide' 
              ? 'bg-fuchsia-500/30 text-fuchsia-100' 
              : 'bg-blue-500/30 text-blue-100'
          }`}>
            {post.product === 'slide' ? 'SlideAI' : 'Minutes'}
          </span>

          {post.tags?.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-full bg-indigo-500/30 px-2 py-0.5 backdrop-blur-sm"
            >
              {t}
            </span>
          ))}
          <span className="ml-auto text-indigo-200/70" suppressHydrationWarning>
            {formatDate(post.date, locale)}
          </span>
        </div>
        <h3 className="text-xl font-semibold leading-tight text-white drop-shadow-sm">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-1 text-sm text-indigo-100/90 line-clamp-2 drop-shadow-sm">
            {post.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ===================== Main Page Component ===================== */

export default function BlogIndex({ posts = [], siteUrl, locale, defaultLocale }) {
  const router = useRouter();
  
  // 辞書取得のフォールバック
  const getTrans = (loc) => I18N[loc] || I18N["en"];
  const L = getTrans(locale) || getTrans(router.locale);

  // 翻訳キーがない場合の安全策
  const t = {
    ...I18N.en, // ベース
    ...L,       // 上書き
  };

  // State: アクティブなプロダクト ('minutes' | 'slide')
  const [activeProduct, setActiveProduct] = useState("minutes");
  const [activeTag, setActiveTag] = useState("All");
  const [limit, setLimit] = useState(12);

  // プロダクト切り替え時にタグとリミットをリセット
  const handleProductChange = (prod) => {
    setActiveProduct(prod);
    setActiveTag("All");
    setLimit(12);
  };

  // 1. まずプロダクトでフィルタリング
  const productPosts = useMemo(() => {
    return posts.filter(p => p.product === activeProduct);
  }, [posts, activeProduct]);

  // 2. その中からタグリストを生成
  const tags = useMemo(() => {
    const tSet = new Set(["All"]);
    productPosts.forEach((p) => (p.tags || []).forEach((x) => tSet.add(x)));
    return Array.from(tSet);
  }, [productPosts]);

  // 3. タグでさらにフィルタリング
  const filtered = useMemo(() => {
    const arr =
      activeTag === "All"
        ? productPosts
        : productPosts.filter((p) => p.tags?.includes(activeTag));
    return arr.slice(0, limit);
  }, [activeTag, limit, productPosts]);

  // SEO関連
  const base =
    locale && defaultLocale && locale !== defaultLocale
      ? `${siteUrl}/${locale}`
      : siteUrl;
  const canonical = `${base}/blog`;
  const OG_IMG = `${siteUrl}/images/General03.jpeg`;

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta name="description" content={t.desc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content={t.heroP || t.desc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={OG_IMG} />
        <link rel="alternate" hrefLang="x-default" href={`${siteUrl}/blog`} />
        {locale && <link rel="alternate" hrefLang={locale} href={canonical} />}
      </Head>

      <div
        className={`${inter.className} min-h-screen bg-[#0b0e2e] text-white [background:radial-gradient(1200px_800px_at_10%_-20%,rgba(70,69,255,.25),transparent),radial-gradient(800px_600px_at_100%_0%,rgba(192,132,252,.18),transparent)]`}
      >
        {/* Header */}
        <header className="mx-auto max-w-7xl px-6 pt-6">
          <Link
            href={
              locale && defaultLocale && locale !== defaultLocale ? `/${locale}` : "/"
            }
            aria-label={t.backHome}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <HomeIcon size={28} />
          </Link>
        </header>

        {/* Hero & Controls */}
        <section className="relative">
          <div className="mx-auto max-w-7xl px-6 pt-8 pb-10">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-4">
              {t.title}
            </h1>
            <p className="mt-4 max-w-2xl text-indigo-100/90 text-lg mb-10">
              {t.heroP}
            </p>

            {/* ★ Product Tabs */}
            <div className="flex flex-wrap gap-4 mb-8">
              <ProductTab 
                label={t.tabMinutes || "Minutes AI"} 
                active={activeProduct === "minutes"} 
                onClick={() => handleProductChange("minutes")} 
              />
              <ProductTab 
                label={t.tabSlide || "SlideAI"} 
                active={activeProduct === "slide"} 
                onClick={() => handleProductChange("slide")} 
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-3">
              {tags.map((tg) => (
                <Badge
                  key={tg}
                  active={activeTag === tg}
                  onClick={() => setActiveTag(tg)}
                >
                  {tg === "All" ? t.allTags : tg}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Posts Grid */}
        <section>
          <div className="mx-auto max-w-7xl px-6 pb-16">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-indigo-200/60 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <p>{t.noPosts}</p>
                {activeProduct === "slide" && (
                  <p className="text-sm mt-2">Coming soon to the SlideAI blog!</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((post) => (
                  <Card key={post.slug || post.title} post={post} locale={locale} />
                ))}
              </div>
            )}

            {/* Load more */}
            {limit <
              (activeTag === "All"
                ? productPosts.length
                : productPosts.filter((p) => p.tags?.includes(activeTag)).length) && (
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={() => setLimit((v) => v + 9)}
                    className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  >
                    {t.loadMore}
                  </button>
                </div>
              )}
          </div>
        </section>
      </div>
    </>
  );
}

/* ===================== Data Fetching Logic (Backend) ===================== */

function toISO(v, fallbackNow = false) {
  if (!v && fallbackNow) return new Date().toISOString();
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime())
    ? fallbackNow
      ? new Date().toISOString()
      : null
    : d.toISOString();
}

/**
 * ディレクトリ内のFrontmatterを探すヘルパー
 */
function tryReadFrontFromDir(dirPath, currentLocale, defaultLocale) {
  if (!fs.existsSync(dirPath)) return null;
  
  const all = fs.readdirSync(dirPath);
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const candidates = uniq([
    `${currentLocale}.mdx`,
    `${currentLocale}.md`,
    `${defaultLocale}.mdx`,
    `${defaultLocale}.md`,
    `en.mdx`,
    `en.md`,
    all.find((f) => /\.mdx$/i.test(f)),
    all.find((f) => /\.md$/i.test(f)),
  ]);

  for (const name of candidates) {
    if (!name) continue;
    const p = path.join(dirPath, name);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8");
      const { data, content } = matter(raw);
      return { data, content, filePath: p };
    }
  }
  return null;
}

/** JSON補完のヘルパー */
function readI18nJsonFallback(baseDir, currentLocale, defaultLocale, file) {
  const tryPaths = [
    path.join(baseDir, currentLocale, file),
    path.join(baseDir, defaultLocale, file),
    path.join(baseDir, "en", file),
  ];
  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, "utf8"));
      } catch {}
    }
  }
  return null;
}

export async function getStaticProps({ locale, defaultLocale }) {
  const contentDir = path.join(process.cwd(), "content", "blog");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.sense-ai.world";
  
  const posts = [];
  const hrefSet = new Set();

  // 重複防止＆リスト追加用ヘルパー
  const pushPost = (p, productType) => {
    if (!p?.href) return;
    if (hrefSet.has(p.href)) return;
    hrefSet.add(p.href);
    
    // UI側でフィルタリングするために product タグを付与
    p.product = productType; 
    posts.push(p);
  };

  const ents = fs.existsSync(contentDir)
    ? fs.readdirSync(contentDir, { withFileTypes: true })
    : [];

  /* ========================================================
     1. 議事録AI (Minutes AI) の記事取得
     (content/blog 直下のファイル & フォルダ、ただし slideai は除く)
     ======================================================== */
  
  // 1-A) 直下のファイル (.md / .mdx)
  for (const ent of ents.filter((e) => e.isFile())) {
    if (!/\.(md|mdx)$/i.test(ent.name)) continue;
    
    const filename = ent.name;
    const slug = filename.replace(/\.(md|mdx)$/i, "");
    const raw = fs.readFileSync(path.join(contentDir, filename), "utf8");
    const { data, content } = matter(raw);

    const title = (data.title || slug).toString();
    const isIntro = slug === "hello-minutes-ai" || slug === "what-is-minutes-ai";
    const href =
      (typeof data.link === "string" && data.link.trim()) ||
      (isIntro ? "/blog/introduction" : `/blog/${slug}`);

    const coverImage = data.cover || data.image || null;

    pushPost({
      slug,
      title,
      date: toISO(data.date, true),
      updatedAt: toISO(data.updatedAt, false),
      excerpt: data.excerpt || (content ? content.slice(0, 180) : ""),
      coverImage,
      tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ["Articles"],
      href,
    }, 'minutes'); // ★ minutes
  }

  // 1-B) 直下のディレクトリ (slideai以外)
  for (const ent of ents.filter((e) => e.isDirectory())) {
    const dir = ent.name;
    
    // ★★★ 重要: SlideAIフォルダはここでは無視する ★★★
    if (dir === 'slideai') continue;

    const dirPath = path.join(contentDir, dir);
    const picked = tryReadFrontFromDir(dirPath, locale || "en", defaultLocale || "en");
    if (!picked) continue;

    let { data, content } = picked;

    // JSONフォールバック
    const localesBase = path.join(process.cwd(), "public", "locales");
    const j = readI18nJsonFallback(
        localesBase,
        locale || "en",
        defaultLocale || "en",
        `blog_${dir}.json`
      ) || {};
    
    let title = (data?.title || j?.hero?.h1 || dir).toString().trim();
    let excerpt = (data?.excerpt || j?.hero?.tagline || "").toString().trim();

    const href = `/blog/${dir}`;
    const coverImage = data?.cover || data?.image || "/images/General03.jpeg";

    pushPost({
      slug: dir,
      title,
      date: toISO(data?.date, true),
      updatedAt: toISO(data?.updatedAt, false),
      excerpt: excerpt || (content ? content.slice(0, 180) : ""),
      coverImage,
      tags: Array.isArray(data?.tags) && data.tags.length ? data.tags : ["Articles"],
      href,
    }, 'minutes'); // ★ minutes
  }

  /* ========================================================
     2. SlideAI の記事取得
     (content/blog/slideai 配下のディレクトリ)
     ======================================================== */
  
  const slideAiDir = path.join(contentDir, 'slideai');
  if (fs.existsSync(slideAiDir)) {
    const slideEnts = fs.readdirSync(slideAiDir, { withFileTypes: true });

    for (const ent of slideEnts.filter(e => e.isDirectory())) {
      const dir = ent.name; // pricing, how-to 等
      const dirPath = path.join(slideAiDir, dir);

      const picked = tryReadFrontFromDir(dirPath, locale || "en", defaultLocale || "en");
      if (!picked) continue;

      let { data, content } = picked;
      
      let title = (data?.title || dir).toString().trim();
      let excerpt = (data?.excerpt || "").toString().trim();

      // ★ URLは /blog/slideai/xxx になるように整形
      const href = `/blog/slideai/${dir}`;
      
      // デフォルト画像はSlideAI専用のものがあればベスト
      const coverImage = data?.cover || data?.image || null;

      pushPost({
        slug: `slideai/${dir}`,
        title,
        date: toISO(data?.date, true),
        updatedAt: toISO(data?.updatedAt, false),
        excerpt: excerpt || (content ? content.slice(0, 180) : ""),
        coverImage,
        tags: Array.isArray(data?.tags) && data.tags.length ? data.tags : ["SlideAI"],
        href,
      }, 'slide'); // ★ slide
    }
  }

  /* ========================================================
     3. その他ハードコード (Online Meeting) - 議事録AI扱い
     ======================================================== */
  const hasOnlineMeeting = posts.some(
    (p) => p.slug === "onlinemeeting" || p.href === "/blog/onlinemeeting"
  );
  if (!hasOnlineMeeting) {
    const localesBase = path.join(process.cwd(), "public", "locales");
    const j =
      readI18nJsonFallback(
        localesBase,
        locale || "en",
        defaultLocale || "en",
        "blog_onlinemeeting.json"
      ) || {};
    let title = j?.hero?.h1 || "Online Meetings for Minutes.AI";
    let excerpt =
      j?.hero?.tagline ||
      "Click “Online”, issue a URL, share it, and you’re in. When you hang up, minutes start generating automatically.";

    pushPost({
      slug: "onlinemeeting",
      title,
      date: new Date().toISOString(),
      updatedAt: null,
      excerpt,
      coverImage: "/images/LivekitMeeting.png",
      tags: ["Release", "Minutes.AI"],
      href: "/blog/onlinemeeting",
    }, 'minutes'); // ★ minutes
  }

  // 最新順にソート
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    props: {
      posts,
      siteUrl,
      locale: locale || null,
      defaultLocale: defaultLocale || null,
    },
    revalidate: 600,
  };
}