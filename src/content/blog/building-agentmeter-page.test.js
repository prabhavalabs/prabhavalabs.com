import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const articlePath = resolve(projectRoot, 'dist/blog/building-agentmeter/index.html');
let articleHtml = '';

before(() => {
  execFileSync('npm', ['run', 'build'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  articleHtml = readFileSync(articlePath, 'utf8');
});

function anchorsFor(href) {
  return [...articleHtml.matchAll(/<a\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => tag.includes(`href="${href}"`));
}

test('publishes both exact board purchase links as new-tab resources', () => {
  const purchaseUrls = [
    'https://www.waveshare.com/esp32-s3-touch-amoled-2.16.htm',
    'https://www.aliexpress.com/item/1005012589432425.html',
  ];

  for (const url of purchaseUrls) {
    const anchors = anchorsFor(url);
    assert.equal(anchors.length, 1, `expected one purchase link for ${url}`);
    assert.match(anchors[0], /target="_blank"/);
    assert.match(anchors[0], /rel="noreferrer"/);
  }
});

test('discloses that the hardware links are non-affiliate', () => {
  assert.match(
    articleHtml,
    /Direct, non-affiliate links\. Prabhava Labs does not earn from purchases\./
  );
});

test('renders two accessible AgentMeter GitHub star calls to action', () => {
  const ctaAnchors = [...articleHtml.matchAll(
    /<a\b[^>]*aria-label="Star AgentMeter on GitHub"[^>]*>/g
  )].map(([tag]) => tag);

  assert.equal(ctaAnchors.length, 2);
  for (const anchor of ctaAnchors) {
    assert.match(anchor, /href="https:\/\/github\.com\/prabhavalabs\/agentmeter"/);
    assert.match(anchor, /target="_blank"/);
    assert.match(anchor, /rel="noreferrer"/);
  }

  assert.equal(
    (articleHtml.match(/AgentMeter is built in the open\./g) ?? []).length,
    2
  );
});
