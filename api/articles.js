// api/articles.js  (Vercel serverless function)
// ESM because your repo uses "type": "module"
import Parser from "rss-parser";

const SOURCES = [
  // add/remove feeds you like; these are examples:
  "https://pia.gov.ph/rss/articles",
  "https://www.ptvnews.ph/feed/",
  "https://newsinfo.inquirer.net/feed",
  "https://www.philstar.com/rss/headlines",
  "https://www.rappler.com/feed/",
];

function pickImage(item) {
  const media = item.enclosure?.url || item["media:content"]?.url || "";
  return media || "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop";
}
function strip(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function handler(req, res) {
  try {
    const parser = new Parser({ timeout: 10000 });
    const all = [];

    for (const url of SOURCES) {
      try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items ?? []) {
          all.push({
            id: item.guid || item.link,
            title: (item.title || "").trim(),
            excerpt: strip(item.contentSnippet || item.summary || item.content || ""),
            image: pickImage(item),
            category: (feed.title || "Top").replace(/RSS|Feed/gi, "").trim(),
            author: item.creator || feed.title || "News Desk",
            publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
            url: item.link,
            tags: [],
          });
        }
      } catch (e) {
        // ignore per-source failures
      }
    }

    // dedupe by normalized title
    const seen = new Set();
    const deduped = all.filter(a => {
      const k = (a.title || "").toLowerCase();
      if (!a.title || !a.url || seen.has(k)) return false;
      seen.add(k);
      return true;
    }).sort((a,b)=> new Date(b.publishedAt) - new Date(a.publishedAt));

    res.status(200).json(deduped.slice(0, 80));
  } catch (err) {
    res.status(500).json({ error: "Failed to load articles" });
  }
}
