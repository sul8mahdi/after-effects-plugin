/*
 * try-smart-motion.mjs — live Smart Motion adapter (Phase 5).
 *
 * Assembles the system + user prompt from ai/prompts + ai/vocabulary.json and a
 * real icon report, calls Claude with structured output, and VALIDATES the
 * result against the schema/vocabulary before printing. Provider-swappable: the
 * default is Claude (claude-opus-5); swap this one file to change providers.
 *
 * Usage:
 *   npm i @anthropic-ai/sdk
 *   export ANTHROPIC_API_KEY=sk-ant-...        # or: ant auth login
 *   node ai/try-smart-motion.mjs ai/examples/wifi.input.json
 *
 * Privacy (brief §12): only the abstract report you pass is sent — no AE
 * project, no file names, no organization data.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadVocabulary, validateSuggestions } from './validate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function read(p) { return fs.readFileSync(p, 'utf8'); }

function buildUserMessage(reportJson, vocab, opts) {
  let tpl = read(path.join(here, 'prompts', 'smart-motion.user.md'));
  return tpl
    .replace('{{ICON_REPORT_JSON}}', JSON.stringify(reportJson, null, 2))
    .replace('{{SIMPLIFIED_SVG_OR_EMPTY}}', opts.svg || '')
    .replace('{{VOCABULARY_JSON}}', JSON.stringify(vocab, null, 2))
    .replace('{{MAX_DURATION_S}}', String(opts.maxDuration || 4))
    .replace('{{REQUIRED_STYLE_OR_ANY}}', opts.style || 'any')
    .replace('{{LOOP_PREFERENCE}}', opts.loop || 'either');
}

// Minimal JSON Schema for structured output (draft-07 subset the API accepts).
const SCHEMA = JSON.parse(read(path.join(here, 'schema', 'suggestions.schema.json')));

async function main() {
  const inputPath = process.argv[2] || path.join(here, 'examples', 'wifi.input.json');
  const report = JSON.parse(read(inputPath));
  const vocab = loadVocabulary();
  const system = read(path.join(here, 'prompts', 'smart-motion.system.md'));
  const user = buildUserMessage(report, vocab, { maxDuration: 4, style: 'any', loop: 'either' });

  let Anthropic;
  try {
    Anthropic = (await import('@anthropic-ai/sdk')).default;
  } catch (e) {
    console.error('Install the SDK first:  npm i @anthropic-ai/sdk');
    process.exit(2);
  }

  // Zero-arg client resolves ANTHROPIC_API_KEY or an `ant auth login` profile.
  const client = new Anthropic();

  let raw;
  try {
    const res = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4096,
      system: system,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: user }]
    });
    raw = res.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
  } catch (e) {
    console.error('API call failed:', e && e.message ? e.message : e);
    console.error('If this is an auth error, set ANTHROPIC_API_KEY or run `ant auth login`.');
    process.exit(1);
  }

  let output;
  try { output = JSON.parse(raw); }
  catch (e) { console.error('Model did not return valid JSON:\n', raw); process.exit(1); }

  const allowedParts = Array.isArray(report.parts) ? report.parts.map(function (p) { return p.id; }) : null;
  const v = validateSuggestions(output, vocab, allowedParts);
  console.log(JSON.stringify(output, null, 2));
  if (!v.ok) {
    console.error('\n✗ validation failed:\n  ' + v.problems.join('\n  '));
    process.exit(1);
  }
  console.log('\n✓ valid & executable (schema + vocabulary' + (allowedParts ? ' + parts' : '') + ')');
}

main();
