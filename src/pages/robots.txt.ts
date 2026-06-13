import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: https://calckit.com/sitemap-index.xml`,
    { headers: { 'Content-Type': 'text/plain' } }
  );
};
