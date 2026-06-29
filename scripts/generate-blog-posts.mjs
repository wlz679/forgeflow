#!/usr/bin/env node
// Generate 32 blog post markdown files from src/data/tools/index.ts.
// Used in P1-2 to migrate from src/data/blog-posts.ts to Astro Content Collections.
// Idempotent: re-running produces identical files (deterministic output).
//
// Run: pnpm gen:blog

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tools } from '../src/data/tools/index.ts';

const OUT_DIR = resolve(process.cwd(), 'src/content/blog');

function escapeYaml(value) {
  // Single-quoted YAML: escape internal ' by doubling ''
  return "'" + value.replace(/'/g, "''") + "'";
}

function generateBody(tool) {
  const title = tool.title;
  const inputsList = tool.inputs.length > 0
    ? tool.inputs.map(i => i.label.toLowerCase()).join(' and ')
    : 'information';

  return [
    `## What is the ${title}?`,
    ``,
    `The ${title} is a free online tool designed to help entrepreneurs and indie makers ${tool.description.toLowerCase()}. It's part of our suite of 30 free business calculators, all built to help you build and grow your business without spending a dime.`,
    ``,
    `## Why Entrepreneurs Need This Tool`,
    ``,
    `Every successful business owner knows that the right tools make a huge difference. The ${title} saves you time and helps you make better decisions by providing instant, actionable results based on proven startup and indie maker best practices.`,
    ``,
    `Whether you're validating your first SaaS idea or scaling your existing business, this tool gives you professional-level assistance in seconds — no experience required.`,
    ``,
    `## How to Use the ${title}`,
    ``,
    `Using this tool is simple and takes less than a minute:`,
    ``,
    `1. Visit the ${title} page on our website.`,
    `2. Enter your ${inputsList}.`,
    `3. Click the Generate button.`,
    `4. Review your results instantly — each one is unique.`,
    `5. Click the Copy button on any result you want to save, or use Copy All to grab everything at once.`,
    ``,
    `## Tips and Best Practices`,
    ``,
    `To get the most out of the ${title}, here are some expert tips:`,
    ``,
    `- **Be specific with your inputs.** The more detail you provide, the more relevant your results will be. Instead of "SaaS," try "B2B project management SaaS for remote teams."`,
    `- **Generate multiple times.** Each click produces a fresh set of results. Try generating 2-3 times to get a wider range of options.`,
    `- **Combine with other tools.** Use the ${title} alongside our other free tools like the MRR Calculator and the Launch Checklist Generator for the best results.`,
    `- **Save your favorites.** Use the Copy button to save results you like, then paste them into a document for later reference.`,
    `- **Test and iterate.** Use the results as a starting point, then customize them to match your unique voice and business needs.`,
    ``,
    `## Get Started Now`,
    ``,
    `Ready to level up your business journey? Try the ${title} now — it's completely free, requires no signup, and works instantly in your browser.`,
  ].join('\n');
}

function generateFrontmatter(tool) {
  return [
    `---`,
    `title: ${escapeYaml(`Best ${tool.title} for Entrepreneurs (2026)`)}`,
    `excerpt: ${escapeYaml(`Discover the best ${tool.title.toLowerCase()} to grow your solo business. Free, no signup required. Learn how to use this tool effectively with our step-by-step guide.`)}`,
    `ogImage: ${escapeYaml(tool.slug)}`,
    `toolSlug: ${escapeYaml(tool.slug)}`,
    `---`,
  ].join('\n');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let count = 0;
  for (const tool of tools) {
    const filename = `best-${tool.slug}.md`;
    const content = `${generateFrontmatter(tool)}\n\n${generateBody(tool)}\n`;
    await writeFile(resolve(OUT_DIR, filename), content, 'utf-8');
    count++;
  }
  console.log(`Generated ${count} blog posts to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('gen:blog failed:', err);
  process.exit(1);
});
