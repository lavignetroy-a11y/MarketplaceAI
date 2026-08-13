/**
 * Which vision-capable models this OpenAI account can actually use.
 *
 *   npm run models
 *
 * Exists because the single highest-leverage setting in this whole system is OPENAI_TEXT_MODEL,
 * and the right value is an empirical question about one account on one day rather than something
 * that can be hardcoded. The default is gpt-4o, which is old: it plans the shots, reads the room,
 * writes the product lock and identifies the item, so every one of those is capped by it. Dropping
 * the same photograph into a current chat model and asking "what is this?" is a fair comparison,
 * and when the chat model wins, this is usually why.
 */
import { loadEnvConfig } from '@next/env';
import OpenAI from 'openai';

loadEnvConfig(process.cwd());

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('\n  No OPENAI_API_KEY found in .env.local\n');
    process.exit(1);
  }

  const list = await new OpenAI({ apiKey }).models.list();
  const ids = list.data.map((m) => m.id).sort();

  // Chat/vision families only. Embeddings, audio, moderation and the image models are all real
  // entries here and none of them can be OPENAI_TEXT_MODEL.
  const chat = ids.filter((id) => /^(gpt|o[1-9]|chatgpt)/.test(id))
    .filter((id) => !/(audio|realtime|transcribe|tts|embedding|moderation|image|search|instruct)/.test(id));

  console.log(`\n  Currently OPENAI_TEXT_MODEL = ${process.env.OPENAI_TEXT_MODEL || 'gpt-4o (default)'}`);
  console.log(`  Currently OPENAI_IMAGE_MODEL = ${process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1 (default)'}`);
  console.log(`\n  Chat/vision models available to this account (${chat.length}):\n`);
  chat.forEach((id) => console.log(`    ${id}`));

  console.log(`\n  Image models available:\n`);
  ids.filter((id) => id.includes('image') || id.startsWith('dall-e'))
    .forEach((id) => console.log(`    ${id}`));

  console.log(`
  Set the newest general-purpose vision model you see above in .env.local:

    OPENAI_TEXT_MODEL=<id>

  It drives planning, the scene lock, the product lock and identification -- four jobs where the
  model's judgment is the entire output. Re-run the same item afterwards and compare the PRODUCT
  LOCK block; that is where a better model shows up first and most visibly.
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
