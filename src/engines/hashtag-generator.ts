import type { ToolEngine } from './types';
import { randomPickN } from './helpers';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-hashtag-generator',
  title: 'YouTube Hashtag Generator',
  description: 'Generate trending and niche-specific hashtags.',
  category: 'D',
  inputs: [
    { name: 'topic', label: 'Video Topic', placeholder: 'e.g. minecraft build tutorial', type: 'text' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var t=(inputs.topic||'video').replace(/\\s+/g,''); var broad=['#youtube','#video','#viral','#trending','#newvideo','#content','#creator','#subscribe','#like','#comment']; var niche=['#'+t,'#'+t+'video','#'+t+'community','#'+t+'love','#'+t+'tips','#'+t+'tutorial','#'+t+'2026','#'+t+'creator','#best'+t,'#'+t+'guide']; var lt=['#youtubegrowth','#growyourchannel','#youtubetips','#contentcreator','#smallyoutuber','#youtubeseo','#videomarketing','#youtubestrategy','#youtubealgorithm','#getmoreviews']; var all=broad.concat(niche).concat(lt); var results=[]; var used={}; while(results.length<10){var h=pick(all); if(!used[h]){used[h]=true;results.push(h)}} return [results.join(' ')];`,
  },
  generate(inputs) {
    const topic = (inputs.topic || 'video').replace(/\s+/g, '');
    const broad = ['#youtube', '#video', '#viral', '#trending', '#newvideo', '#content', '#creator', '#subscribe', '#like', '#comment'];
    const niche = [`#${topic}`, `#${topic}video`, `#${topic}community`, `#${topic}love`, `#${topic}tips`, `#${topic}tutorial`, `#${topic}2026`, `#${topic}creator`, `#best${topic}`, `#${topic}guide`];
    const longtail = ['#youtubegrowth', '#growyourchannel', '#youtubetips', '#contentcreator', '#smallyoutuber', '#youtubeseo', '#videomarketing', '#youtubestrategy', '#youtubealgorithm', '#getmoreviews'];
    return [randomPickN([...broad, ...niche, ...longtail], 10).join(' ')];
  },
  staticExamples: [
    "#youtube #minecraftbuild #minecraftbuildvideo #minecraftbuildcommunity #minecraftbuildtips #viral #trending #youtubetips #contentcreator #growyourchannel",
  ],
  faq: [
    { q: 'How many hashtags should I use?', a: 'YouTube shows the first 3 above your title. Use 3-5 per video.' },
    { q: 'Where should I put hashtags?', a: 'In the description. YouTube will display the first 3 above your video title.' },
  ],
  howToUse: [
    'Enter video topic.',
    'Click Generate.',
    'Copy hashtags.',
    'Paste into description.',
  ],
};
registerEngine(engine);
