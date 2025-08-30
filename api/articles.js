// /api/articles.js — Vercel Serverless Function
// ESM module (your repo uses "type": "module")
import Parser from "rss-parser";

/**
 * Default sources (edit anytime):
 * - PAGASA advisories
 * - DOLE advisories
 * - PTV / PIA (gov't)
 * - Two major PH outlets (headlines)
 *
 * Note: If any feed is temporarily unreachable, we skip it; the endpoint still responds.
 */
const SOURCES = [
  { label: "PAGASA", url: "https://www.pagasa.dost.gov.ph/index.php/press-releases?format=feed&type=rss" },
  { label: "DOLE",   url: "https://www.dole.gov.ph/news/feed/" },
  { label: "PIA",     url: "https://pia.gov.ph/rss/articles" },
  { label: "PTV",     url: "https://www.ptvnews.ph/feed/" },
  { label: "Inquirer",url: "https://newsinfo.inquirer.net/feed" },
  { label: "Philstar", url: "https://www.philstar.com/rss/headlines" },
];

// Fallback image used when a feed item doesn't include media
const FALLBACK_IMG = "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop";

// Category-based placeholders for items without media
const CATEGORY_IMAGE = {
  Top: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop",
  Nation: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop",
  Business: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1600&auto=format&fit=crop",
  Sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1600&auto=format&fit=crop",
  Tech: "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1600&auto=format&fit=crop",
  World: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1600&auto=format&fit=crop",
  Metro: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?q=80&w=1600&auto=format&fit=crop",
  Showbiz: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=1600&auto=format&fit=crop",
};

function firstFromSrcset(srcset = "") {
  const first = String(srcset).split(",")[0];
  const url = first.trim().split(" ")[0];
  return url || null;
}

function pickImage(item = {}) {
  const media = item.enclosure?.url
    || item["media:content"]?.url
    || (Array.isArray(item["media:content"]) && item["media:content"][0]?.url)
    || item["media:thumbnail"]?.url
    || item["itunes:image"]?.href
    || item.image;
  if (media) return media;

  const html = item["content:encoded"] || item.content || "";
  if (html) {
    const dataSrc = html.match(/<img[^>]+data-src=["']([^"']+)["']/i);
    if (dataSrc?.[1]) return dataSrc[1];
    const srcset = html.match(/<img[^>]+srcset=["']([^"']+)["']/i);
    if (srcset?.[1]) return firstFromSrcset(srcset[1]);
    const src = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (src?.[1]) return src[1];
  }
  return null;
}

function strip(html = "") {
  return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toCategory(sourceLabel = "", feedTitle = "") {
  const s = `${sourceLabel} ${feedTitle}`.toLowerCase();
  if (s.includes("business")) return "Business";
  if (s.includes("sports")) return "Sports";
  if (s.includes("world")) return "World";
  if (s.includes("tech") || s.includes("science")) return "Tech";
  if (s.includes("metro") || s.includes("nation") || s.includes("philippines")) return "Nation";
  return "Top";
}

export default async function handler(req, res) {
  // Reasonable CDN cache: 5 minutes fresh, 1 minute stale while revalidating
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
  res.setHeader("Content-Type", "application/json");

  const parser = new Parser({ timeout: 15000 });
  const items = [];

  for (const src of SOURCES) {
    try {
      const feed = await parser.parseURL(src.url);
      const cat = toCategory(src.label, feed.title || "");
      for (const it of feed.items || []) {
        items.push({
          id: it.guid || it.id || it.link,
          title: (it.title || "").trim(),
          excerpt: strip(it.contentSnippet || it.summary || it["content:encodedSnippet"] || it.content || ""),
          image: (pickImage(it) || fallbackImage(cat, it.guid || it.id || it.link || it.title)),
          category: cat,
          author: it.creator || src.label || "News Desk",
          publishedAt: (() => { const rawDate = it.isoDate || it.pubDate || Date.now(); const ts = new Date(rawDate).getTime(); const safeTs = Number.isFinite(ts) ? Math.min(ts, Date.now()) : Date.now(); return new Date(safeTs).toISOString(); })(),
          url: it.link,
          tags: [],
          source: src.label,
        });
      }
    } catch (e) {
      // Log and skip failing source; continue gracefully
      console.error("RSS fail:", src.label, e?.message || e);
    }
  }

  // Dedupe by normalized title
  const seen = new Set();
  const deduped = items.filter((a) => {
    const key = (a.title || "").toLowerCase();
    if (!a.title || !a.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort newest first
  deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // Limit response
  res.status(200).json(deduped.slice(0, 100));
}
