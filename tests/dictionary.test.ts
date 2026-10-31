import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';

it('bundles the pinned, sorted, licensed dictionary and verified filtering probes', () => {
  const content = readFileSync(new URL('../public/words.txt', import.meta.url));
  const metadata = JSON.parse(readFileSync(new URL('../public/dictionary-metadata.json', import.meta.url), 'utf8'));
  const words: string[] = content.toString('ascii').trimEnd().split('\n');
  expect(metadata.size).toBe(80);
  expect(words.length).toBe(196726);
  expect(words.length).toBe(metadata.word_count);
  expect(words).toEqual([...new Set(words)].sort());
  expect(words.every(word => /^[a-z]+$/.test(word))).toBe(true);
  expect(createHash('sha256').update(content).digest('hex')).toBe(metadata.sha256);
  for (const word of metadata.included_probes) expect(words).toContain(word);
  for (const word of metadata.excluded_probes) expect(words).not.toContain(word);
  for (const word of ['zyzzyva', 'zaxes', 'qat', 'qats', 'abaser', 'abasers']) {
    expect(words).toContain(word);
  }
  const license = readFileSync(new URL('../public/dictionary-license.txt', import.meta.url));
  expect(createHash('sha256').update(license).digest('hex')).toBe(metadata.copyright_sha256);
});
