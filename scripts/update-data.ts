import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POOLS_DIR = join(__dirname, '..', 'src', 'data', 'pools');
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';

// YouTube 15 个热门分类 ID
const CATEGORIES = [
  1,   // Film & Animation
  2,   // Autos & Vehicles
  10,  // Music
  15,  // Pets & Animals
  17,  // Sports
  19,  // Travel & Events
  20,  // Gaming
  22,  // People & Blogs
  23,  // Comedy
  24,  // Entertainment
  25,  // News & Politics
  26,  // Howto & Style
  27,  // Education
  28,  // Science & Technology
  29,  // Nonprofits & Activism
];

interface TrendsData { topics: string[]; updated: string | null; }
interface ExpertsData { creators: string[]; updated: string | null; }
interface KeywordsData { phrases: string[]; updated: string | null; }
interface SearchTrendsData { rising: { query: string; change: string }[]; updated: string | null; }
interface Metadata {
  lastUpdated: string | null;
  youtubeCategories: number;
  totalVideosSampled: number;
  trendsCount: number;
  expertsCount: number;
  keywordsCount: number;
  risingQueriesCount: number;
  partialUpdate: boolean;
}

function readJSON<T>(filename: string): T {
  return JSON.parse(readFileSync(join(POOLS_DIR, filename), 'utf-8'));
}

function writeJSON(filename: string, data: unknown): void {
  writeFileSync(join(POOLS_DIR, filename), JSON.stringify(data, null, 2) + '\n');
}

function ensureDir(): void {
  if (!existsSync(POOLS_DIR)) mkdirSync(POOLS_DIR, { recursive: true });
}

// 停用词列表（英文）
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every',
  'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'about', 'over', 'this', 'that', 'these', 'those', 'it', 'its',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
  'him', 'her', 'them', 'his', 'their', 'what', 'which', 'who', 'whom',
  'how', 'when', 'where', 'why', 'if', 'then', 'here', 'there',
  'also', 'get', 'make', 'one', 'out', 'up', 'now', 'new', 'like',
  '2026', '2025', '2024', 'vs', '—', '-', '|', '•',
]);

async function main() {
  ensureDir();

  const now = new Date().toISOString();
  let partialUpdate = false;
  let youtubeCategories = 0;
  let totalVideosSampled = 0;

  // ===== YouTube 数据 =====
  if (YOUTUBE_KEY) {
    try {
      const allTitles: string[] = [];
      const allChannels: string[] = [];

      for (const catId of CATEGORIES) {
        try {
          const url = `${YOUTUBE_BASE}/videos?part=snippet&chart=mostPopular&regionCode=US&maxResults=50&videoCategoryId=${catId}&key=${YOUTUBE_KEY}`;
          const res = await fetch(url);
          const json = await res.json() as any;

          if (json.error) {
            console.error(`YouTube API error for category ${catId}: ${json.error.message}`);
            continue;
          }

          youtubeCategories++;
          for (const item of json.items || []) {
            const title: string = item.snippet?.title || '';
            const channel: string = item.snippet?.channelTitle || '';
            if (title) allTitles.push(title);
            if (channel) allChannels.push(channel);
          }
        } catch (e) {
          console.error(`Failed to fetch category ${catId}:`, e);
        }
      }

      totalVideosSampled = allTitles.length;
      console.log(`Fetched ${totalVideosSampled} videos across ${youtubeCategories} categories`);

      // 提取趋势词：分词 → 停用词过滤 → 词频排序 → 取前 30
      const wordFreq = new Map<string, number>();
      for (const title of allTitles) {
        const words = title
          .toLowerCase()
          .split(/[\s,.;:!?()"'\[\]{}|\\/@#$%^&*+=~`-]+/)
          .map(w => w.trim())
          .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
        for (const word of words) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      }
      const topTopics = [...wordFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

      // 提取创作者名：去重 → 词频排序 → 取前 20
      const channelFreq = new Map<string, number>();
      for (const ch of allChannels) {
        channelFreq.set(ch, (channelFreq.get(ch) || 0) + 1);
      }
      const topCreators = [...channelFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name]) => name);

      // 提取高频短语（bigram + trigram）：取前 40
      const phraseFreq = new Map<string, number>();
      for (const title of allTitles) {
        const words = title
          .toLowerCase()
          .split(/[\s,.;:!?()"'\[\]{}|\\/@#$%^&*+=~`-]+/)
          .map(w => w.trim())
          .filter(w => w.length > 1 && !/^\d+$/.test(w));
        for (let i = 0; i < words.length - 1; i++) {
          const bigram = `${words[i]} ${words[i + 1]}`;
          phraseFreq.set(bigram, (phraseFreq.get(bigram) || 0) + 1);
          if (i < words.length - 2) {
            const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            phraseFreq.set(trigram, (phraseFreq.get(trigram) || 0) + 1);
          }
        }
      }
      const topPhrases = [...phraseFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([p]) => p);

      writeJSON('trends.json', { topics: topTopics, updated: now } satisfies TrendsData);
      writeJSON('experts.json', { creators: topCreators, updated: now } satisfies ExpertsData);
      writeJSON('keywords.json', { phrases: topPhrases, updated: now } satisfies KeywordsData);

      console.log(`Extracted: ${topTopics.length} topics, ${topCreators.length} creators, ${topPhrases.length} phrases`);
    } catch (e) {
      console.error('YouTube data fetch failed, keeping previous data:', e);
      partialUpdate = true;
    }
  } else {
    console.warn('YOUTUBE_API_KEY not set, skipping YouTube data fetch');
    partialUpdate = true;
  }

  // ===== Google Trends 数据 =====
  try {
    const googleTrends = await import('google-trends-api');
    const gt = (googleTrends as any).default || googleTrends;

    const NICHES = [
      'fitness', 'cooking', 'tech reviews', 'gaming', 'beauty',
      'personal finance', 'travel vlog', 'music', 'education', 'fashion',
      'home decor', 'productivity',
    ];

    const risingQueries: { query: string; change: string }[] = [];

    for (const niche of NICHES) {
      try {
        const result = await gt.relatedQueries({
          keyword: niche,
          startTime: new Date(Date.now() - 7 * 86400000),
        });
        const parsed = JSON.parse(result);
        const rising = parsed?.default?.rankedList?.[1]?.rankedKeyword || [];
        for (const item of rising.slice(0, 5)) {
          risingQueries.push({
            query: item.query,
            change: item.value || 'rising',
          });
        }
      } catch (e) {
        // 单个 niche 失败不影响整体
      }
    }

    if (risingQueries.length > 0) {
      writeJSON('search-trends.json', {
        rising: risingQueries.slice(0, 30),
        updated: now,
      } satisfies SearchTrendsData);
      console.log(`Extracted ${Math.min(risingQueries.length, 30)} rising queries`);
    } else {
      console.warn('No rising queries found, keeping previous search-trends.json');
    }
  } catch (e) {
    console.error('Google Trends fetch failed, keeping previous data:', e);
    partialUpdate = true;
  }

  // ===== 写 metadata =====
  writeJSON('metadata.json', {
    lastUpdated: now,
    youtubeCategories,
    totalVideosSampled,
    trendsCount: readJSON<TrendsData>('trends.json').topics.length,
    expertsCount: readJSON<ExpertsData>('experts.json').creators.length,
    keywordsCount: readJSON<KeywordsData>('keywords.json').phrases.length,
    risingQueriesCount: readJSON<SearchTrendsData>('search-trends.json').rising.length,
    partialUpdate,
  } satisfies Metadata);

  console.log(`Data update complete. partialUpdate=${partialUpdate}`);
}

main().catch(e => {
  console.error('update-data failed:', e);
  // 永远不返回非零 exit code，避免中断 GitHub Actions
  process.exit(0);
});
