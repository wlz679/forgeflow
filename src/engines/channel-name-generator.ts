import type { ToolEngine } from './types';
import { registerEngine } from './registry';

const wordPools = {
  adj: ['Epic', 'Savage', 'Cosmic', 'Urban', 'Wild', 'Zen', 'Turbo', 'Ultra', 'Neon', 'Pixel', 'Viral', 'Alpha', 'Quantum', 'Crispy', 'Slick'],
  noun: ['Studio', 'Lab', 'HQ', 'Vault', 'Den', 'Hub', 'Corner', 'Space', 'Network', 'Academy', 'Empire', 'Nation', 'Squad', 'Collective', 'Factory'],
  verb: ['Explores', 'Creates', 'Builds', 'Discovers', 'Reveals', 'Unboxes', 'Reviews'],
  color: ['Red', 'Blue', 'Green', 'Black', 'White', 'Gold', 'Silver', 'Neon'],
  name: ['Alex', 'Sam', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Jamie', 'Quinn', 'Avery'],
};

const creativeTemplates = [
  '{adj} {noun}',
  'The {adj} {noun}',
  '{noun} {verb}',
  '{adj} {niche} {noun}',
  '{color} {noun} {niche}',
];

const personalTemplates = [
  '{niche} with {name}',
  '{name} {verb}s',
  '{name} {niche}',
  'The {niche} {noun} by {name}',
  '{name} — {niche}',
];

const professionalTemplates = [
  '{niche} {noun}',
  '{adj} {niche} {noun}',
  '{noun} of {niche}',
  'The {niche} {noun}',
  '{niche} {noun} Official',
];

const funnyTemplates = [
  '{adj} {noun} {verb}s',
  'Not Another {niche} Channel',
  '{adj} {niche} Dude',
  'The {adj} {noun} of {niche}',
  'Oops I Did {niche} Again',
];

const shortTemplates = [
  '{noun}{niche}',
  '{adj}{noun}',
  '{color}{noun}',
  '{niche}ly',
  '{noun}ly {niche}',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function getTemplates(style: string): string[] {
  const all: string[] = [];
  if (style === 'All Styles' || style === 'Creative') all.push(...creativeTemplates);
  if (style === 'All Styles' || style === 'Personal') all.push(...personalTemplates);
  if (style === 'All Styles' || style === 'Professional') all.push(...professionalTemplates);
  if (style === 'All Styles' || style === 'Funny') all.push(...funnyTemplates);
  if (style === 'All Styles' || style === 'Short') all.push(...shortTemplates);
  return all;
}

function generateResults(inputs: Record<string, string>, count = 10): string[] {
  const style = inputs.style || 'All Styles';
  const niche = inputs.niche || 'your niche';
  const templates = getTemplates(style);
  const results: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (results.length < count && attempts < count * 20) {
    attempts++;
    const vars: Record<string, string> = {
      niche,
      adj: pick(wordPools.adj),
      noun: pick(wordPools.noun),
      verb: pick(wordPools.verb),
      color: pick(wordPools.color),
      name: pick(wordPools.name),
    };
    const result = fill(pick(templates), vars).trim();
    if (result && !seen.has(result)) {
      seen.add(result);
      results.push(result);
    }
  }
  return results;
}

const engine: ToolEngine = {
  slug: 'youtube-channel-name-generator',
  title: 'YouTube Channel Name Generator',
  description: 'Generate unique and memorable channel name ideas.',
  category: 'F',
  inputs: [
    { name: 'niche', label: 'Channel Niche', placeholder: 'e.g. tech reviews, gaming', type: 'text' },
    { name: 'style', label: 'Name Style', placeholder: '', type: 'select', options: ['Creative', 'Personal', 'Professional', 'Funny', 'Short'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn:
      "var style=inputs.style||'All Styles';var niche=inputs.niche||'your niche';" +
      "var adj=['Epic','Savage','Cosmic','Urban','Wild','Zen','Turbo','Ultra','Neon','Pixel','Viral','Alpha','Quantum','Crispy','Slick'];" +
      "var noun=['Studio','Lab','HQ','Vault','Den','Hub','Corner','Space','Network','Academy','Empire','Nation','Squad','Collective','Factory'];" +
      "var verb=['Explores','Creates','Builds','Discovers','Reveals','Unboxes','Reviews'];" +
      "var color=['Red','Blue','Green','Black','White','Gold','Silver','Neon'];" +
      "var name=['Alex','Sam','Jordan','Casey','Taylor','Morgan','Riley','Jamie','Quinn','Avery'];" +
      "var pk=function(a){return a[Math.floor(Math.random()*a.length)]};" +
      "var fl=function(t,v){return t.replace(/\\{(\\w+)\\}/g,function(_,k){return v[k]||'{'+k+'}';});};" +
      "var templates=[];" +
      "if(style==='All Styles'||style==='Creative'){templates.push('{adj} {noun}','The {adj} {noun}','{noun} {verb}','{adj} {niche} {noun}','{color} {noun} {niche}');}" +
      "if(style==='All Styles'||style==='Personal'){templates.push('{niche} with {name}','{name} {verb}s','{name} {niche}','The {niche} {noun} by {name}','{name} \\u2014 {niche}');}" +
      "if(style==='All Styles'||style==='Professional'){templates.push('{niche} {noun}','{adj} {niche} {noun}','{noun} of {niche}','The {niche} {noun}','{niche} {noun} Official');}" +
      "if(style==='All Styles'||style==='Funny'){templates.push('{adj} {noun} {verb}s','Not Another {niche} Channel','{adj} {niche} Dude','The {adj} {noun} of {niche}','Oops I Did {niche} Again');}" +
      "if(style==='All Styles'||style==='Short'){templates.push('{noun}{niche}','{adj}{noun}','{color}{noun}','{niche}ly','{noun}ly {niche}');}" +
      "var results=[];var seen={};for(var i=0;i<10;i++){" +
      "var v={niche:niche,adj:pk(adj),noun:pk(noun),verb:pk(verb),color:pk(color),name:pk(name)};" +
      "var r=fl(pk(templates),v).trim();if(r&&!seen[r]){seen[r]=1;results.push(r);}" +
      "}return results;",
  },
  generate(inputs: Record<string, string>): string[] {
    return generateResults(inputs);
  },
  staticExamples: ['Epic Studio', 'Tech Reviews with Alex', 'Tech Reviews Lab', 'Oops I Did Gaming Again', 'NeonHub'],
  faq: [
    { q: 'What makes a good YouTube channel name?', a: 'Short, memorable, easy to spell, and hints at your content. Avoid numbers and special characters.' },
    { q: 'Should I use my real name?', a: 'Personal brand channels benefit from real names. Niche channels often do better with descriptive names.' },
  ],
  howToUse: [
    'Enter your niche.',
    'Select a name style.',
    'Click Generate.',
    'Check availability on YouTube.',
    "Pick a name that's easy to remember and spell.",
  ],
};

registerEngine(engine);
