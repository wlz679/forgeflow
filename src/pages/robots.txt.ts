import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: https://forgeflowkit.com/sitemap-index.xml`,
    { headers: { 'Content-Type': 'text/plain' } }
  );
};
