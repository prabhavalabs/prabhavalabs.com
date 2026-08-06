import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const articlePath = resolve(projectRoot, 'dist/blog/building-agentmeter/index.html');
const longNameFixtureSourcePath = resolve(
  projectRoot,
  'src/pages/repository-cta-long-name-regression.astro'
);
const longNameFixtureOutputPath = resolve(
  projectRoot,
  'dist/repository-cta-long-name-regression/index.html'
);
const longProjectName =
  'ExtraordinarilyLongUnbrokenRepositoryNameThatMustRemainInsideItsResponsiveCard';
let articleHtml = '';
let longNameFixtureHtml = '';

before(() => {
  writeFileSync(
    longNameFixtureSourcePath,
    `---\nimport ArticleRepositoryCta from '../components/ArticleRepositoryCta.astro';\n---\n<ArticleRepositoryCta repo="https://github.com/prabhavalabs/long-name-regression" title="${longProjectName}: Responsive layout regression" />\n`
  );

  try {
    execFileSync('npm', ['run', 'build'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    articleHtml = readFileSync(articlePath, 'utf8');
    longNameFixtureHtml = readFileSync(longNameFixtureOutputPath, 'utf8');
  } finally {
    rmSync(longNameFixtureSourcePath, { force: true });
  }
});

function openingTags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'g'))].map(
    ([tag]) => tag
  );
}

function classTokens(tag) {
  return new Set(tag.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) ?? []);
}

function anchorsFor(href, html = articleHtml) {
  return openingTags(html, 'a').filter((tag) =>
    tag.includes(`href="${href}"`)
  );
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

  const disclosure = openingTags(articleHtml, 'small').find((tag) =>
    tag.includes('text-white/50')
  );
  assert.ok(disclosure, 'expected the disclosure to use AA-safe muted contrast');
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

test('uses semantic CTA headings without duplicate complementary landmarks', () => {
  assert.equal(
    openingTags(articleHtml, 'div').filter((tag) =>
      tag.includes('data-repository-cta')
    ).length,
    2
  );
  assert.equal(
    openingTags(articleHtml, 'aside').filter((tag) =>
      tag.includes('data-repository-cta')
    ).length,
    0
  );
  assert.equal(
    (articleHtml.match(/<h2\b[^>]*>AgentMeter is built in the open\.<\/h2>/g) ?? [])
      .length,
    2
  );
});

test('keeps a long project name shrinkable and wrappable at responsive widths', () => {
  const cta = ['div', 'aside']
    .flatMap((tagName) => openingTags(longNameFixtureHtml, tagName))
    .find((tag) => tag.includes('data-repository-cta'));
  assert.ok(cta, 'expected the real Astro component to render');
  const ctaClasses = classTokens(cta);
  assert.ok(ctaClasses.has('flex'));
  assert.ok(ctaClasses.has('flex-col'));
  assert.ok(ctaClasses.has('md:flex-row'));

  const copy = openingTags(longNameFixtureHtml, 'div').find((tag) => {
    const classes = classTokens(tag);
    return classes.has('items-start') && classes.has('gap-4');
  });
  assert.ok(copy, 'expected the CTA copy flex child');
  assert.ok(
    classTokens(copy).has('min-w-0'),
    'expected the CTA copy flex child to shrink within the card'
  );

  const button = anchorsFor(
    'https://github.com/prabhavalabs/long-name-regression',
    longNameFixtureHtml
  )[0];
  assert.ok(button, 'expected the long-name repository button');
  const buttonClasses = classTokens(button);
  assert.ok(buttonClasses.has('w-full'));
  assert.ok(buttonClasses.has('md:w-auto'));
  assert.ok(buttonClasses.has('min-w-0'));
  assert.ok(buttonClasses.has('max-w-full'));
  assert.equal(buttonClasses.has('shrink-0'), false);

  const wrappingLabel = openingTags(longNameFixtureHtml, 'span').find((tag) => {
    const classes = classTokens(tag);
    return classes.has('min-w-0') && classes.has('[overflow-wrap:anywhere]');
  });
  assert.ok(
    wrappingLabel,
    'expected the long button label to wrap instead of widening the card'
  );
  assert.match(longNameFixtureHtml, new RegExp(`>${longProjectName} is built`));
});
