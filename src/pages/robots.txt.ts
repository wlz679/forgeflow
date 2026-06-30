import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/site-config';

export const GET: APIRoute = () => {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap-index.xml`,
    { headers: { 'Content-Type': 'text/plain' } }
  );
};
