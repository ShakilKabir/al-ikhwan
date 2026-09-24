import type { MetadataRoute } from "next";

// No login yet: ask search engines not to index anything.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
