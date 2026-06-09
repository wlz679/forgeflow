import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

const PROVIDERS: Record<string, { perImage: number; isSub: boolean; subRange: string; name: string }> = {
  'dall-e-3': { perImage: 0.08, isSub: false, subRange: '', name: 'DALL-E 3' },
  'dall-e-2': { perImage: 0.02, isSub: false, subRange: '', name: 'DALL-E 2' },
  'midjourney': { perImage: 0, isSub: true, subRange: '$10-$60/mo', name: 'Midjourney' },
  'stable-diffusion': { perImage: 0.005, isSub: false, subRange: '', name: 'Stable Diffusion (API)' },
};

function calculate(inputs: Record<string, string>): string[] {
  const p = PROVIDERS[inputs.provider || 'dall-e-3'] || PROVIDERS['dall-e-3'];
  const imgs = parseInt(inputs.imagesPerMonth) || 100;
  const fmt = (n: number) => '$' + n.toFixed(2);
  const results: string[] = [];
  if (p.isSub) {
    results.push(
      '🎨 ' + p.name + ' Cost Estimate\n\n' +
      '• Images per month: ' + imgs.toLocaleString() + '\n' +
      '• Pricing model: Subscription (' + p.subRange + ')\n' +
      '• Estimated monthly cost: $10-$60 (depends on plan tier)\n\n' +
      '💡 Midjourney charges a flat subscription, not per image. Higher tiers include more GPU hours and faster generations.',
    );
  } else {
    const mc = imgs * p.perImage;
    results.push(
      '🎨 ' + p.name + ' Cost Estimate\n\n' +
      '• Images per month: ' + imgs.toLocaleString() + '\n' +
      '• Price per image: ' + fmt(p.perImage) + '\n' +
      '• Monthly cost: ' + fmt(mc) + '\n' +
      '• Annual cost: ' + fmt(mc * 12) + '\n\n' +
      '💡 ' + p.name + ' charges per image generated, regardless of resolution.',
    );
  }
  [50, 250, 500, 2000, 10000].forEach(s => {
    const cost = p.isSub ? (s <= 200 ? 10 : s <= 1000 ? 30 : 60) : s * p.perImage;
    results.push(s.toLocaleString() + ' images/month → ' + (p.isSub ? '~' : '') + fmt(cost) + '/month');
  });
  return results;
}

const customFn =
  "var ps={de3:{pi:0.08,s:false,n:'DALL-E 3'},de2:{pi:0.02,s:false,n:'DALL-E 2'},mj:{pi:0,s:true,n:'Midjourney'},sd:{pi:0.005,s:false,n:'Stable Diffusion (API)'}};" +
  "var p=ps[inputs.provider||'dall-e-3']||ps.de3;var im=parseInt(inputs.imagesPerMonth)||100;" +
  "function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}" +
  "var r=[];" +
  "if(p.s){r.push('\\uD83C\\uDFA8 '+p.n+' Cost Estimate\\n\\n\\u2022 Images per month: '+lc(im)+'\\n\\u2022 Pricing model: Subscription ($10-$60/mo)\\n\\u2022 Estimated monthly cost: $10-$60\\n\\n\\uD83D\\uDCA1 Midjourney charges a flat subscription, not per image.');}" +
  "else{var mc=im*p.pi;r.push('\\uD83C\\uDFA8 '+p.n+' Cost Estimate\\n\\n\\u2022 Images per month: '+lc(im)+'\\n\\u2022 Price per image: '+fm(p.pi)+'\\n\\u2022 Monthly cost: '+fm(mc)+'\\n\\u2022 Annual cost: '+fm(mc*12)+'\\n\\n\\uD83D\\uDCA1 '+p.n+' charges per image generated.');}" +
  "[50,250,500,2000,10000].forEach(function(s){var c=p.s?(s<=200?10:s<=1e3?30:60):s*p.pi;r.push(lc(s)+' images/month \\u2192 '+(p.s?'~':'')+fm(c)+'/month');});" +
  "return r;";

const engine: ToolEngine = {
  slug: 'solopreneur-ai-image-cost-calculator',
  title: 'AI Image Generation Cost Calculator',
  description: 'Estimate costs for AI image generation across DALL-E 3, DALL-E 2, Midjourney, and Stable Diffusion. Compare per-image vs subscription pricing.',
  category: 'B',
  inputs: [
    { name: 'provider', label: 'Provider', placeholder: '', type: 'select', options: ['dall-e-3', 'dall-e-2', 'midjourney', 'stable-diffusion'] },
    { name: 'imagesPerMonth', label: 'Images per Month', placeholder: 'e.g. 100', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🎨 DALL-E 3 Cost Estimate\n\n• Images per month: 100\n• Price per image: $0.08\n• Monthly cost: $8.00\n• Annual cost: $96.00\n\n💡 DALL-E 3 charges per image generated, regardless of resolution.',
    '50 images/month → $4.00/month',
    '250 images/month → $20.00/month',
    '500 images/month → $40.00/month',
    '2,000 images/month → $160.00/month',
  ],
  faq: [
    { q: 'Which AI image generator is cheapest?', a: 'Stable Diffusion via API is the cheapest at ~$0.005/image but requires more technical setup. DALL-E 2 at $0.02/image is the cheapest OpenAI option but lower quality. Midjourney at $10-60/month flat rate becomes cheapest at 200+ images/month.' },
    { q: 'Should I pay per image or use a subscription?', a: 'For under 200 images/month: pay per image (DALL-E). For 200-1000/month: Midjourney Basic ($10/mo). For 1000+/month: Midjourney Pro ($30-60/mo) or self-hosted Stable Diffusion. Subscriptions offer unlimited or high-volume relaxed generation.' },
    { q: 'Can I use AI-generated images commercially?', a: 'Yes, for all major platforms. DALL-E and Midjourney grant full commercial rights to generated images. Stable Diffusion models vary by license — check the specific model. Always review the latest terms of service.' },
    { q: 'What resolution should I choose?', a: 'DALL-E 3: 1024×1024 is standard, 1792×1024 for widescreen (same price). Midjourney: upscaling to 2048×2048 included in subscription. For web use, 1024×1024 is sufficient. For print, aim for higher resolutions or use AI upscaling tools.' },
    { q: 'How does Midjourney compare to DALL-E?', a: 'Midjourney is widely considered to produce more aesthetically pleasing and artistic images. DALL-E 3 excels at following complex text prompts and renders text more accurately within images. Midjourney requires learning prompt syntax; DALL-E is more intuitive.' },
  ],
  howToUse: [
    'Select your preferred AI image generation provider.',
    'Enter your estimated monthly image generation volume.',
    'Review cost estimates (per-image or subscription).',
    'Compare scenarios at different volume levels.',
    'Choose the provider that best fits your budget and quality needs.',
  ],
};

registerEngine(engine);
