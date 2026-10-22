// Fixture engine — engineKey: true makes the gate check its
// input / faq / how_to_use keys against the locale files.
export const engine = {
  slug: 'test-engine',
  engineKey: true,
  title: 'Test Engine',
  description: 'A fixture engine.',
  inputs: [{ name: 'amount', label: 'Amount', placeholder: 'e.g. 1000' }],
  faq: [{ q: 'What is this?', a: 'A fixture question.' }],
  howToUse: ['First step.', 'Second step.'],
};
