import { useEffect } from "react";
import { useLocation } from "wouter";

const SITE_NAME = "5toolbox";
const BASE_URL = typeof window !== "undefined"
  ? window.location.origin
  : import.meta.env.VITE_SITE_URL ?? "https://tools.itsyasin.me";
const DEFAULT_DESC = "Free online file toolkit — merge PDFs, compress images, convert files, and more. All processing happens in your browser. No uploads, no sign-up, no limits.";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  noIndex?: boolean;
  ogType?: "website" | "article" | "blog";
  ogImage?: string;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

function setHreflang(lang: string, url: string) {
  let el = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "alternate");
    el.setAttribute("hreflang", lang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function SEO({
  title,
  description = DEFAULT_DESC,
  keywords,
  noIndex = false,
  ogType = "website",
  ogImage
}: SEOProps) {
  const [location] = useLocation();

  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Free Online File Tools`;
    const canonical = `${BASE_URL}${location}`;
    const finalOgImage = ogImage || `${BASE_URL}/favicon.svg`;

    document.title = fullTitle;

    setMeta("description", description);
    if (keywords) {
      setMeta("keywords", keywords);
    } else {
      // Remove keywords if not provided to avoid stale tags
      const el = document.querySelector('meta[name="keywords"]');
      if (el) el.remove();
    }
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");

    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:image", finalOgImage, "property");

    setMeta("twitter:title", fullTitle, "name");
    setMeta("twitter:description", description, "name");
    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:image", finalOgImage, "name");

    setCanonical(canonical);
    setHreflang("en", canonical);
    setHreflang("x-default", canonical);
  }, [title, description, keywords, location, noIndex, ogType, ogImage]);

  return null;
}

