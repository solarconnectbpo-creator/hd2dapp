import { useEffect } from "react";

const SITE = "https://hardcoredoortodoorclosers.com";

type SeoProps = {
  title: string;
  description: string;
  /** Path only, e.g. `/signup` */
  path?: string;
};

/**
 * Client-side document title + meta description for SPA routes (crawlers that execute JS;
 * static HTML still comes from index.html for first paint).
 */
export function Seo({ title, description, path = "" }: SeoProps) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    const canonicalPath = path.startsWith("/") ? path : `/${path}`;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", `${SITE}${canonicalPath === "//" ? "/" : canonicalPath}`);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute("content", title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute("content", description);
  }, [title, description, path]);

  return null;
}
