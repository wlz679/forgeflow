import type { ToolEngine } from './types';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-seo-title-analyzer',
  title: 'YouTube SEO Title Analyzer',
  description: 'Score your title for SEO effectiveness with improvement tips.',
  category: 'D',
  inputs: [
    { name: 'title', label: 'Your Video Title', placeholder: 'e.g. My Trip to Japan 2026', type: 'text' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var title=inputs.title||''; var score=5; var feedback=[]; var len=title.length; if(len<20){score-=2;feedback.push('Too short \\u2014 add more detail (target 40-60 chars).');}else if(len>70){score-=1;feedback.push('Slightly long \\u2014 try under 60 chars for full display.');}else{score+=2;feedback.push('Great length \\u2014 fits perfectly in search results.');} if(/\\d/.test(title)){score+=1;feedback.push('Contains a number \\u2014 boosts CTR!');}else{score-=1;feedback.push('Add a number to increase click-through rate.');} if(/[!?]/.test(title)){score+=1;feedback.push('Emotional punctuation adds intrigue.');}else{score-=1;feedback.push('Consider adding ! or ? for emotional impact.');} var powerWords=['secret','truth','shocking','viral','ultimate','best','worst','amazing','insane','you','this','why','how','new','free','easy','proven']; var used=powerWords.filter(function(w){return title.toLowerCase().indexOf(w)!==-1}); if(used.length>0){score+=used.length;feedback.push('Power words: '+used.join(', '));}else{score-=1;feedback.push('Add power words like \\"Ultimate\\", \\"Secret\\", or \\"Proven\\".');} score=Math.max(1,Math.min(10,score)); var emoji=score>=7?'\\u2705':score>=4?'\\u26a0\\ufe0f':'\\u274c'; return [emoji+' Score: '+score+'/10\\n\\nFeedback:\\n'+feedback.map(function(f){return '\\u2022 '+f}).join('\\n')];`,
  },
  generate(inputs) {
    const title = inputs.title || '';
    let score = 5;
    const feedback: string[] = [];
    const len = title.length;
    if (len < 20) { score -= 2; feedback.push('Too short — add more detail (target 40-60 chars).'); }
    else if (len > 70) { score -= 1; feedback.push('Slightly long — try under 60 chars for full display.'); }
    else { score += 2; feedback.push('Great length — fits perfectly in search results.'); }
    if (/\d/.test(title)) { score += 1; feedback.push('Contains a number — boosts CTR!'); }
    else { score -= 1; feedback.push('Add a number to increase click-through rate.'); }
    if (/[!?]/.test(title)) { score += 1; feedback.push('Emotional punctuation adds intrigue.'); }
    else { score -= 1; feedback.push('Consider adding ! or ? for emotional impact.'); }
    const powerWords = ['secret', 'truth', 'shocking', 'viral', 'ultimate', 'best', 'worst', 'amazing', 'insane', 'you', 'this', 'why', 'how', 'new', 'free', 'easy', 'proven'];
    const used = powerWords.filter(w => title.toLowerCase().includes(w));
    if (used.length > 0) { score += used.length; feedback.push(`Power words: ${used.join(', ')}`); }
    else { score -= 1; feedback.push('Add power words like "Ultimate", "Secret", or "Proven".'); }
    score = Math.max(1, Math.min(10, score));
    const emoji = score >= 7 ? '✅' : score >= 4 ? '⚠️' : '❌';
    return [`${emoji} Score: ${score}/10\n\nFeedback:\n${feedback.map(f => '• ' + f).join('\n')}`];
  },
  staticExamples: [
    '⚠️ Score: 4/10\n\nFeedback:\n• Too short — add more detail (target 40-60 chars).\n• Add a number to increase click-through rate.\n• Add power words like "Ultimate", "Secret", or "Proven".',
  ],
  faq: [
    { q: 'What is a good SEO score?', a: '7+/10 is strong. Our analysis checks length, numbers, emotional punctuation, and power words — all proven CTR boosters.' },
    { q: 'How accurate is this score?', a: 'It uses proven SEO heuristics. No automated score is perfect, but this gives you a solid baseline.' },
  ],
  howToUse: [
    'Enter your title.',
    'Click "Analyze".',
    'Review your score and feedback.',
    'Apply suggestions to improve your title.',
    'Re-analyze after changes.',
  ],
};
registerEngine(engine);
