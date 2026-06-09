import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateSponsorship(inputs: Record<string, string>): string[] {
  const downloads = parseInt(inputs.monthlyDownloads) || 0;
  const subscribers = parseInt(inputs.emailSubscribers) || 0;
  const followers = parseInt(inputs.socialFollowers) || 0;
  const contentType = inputs.contentType || 'newsletter';
  const results: string[] = [];

  const cpmRates: Record<string, number> = {
    podcast: 25,
    newsletter: 40,
    youtube: 20,
    blog: 15,
  };

  const cpm = cpmRates[contentType] || 20;

  const podcastValue = downloads > 0 ? (downloads / 1000) * 25 : 0;
  const newsletterValue = (subscribers / 1000) * 40;
  const socialValue = (followers / 10000) * 200;
  const totalPerSponsorship = podcastValue + newsletterValue + socialValue;
  const monthlyValue = totalPerSponsorship * 4;
  const annualValue = monthlyValue * 12;

  const loc = (n: number) => '$' + n.toLocaleString();
  const fmt = (n: number) => n.toLocaleString();

  const typeLabel: Record<string, string> = {
    podcast: 'Podcast',
    newsletter: 'Newsletter',
    youtube: 'YouTube Channel',
    blog: 'Blog',
  };

  results.push(
    '💰 Sponsorship Rate Estimate\n\n' +
    '🎙️ Content Type: ' + typeLabel[contentType] + '\n' +
    '📊 CPM: $' + cpm + ' per 1,000 impressions\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📈 Channel Breakdown:\n' +
    '• Downloads/Listens: $' + loc(podcastValue) + '/episode\n' +
    '• Email Subscribers: $' + loc(newsletterValue) + '/send\n' +
    '• Social Followers: $' + loc(socialValue) + '/post\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💵 Per Sponsorship Value: ' + loc(totalPerSponsorship) + '\n' +
    '📆 Monthly Value (4 placements): ' + loc(monthlyValue) + '\n' +
    '💰 Annual Sponsorship Revenue: ' + loc(annualValue) + '\n\n' +
    '💡 Your audience size of ' + loc(downloads + subscribers + followers) + ' total reach puts you in the ' +
    ((downloads + subscribers + followers) > 100000 ? 'large creator' : (downloads + subscribers + followers) > 25000 ? 'mid-tier' : 'micro-influencer') +
    ' category. Brands typically pay ' + cpm + 'x CPM for this content type.',
  );

  const audienceSizes = [1000, 5000, 15000, 50000, 200000];
  for (let i = 0; i < audienceSizes.length; i++) {
    const a = audienceSizes[i];
    let val: number;
    if (contentType === 'podcast') {
      val = (a / 1000) * 25 * 4;
    } else if (contentType === 'newsletter') {
      val = (a / 1000) * 40 * 4;
    } else if (contentType === 'youtube') {
      val = (a / 1000) * 20 * 4;
    } else {
      val = (a / 1000) * 15 * 4;
    }
    const yearly = val * 12;
    results.push(
      'Comparison: ' + loc(a) + ' audience → $' + loc(val) + '/mo ($' + loc(yearly) + '/yr) as ' + typeLabel[contentType].toLowerCase() + ' sponsor',
    );
  }

  return results;
}

const customFn =
  "var dl=parseInt(inputs.monthlyDownloads)||0;" +
  "var subs=parseInt(inputs.emailSubscribers)||0;" +
  "var fol=parseInt(inputs.socialFollowers)||0;" +
  "var ct=inputs.contentType||'newsletter';" +
  "var cr={podcast:25,newsletter:40,youtube:20,blog:15};" +
  "var cpm=cr[ct]||20;" +
  "var pv=dl>0?(dl/1000)*25:0;" +
  "var nv=(subs/1000)*40;" +
  "var sv=(fol/10000)*200;" +
  "var tsp=pv+nv+sv;" +
  "var mv=tsp*4;" +
  "var av=mv*12;" +
  "function loc(n){return '$'+n.toLocaleString()}" +
  "var tl={podcast:'Podcast',newsletter:'Newsletter',youtube:'YouTube Channel',blog:'Blog'};" +
  "var totalAud=dl+subs+fol;" +
  "var cat=totalAud>100000?'large creator':totalAud>25000?'mid-tier':'micro-influencer';" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83D\\uDCB0 Sponsorship Rate Estimate\\n\\n" +
  "\\uD83C\\uDF99\\uFE0F Content Type: '+tl[ct]+'\\n" +
  "\\uD83D\\uDCCA CPM: $'+cpm+' per 1,000 impressions\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCC8 Channel Breakdown:\\n" +
  "\\u2022 Downloads/Listens: $'+loc(pv)+'/episode\\n" +
  "\\u2022 Email Subscribers: $'+loc(nv)+'/send\\n" +
  "\\u2022 Social Followers: $'+loc(sv)+'/post\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCB5 Per Sponsorship Value: '+loc(tsp)+'\\n" +
  "\\uD83D\\uDCC6 Monthly Value (4 placements): '+loc(mv)+'\\n" +
  "\\uD83D\\uDCB0 Annual Sponsorship Revenue: '+loc(av)+'\\n\\n" +
  "\\uD83D\\uDCA1 Your audience size of '+(dl+subs+fol).toLocaleString()+' total reach puts you in the '+cat+' category. Brands typically pay $'+cpm+' CPM for this content type.'" +
  ");" +
  "var sizes=[1000,5000,15000,50000,200000];" +
  "for(var i=0;i<sizes.length;i++){" +
  "var a=sizes[i];" +
  "var val;" +
  "if(ct==='podcast')val=(a/1000)*25*4;" +
  "else if(ct==='newsletter')val=(a/1000)*40*4;" +
  "else if(ct==='youtube')val=(a/1000)*20*4;" +
  "else val=(a/1000)*15*4;" +
  "var yr=val*12;" +
  "results.push('Comparison: '+a.toLocaleString()+' audience \\u2192 $'+loc(val)+'/mo ($'+loc(yr)+'/yr) as '+tl[ct].toLowerCase()+' sponsor');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-sponsorship-rate-calculator',
  title: 'Sponsorship Rate Calculator',
  description: 'Estimate what brands will pay to sponsor your content. Calculate CPM-based rates for podcasts, newsletters, YouTube, and blogs.',
  category: 'E',
  inputs: [
    { name: 'monthlyDownloads', label: 'Monthly Downloads / Listens', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'emailSubscribers', label: 'Email Subscribers', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'socialFollowers', label: 'Social Media Followers', placeholder: 'e.g. 15000', type: 'number' },
    { name: 'contentType', label: 'Content Type', placeholder: '', type: 'select', options: ['podcast', 'newsletter', 'youtube', 'blog'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateSponsorship(inputs);
  },
  staticExamples: [
    '💰 Sponsorship Rate Estimate\n\n🎙️ Content Type: Newsletter\n📊 CPM: $40 per 1,000 impressions\n\n━━━━━━━━━━━━━━━━━━━━\n\n📈 Channel Breakdown:\n• Downloads/Listens: $250/episode\n• Email Subscribers: $200/send\n• Social Followers: $300/post\n\n━━━━━━━━━━━━━━━━━━━━\n\n💵 Per Sponsorship Value: $550\n📆 Monthly Value (4 placements): $2,200\n💰 Annual Sponsorship Revenue: $26,400\n\n💡 Your audience size of 30,000 total reach puts you in the mid-tier category. Brands typically pay $40 CPM for this content type.',
    'Comparison: 1,000 audience → $160/mo ($1,920/yr) as newsletter sponsor',
    'Comparison: 5,000 audience → $800/mo ($9,600/yr) as newsletter sponsor',
    'Comparison: 15,000 audience → $2,400/mo ($28,800/yr) as newsletter sponsor',
    'Comparison: 50,000 audience → $8,000/mo ($96,000/yr) as newsletter sponsor',
    'Comparison: 200,000 audience → $32,000/mo ($384,000/yr) as newsletter sponsor',
  ],
  faq: [
    { q: 'What is CPM in sponsorship?', a: 'CPM stands for Cost Per Mille (cost per thousand impressions). In sponsorship, it is the rate brands pay per 1,000 views, listens, or opens. Podcasts typically fetch $25-50 CPM for host-read ads. Newsletters command $30-60 CPM due to high engagement. YouTube runs $10-30 CPM via the platform or higher for direct sponsorships. Blogs generally earn $10-25 CPM through display ads or direct placements.' },
    { q: 'How do I increase my sponsorship rates?', a: 'Focus on engagement metrics, not just reach. A smaller but highly engaged audience commands higher CPMs. Track open rates for newsletters (30%+ is excellent), listen-through rates for podcasts (70%+ is strong), and comment-to-view ratios. Create a media kit with these metrics. Niche audiences in finance, tech, and B2B SaaS command 2-3x higher CPMs than general entertainment audiences.' },
    { q: 'Should I charge per episode or monthly retainer?', a: 'Monthly retainers are better for both parties. Brands get consistent exposure and you get predictable revenue. Structure it as 4 placements per month (weekly) with one bonus social post. Charge a premium for single-episode sponsorships (1.5x the per-episode rate) because brands are testing you out with no long-term commitment.' },
    { q: 'When do brands start approaching me?', a: 'Most brands consider sponsorship at 5,000+ subscribers or 10,000+ downloads per episode. However, micro-influencers with 1,000-5,000 highly engaged followers in a specific niche can attract niche brands willing to pay $100-500 per placement. Do not wait to be approached — create a simple media kit and pitch brands you already use and love.' },
    { q: 'How does this compare to ad network revenue?', a: 'Direct sponsorships pay 3-10x more than programmatic ads. YouTube AdSense pays roughly $2-5 CPM, while direct sponsorship deals on YouTube can fetch $15-30 CPM. Similarly, newsletter ad networks like Paved pay $15-25 CPM, while direct deals reach $40-60 CPM. Building direct brand relationships is always more profitable than relying on ad networks alone.' },
  ],
  howToUse: [
    'Enter your monthly downloads or listens for podcast/YouTube content.',
    'Enter your email subscriber count for newsletter-based sponsorship value.',
    'Enter your total social media followers across platforms.',
    'Select your primary content type to apply the correct CPM rate.',
    'Review the estimated per-placement, monthly, and annual sponsorship revenue.',
    'Scroll down to compare how sponsorship income scales at different audience sizes.',
  ],
};

registerEngine(engine);
