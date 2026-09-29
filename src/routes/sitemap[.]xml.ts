import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

<<<<<<< HEAD
const BASE_URL = "https://csc-clms2.vercel.app";
=======
// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
<<<<<<< HEAD
        const today = new Date().toISOString().split("T")[0];

        const entries: SitemapEntry[] = [
          // Public / login pages — highest priority for Google to find
          { path: "/",         changefreq: "monthly", priority: "1.0",  lastmod: today },
          { path: "/login",    changefreq: "monthly", priority: "0.9",  lastmod: today },
          // Core app pages — authenticated but still worth indexing for sitelinks
          { path: "/dashboard",      changefreq: "daily",   priority: "0.8", lastmod: today },
          { path: "/apply",          changefreq: "weekly",  priority: "0.8", lastmod: today },
          { path: "/leaves",         changefreq: "daily",   priority: "0.8", lastmod: today },
          { path: "/requests",       changefreq: "daily",   priority: "0.7", lastmod: today },
          { path: "/schedule",       changefreq: "weekly",  priority: "0.6", lastmod: today },
          { path: "/proxies",        changefreq: "weekly",  priority: "0.6", lastmod: today },
          { path: "/holidays",       changefreq: "monthly", priority: "0.5", lastmod: today },
          { path: "/notices",        changefreq: "weekly",  priority: "0.5", lastmod: today },
          { path: "/profile",        changefreq: "monthly", priority: "0.4", lastmod: today },
          { path: "/payroll",        changefreq: "monthly", priority: "0.4", lastmod: today },
          { path: "/admin-reports",  changefreq: "weekly",  priority: "0.4", lastmod: today },
        ];
=======
        const entries: SitemapEntry[] = [{ path: "/", changefreq: "weekly", priority: "1.0" }];
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
<<<<<<< HEAD
            e.lastmod    ? `    <lastmod>${e.lastmod}</lastmod>`         : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority   ? `    <priority>${e.priority}</priority>`       : null,
=======
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
