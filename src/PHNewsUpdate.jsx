import React, { useEffect, useMemo, useState } from "react";
import { Menu, Search, Moon, SunMedium, Share2, Flame, Newspaper, TrendingUp, Clock, Globe, Radio, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * PH News Update — Single‑Page React Site (enhanced)
 * --------------------------------------------------------
 * ✅ Live feed ready (fetches /api/articles when present)
 * ✅ Bookmarks (Saved) via localStorage
 * ✅ Dismissible Breaking banner
 * ✅ Load more pagination
 * ✅ Newsletter form wired to Buttondown
 * ✅ Dark mode, SEO JSON‑LD, share links, clean Tailwind UI
 */

// ------------------------------
// CONFIG
// ------------------------------
const BRAND = {
  name: "PH News Update",
  tagline: "Real stories. Real time.",
  domain: "https://ph-news-update-now.vercel.app",
  logoText: "PH",
  primaryCategories: ["Top", "Nation", "Metro", "Business", "World", "Sports", "Tech", "Showbiz", "Saved"],
};

const SAMPLE_ARTICLES = [
  {
    id: "1",
    title: "Palace backs lifestyle check; transparency drive intensifies",
    excerpt:
      "Malacañang signaled full cooperation with oversight bodies amid calls for broader lifestyle audits across the bureaucracy.",
    image:
      "https://images.unsplash.com/photo-1544441892-9e2b3b3f3aef?q=80&w=1400&auto=format&fit=crop",
    category: "Nation",
    author: "PH News Desk",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    url: "#",
    tags: ["governance", "transparency"],
  },
  {
    id: "2",
    title: "Jobseekers reminded of Myanmar deployment ban amid scam rings",
    excerpt:
      "Authorities warn against online recruitment pitches targeting Filipinos, urging verification through official channels.",
    image:
      "https://images.unsplash.com/photo-1513530176992-0cf39c4cbed4?q=80&w=1400&auto=format&fit=crop",
    category: "Nation",
    author: "PH News Update",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    url: "#",
    tags: ["OFW", "labor"],
  },
  {
    id: "3",
    title: "Peso firms on remittance inflows; traders eye inflation print",
    excerpt:
      "Local currency rises against the dollar as markets brace for the latest CPI data and policy guidance.",
    image:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1400&auto=format&fit=crop",
    category: "Business",
    author: "Markets Team",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    url: "#",
    tags: ["fx", "inflation"],
  },
  {
    id: "4",
    title: "Gilastopainters clinch thriller; semifinals set for Sunday",
    excerpt:
      "National squad escapes in overtime; matchup draws record online viewership across platforms.",
    image:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1400&auto=format&fit=crop",
    category: "Sports",
    author: "Sports Desk",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 32).toISOString(),
    url: "#",
    tags: ["basketball"],
  },
  {
    id: "5",
    title: "Metro traffic easing as work‑from‑home uptick continues",
    excerpt:
      "Average travel times improved on major corridors after flexible arrangements expanded in Q3.",
    image:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1400&auto=format&fit=crop",
    category: "Metro",
    author: "City Beat",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    url: "#",
    tags: ["transport"],
  },
];

// Simulated trending strings (replace with your live feed)
const SAMPLE_TRENDING = [
  "#FuelPrices", "#UAAPFinals", "#WeatherWatch", "#Forex", "#CommuterAlert", "#Employment", "#TechLaunch",
];

// ------------------------------
// HELPERS
// ------------------------------
const classNames = (...arr) => arr.filter(Boolean).join(" ");

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("phnews:dark") : null;
    if (stored) return stored === "true";
    if (typeof window !== "undefined") return window.matchMedia("(prefers-color-scheme: dark)").matches;
    return false;
  });
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", dark);
      localStorage.setItem("phnews:dark", String(dark));
    }
  }, [dark]);
  return [dark, setDark];
}

// ------------------------------
// ROOT COMPONENT
// ------------------------------
export default function PHNewsUpdate() {
  const [dark, setDark] = useDarkMode();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Top");
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState(SAMPLE_ARTICLES);
  const [trending, setTrending] = useState(SAMPLE_TRENDING);

  // NEW: bookmarks (Saved)
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("phnews:saved") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("phnews:saved", JSON.stringify(saved)); }, [saved]);
  const toggleSave = (id) => setSaved((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // NEW: Breaking banner (set to null to hide by default)
  const [breaking, setBreaking] = useState({ id: "brk1", text: "BREAKING: PAGASA issues heavy rainfall warning for Metro Manila", url: "#" });

  // NEW: Load more
  const [visible, setVisible] = useState(12);

  // Live feed: try /api/articles, fallback to samples
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/articles");
        if (!res.ok) throw new Error("no api");
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length) setArticles(data);
      } catch (_) {
        // keep SAMPLE_ARTICLES
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = articles;
    if (category === "Saved") list = list.filter((a) => saved.includes(a.id));
    else if (category && category !== "Top") list = list.filter((a) => a.category === category);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [articles, category, query, saved]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: BRAND.name,
    url: BRAND.domain,
    logo: BRAND.domain + "/logo.png",
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* SEO + JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-neutral-900/70 border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
              <a href="#" className="flex items-baseline gap-2 font-extrabold tracking-tight text-xl">
                <span className="inline-grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-400 text-white">{BRAND.logoText}</span>
                <span>{BRAND.name}</span>
              </a>
              <span className="hidden md:inline-block text-sm text-neutral-500 dark:text-neutral-400">{BRAND.tagline}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search headlines, topics, tags..."
                  className="pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-400 w-44 sm:w-64"
                />
              </div>
              <button
                onClick={() => setDark((d) => !d)}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Toggle dark mode"
                title="Toggle dark mode"
              >
                {dark ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* BREAKING BANNER */}
      {breaking && (
        <div className="bg-rose-600 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
            <a href={breaking.url} className="font-semibold underline-offset-2 hover:underline">🔴 {breaking.text}</a>
            <button onClick={()=> setBreaking(null)} className="text-white/90 hover:text-white">Dismiss ✕</button>
          </div>
        </div>
      )}

      {/* TRENDING TICKER */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-2 py-2 text-sm">
            <Flame className="h-4 w-4 text-rose-500" />
            <strong className="mr-2">Trending:</strong>
            <div className="relative overflow-hidden flex-1">
              <div className="animate-[marquee_30s_linear_infinite] whitespace-nowrap">
                {trending.concat(trending).map((t, i) => (
                  <span key={i} className="mx-4 text-neutral-700 dark:text-neutral-300">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY TABS */}
      <nav className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex gap-2 overflow-x-auto py-3">
          {BRAND.primaryCategories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={classNames(
                "px-3 py-1.5 rounded-full text-sm border",
                category === c
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                  : "bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
        {/* FEATURED */}
        {featured && (
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
            <motion.article
              layout
              className="lg:col-span-3 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60"
              itemScope
              itemType="https://schema.org/NewsArticle"
            >
              <div className="relative aspect-[16/9] sm:aspect-[21/9]">
                <img src={featured.image} alt="Featured story" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 p-4 sm:p-6 text-white">
                  <span className="inline-flex items-center gap-1 text-xs bg-white/15 px-2 py-1 rounded-full backdrop-blur"><TrendingUp className="h-3 w-3"/> Featured</span>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold" itemProp="headline">{featured.title}</h1>
                  <p className="mt-2 max-w-2xl text-sm sm:text-base text-neutral-200" itemProp="description">{featured.excerpt}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-neutral-300">
                    <Clock className="h-4 w-4"/>
                    <time itemProp="datePublished" dateTime={featured.publishedAt}>{timeAgo(featured.publishedAt)}</time>
                    <span aria-hidden>•</span>
                    <span className="inline-flex items-center gap-1"><Newspaper className="h-4 w-4"/>{featured.author}</span>
                  </div>
                </div>
              </div>
            </motion.article>

            {/* SIDE LIST */}
            <aside className="lg:col-span-2 space-y-4">
              {rest.slice(0,4).map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </aside>
          </section>
        )}

        {/* GRID */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {rest.slice(4, 4 + visible).map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <ArticleCard article={a} saved={saved} toggleSave={toggleSave} />
              </motion.div>
            ))}
            {loading && (
              <div className="col-span-full flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </AnimatePresence>
        </section>

        {rest.length > 4 + visible && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setVisible((v) => v + 12)}
              className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
            >
              Load more
            </button>
          </div>
        )}

        {/* NEWSLETTER */}
        <section className="mt-14">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 bg-gradient-to-br from-sky-50 to-white dark:from-neutral-900 dark:to-neutral-950">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Get headlines in your inbox</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Subscribe for breaking news alerts and curated stories.</p>
              </div>
              <form
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  const email = e.currentTarget.querySelector("input[type=email]").value; 
                  window.open(`https://buttondown.email/api/emails/embed-subscribe/phnewsupdate?email=${encodeURIComponent(email)}`, "_blank");
                }}
                className="flex w-full md:w-auto items-center gap-2"
              >
                <input
                  required
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 md:w-72 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <button className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold">Subscribe</button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg">
                <span className="inline-grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-400 text-white">{BRAND.logoText}</span>
                {BRAND.name}
              </div>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{BRAND.tagline}</p>
            </div>
            <div>
              <h4 className="font-semibold">Sections</h4>
              <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                {BRAND.primaryCategories.map((c) => (
                  <li key={c}><a href="#" className="hover:underline" onClick={() => setCategory(c)}>{c}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Company</h4>
              <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                <li><a href="#" className="hover:underline">About</a></li>
                <li><a href="#" className="hover:underline">Editorial Policy</a></li>
                <li><a href="#" className="hover:underline">Contact</a></li>
                <li><a href="#" className="hover:underline">Advertise</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Legal</h4>
              <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                <li><a href="#" className="hover:underline">Terms</a></li>
                <li><a href="#" className="hover:underline">Privacy</a></li>
                <li><a href="#" className="hover:underline">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 text-xs text-neutral-500">© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</div>
        </div>
      </footer>

      {/* KEYBOARD NAV HINT (A11y/Easter egg) */}
      <kbd className="fixed bottom-3 right-3 text-[11px] px-2 py-1 rounded bg-neutral-900 text-white/90 dark:bg-white dark:text-neutral-900/90 opacity-70">Tab ⭢ Navigate</kbd>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ------------------------------
// SUB‑COMPONENTS
// ------------------------------
function ArticleRow({ article }) {
  return (
    <article className="group grid grid-cols-[120px_1fr] gap-3 items-center rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900">
      <a href={article.url} className="relative h-24 w-full overflow-hidden">
        <img src={article.image} alt="Thumbnail" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
      </a>
      <div className="pr-3 py-3">
        <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400">
          <Globe className="h-3.5 w-3.5" /> {article.category}
          <span aria-hidden>•</span>
          <Clock className="h-3.5 w-3.5" /> {timeAgo(article.publishedAt)}
        </div>
        <a href={article.url} className="block mt-1 font-semibold leading-snug hover:underline">
          {article.title}
        </a>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">{article.excerpt}</p>
      </div>
    </article>
  );
}

function ArticleCard({ article, saved = [], toggleSave = () => {} }) {
  const shareText = encodeURIComponent(`${article.title} — via ${BRAND.name}`);
  const shareUrl = encodeURIComponent(article.url || BRAND.domain);
  const twitter = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  const isSaved = saved.includes(article.id);

  return (
    <article
      className="group rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col"
      itemScope
      itemType="https://schema.org/NewsArticle"
    >
      <a href={article.url} className="relative aspect-[16/9] overflow-hidden">
        <img src={article.image} alt="Article image" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-black/65 text-white">
          <Radio className="h-3 w-3"/> Live
        </span>
      </a>
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2 text-xs text-sky-700 dark:text-sky-400">
          <Globe className="h-3.5 w-3.5"/> {article.category}
          <span aria-hidden>•</span>
          <Clock className="h-3.5 w-3.5"/> <time dateTime={article.publishedAt}>{timeAgo(article.publishedAt)}</time>
        </div>
        <a href={article.url} className="mt-1 block font-bold leading-snug hover:underline" itemProp="headline">{article.title}</a>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2" itemProp="description">{article.excerpt}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {article.tags?.map((t) => (
            <span key={t} className="text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1 rounded-full">#{t}</span>
          ))}
        </div>
      </div>
      <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => toggleSave(article.id)}
          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          aria-pressed={isSaved}
          title={isSaved ? "Remove bookmark" : "Save for later"}
        >
          {isSaved ? "Saved ★" : "Save ☆"}
        </button>
        <a href={twitter} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
          <Share2 className="h-4 w-4"/> Share
        </a>
        <a href={fb} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
          <Share2 className="h-4 w-4"/> Facebook
        </a>
      </div>
    </article>
  );
}