# AgentMeter Hardware Links and GitHub CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add trustworthy non-affiliate hardware purchase links and two prominent, reusable GitHub-star calls to action to the AgentMeter article.

**Architecture:** The article keeps purchase guidance in its Markdown content and exposes its repository through optional blog frontmatter. A server-rendered Astro component owns the CTA presentation, while the shared blog layout renders it below the featured image and after the article body only when repository metadata exists. A Node test builds the real site and asserts against the generated AgentMeter HTML.

**Tech Stack:** Astro 7 content collections, Markdown, Tailwind CSS 4, React-rendered brand icons, Node.js built-in test runner.

## Global Constraints

- Use the exact Waveshare URL `https://www.waveshare.com/esp32-s3-touch-amoled-2.16.htm`.
- Use the exact AliExpress URL `https://www.aliexpress.com/item/1005012589432425.html`.
- Show the subtle disclosure “Direct, non-affiliate links. Prabhava Labs does not earn from purchases.”
- Do not display price, stock, affiliate tracking, or seller-endorsement claims.
- Tell readers to confirm the ESP32-S3 2.16-inch model before ordering.
- Use the exact AgentMeter repository URL `https://github.com/prabhavalabs/agentmeter`.
- Render the CTA twice for AgentMeter: below the featured image and after the article body.
- CTA copy: “AgentMeter is built in the open. If the project is useful or interesting, give it a star on GitHub.”
- CTA button label: “Star AgentMeter on GitHub”.
- External CTA and purchase links open in a new tab with `rel="noreferrer"`.
- At `md` and above, CTA copy and button sit side by side; below `md`, they stack and the button is full width.
- Add no new runtime or test dependencies.

## File Structure

- Create `src/content/blog/building-agentmeter-page.test.js`: build-and-inspect regression tests for the published AgentMeter HTML.
- Create `src/components/ArticleRepositoryCta.astro`: reusable server-rendered repository CTA.
- Modify `src/content/blog/building-agentmeter.md`: repository metadata, purchase resources, model warning, and disclosure.
- Modify `src/content.config.ts`: optional blog `repo` URL field.
- Modify `src/pages/blog/[slug].astro`: conditional top and bottom CTA placement.

---

### Task 1: Publish the hardware purchase resources

**Files:**
- Create: `src/content/blog/building-agentmeter-page.test.js`
- Modify: `src/content/blog/building-agentmeter.md:338-352`

**Interfaces:**
- Consumes: Astro’s existing `npm run build` output at `dist/blog/building-agentmeter/index.html`.
- Produces: two exact external purchase anchors and the subtle non-affiliate disclosure in the rendered article.

- [ ] **Step 1: Write the failing rendered-content test**

Create `src/content/blog/building-agentmeter-page.test.js`:

```js
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
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
node --test src/content/blog/building-agentmeter-page.test.js
```

Expected: both tests fail because neither purchase URL nor the disclosure exists in the rendered article.

- [ ] **Step 3: Add the purchase guidance immediately after the requirements list**

Insert this content after the four-item list under `## Building your own`:

```md
### Where to get the hardware

AgentMeter targets the exact Waveshare ESP32-S3-Touch-AMOLED-2.16 board. Closely
related Waveshare displays use different controllers and pin maps, so confirm
the listing names the ESP32-S3 2.16-inch model before ordering.

<ul>
  <li><a href="https://www.waveshare.com/esp32-s3-touch-amoled-2.16.htm" target="_blank" rel="noreferrer">Buy directly from Waveshare</a></li>
  <li><a href="https://www.aliexpress.com/item/1005012589432425.html" target="_blank" rel="noreferrer">View the AliExpress listing</a></li>
</ul>

<p><small class="text-white/45">Direct, non-affiliate links. Prabhava Labs does not earn from purchases.</small></p>
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```bash
node --test src/content/blog/building-agentmeter-page.test.js
```

Expected: 2 tests pass and 0 fail.

- [ ] **Step 5: Commit the hardware resources**

```bash
git add src/content/blog/building-agentmeter-page.test.js src/content/blog/building-agentmeter.md
git commit -m "docs(agentmeter): add non-affiliate hardware links"
```

---

### Task 2: Add the reusable repository CTA

**Files:**
- Create: `src/components/ArticleRepositoryCta.astro`
- Modify: `src/content/blog/building-agentmeter-page.test.js`
- Modify: `src/content/blog/building-agentmeter.md:1-13`
- Modify: `src/content.config.ts:25-45`
- Modify: `src/pages/blog/[slug].astro:1-145`

**Interfaces:**
- Consumes: blog frontmatter field `repo?: URL`, article `title: string`, and `GitHubMark` from `src/components/BrandIcons.tsx`.
- Produces: `ArticleRepositoryCta` with props `{ repo: string; title: string; class?: string }`; conditional top and bottom CTA placements.

- [ ] **Step 1: Add the failing CTA regression test**

Append to `src/content/blog/building-agentmeter-page.test.js`:

```js
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
```

- [ ] **Step 2: Run only the CTA test and confirm RED**

Run:

```bash
node --test --test-name-pattern="GitHub star" src/content/blog/building-agentmeter-page.test.js
```

Expected: the CTA test fails with `0 !== 2`; the hardware tests are skipped by the name filter.

- [ ] **Step 3: Add repository metadata to the blog schema and AgentMeter frontmatter**

Add this optional field to the blog schema in `src/content.config.ts`:

```ts
repo: z.url().optional(),
```

Add this field beneath `category` in AgentMeter frontmatter:

```yaml
repo: 'https://github.com/prabhavalabs/agentmeter'
```

- [ ] **Step 4: Create the reusable CTA component**

Create `src/components/ArticleRepositoryCta.astro`:

```astro
---
import { ArrowUpRight, Star } from 'lucide-react';
import { GitHubMark } from './BrandIcons';

interface Props {
  repo: string;
  title: string;
  class?: string;
}

const { repo, title, class: className = '' } = Astro.props;
const projectName = title.split(':', 1)[0];
---

<aside
  data-repository-cta
  aria-label={`${projectName} repository`}
  class:list={[
    'liquid-glass relative flex flex-col gap-6 rounded-3xl border border-violet-300/20 p-6 md:flex-row md:items-center md:justify-between md:p-8',
    className,
  ]}
>
  <div class="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-violet-400/10 blur-3xl"></div>
  <div class="relative flex items-start gap-4">
    <span class="mt-1 inline-flex shrink-0 rounded-full border border-white/15 bg-white/[0.04] p-3 text-white/80">
      <GitHubMark size={20} />
    </span>
    <span>
      <span class="block text-[0.65rem] font-medium uppercase tracking-[0.3em] text-violet-200/70">Open source</span>
      <span class="font-serif-display mt-1 block text-2xl leading-tight text-white">{projectName} is built in the open.</span>
      <span class="mt-2 block max-w-md text-sm leading-relaxed text-white/60">If the project is useful or interesting, give it a star on GitHub.</span>
    </span>
  </div>

  <a
    href={repo}
    target="_blank"
    rel="noreferrer"
    aria-label={`Star ${projectName} on GitHub`}
    class="relative inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] md:w-auto"
    style="color: #000; text-decoration: none;"
  >
    <Star size={16} /> Star {projectName} on GitHub <ArrowUpRight size={15} />
  </a>
</aside>
```

- [ ] **Step 5: Render the CTA twice when repository metadata exists**

Import the component in `src/pages/blog/[slug].astro`:

```astro
import ArticleRepositoryCta from '../../components/ArticleRepositoryCta.astro';
```

Place the top CTA after the featured-image figure:

```astro
{d.repo && d.image && (
  <ArticleRepositoryCta repo={d.repo} title={d.title} class="mb-14" />
)}
```

Place the bottom CTA immediately after `<Content />`:

```astro
{d.repo && (
  <ArticleRepositoryCta repo={d.repo} title={d.title} class="mt-14" />
)}
```

- [ ] **Step 6: Run the focused CTA test and confirm GREEN**

Run:

```bash
node --test --test-name-pattern="GitHub star" src/content/blog/building-agentmeter-page.test.js
```

Expected: 1 CTA test passes, 2 hardware tests are skipped, and 0 tests fail.

- [ ] **Step 7: Run all article regression tests and Astro diagnostics**

Run:

```bash
node --test src/content/blog/building-agentmeter-page.test.js
npm run check
```

Expected: 3 tests pass; Astro reports 0 errors, 0 warnings, and 0 hints.

- [ ] **Step 8: Commit the reusable CTA**

```bash
git add src/components/ArticleRepositoryCta.astro src/content/blog/building-agentmeter-page.test.js src/content/blog/building-agentmeter.md src/content.config.ts 'src/pages/blog/[slug].astro'
git commit -m "feat(blog): add repository star calls to action"
```

---

### Task 3: Complete browser and quality verification

**Files:**
- Verify: `src/components/ArticleRepositoryCta.astro`
- Verify: `src/content/blog/building-agentmeter.md`
- Verify: `src/pages/blog/[slug].astro`
- Verify: `src/content/blog/building-agentmeter-page.test.js`

**Interfaces:**
- Consumes: local route `http://127.0.0.1:4321/blog/building-agentmeter/` and the finished build/test scripts.
- Produces: desktop and 390-pixel mobile evidence that the article links and both CTA placements work without layout or runtime regressions.

- [ ] **Step 1: Run the complete quality gate**

Run:

```bash
npm run quality
git diff --check
```

Expected: Astro diagnostics pass, all Node tests pass, 43 pages build successfully, and `git diff --check` prints nothing.

- [ ] **Step 2: Start the exact local site**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Astro reports `http://127.0.0.1:4321/`.

- [ ] **Step 3: Verify desktop rendering in the available Browser plugin**

Test flow: `/blog/building-agentmeter/` → featured image → first repository CTA → “Building your own” purchase links → bottom repository CTA.

Assert all of the following against rendered DOM and computed layout:

```text
page title contains “AgentMeter”
meaningful DOM contains “Building your own”
aria-label “Star AgentMeter on GitHub” count is 2
Waveshare purchase href count is 1
AliExpress purchase href count is 1
both CTA anchors have target="_blank" and rel="noreferrer"
both purchase anchors have target="_blank" and rel="noreferrer"
the subtle non-affiliate disclosure is visible
no Astro/Vite framework overlay exists
no relevant application console errors or warnings exist
```

Focus one CTA button with the keyboard and confirm the site’s visible global focus outline appears. Capture a viewport screenshot showing the top CTA and another showing the hardware links/bottom CTA.

- [ ] **Step 4: Verify the 390 × 844 mobile layout**

Set the Browser viewport to 390 × 844, reload, and verify:

```text
documentElement.scrollWidth <= window.innerWidth
CTA copy and button stack vertically
CTA button spans the available card width
purchase links and disclosure wrap without clipping
both CTA placements remain visible and readable
```

Capture a mobile screenshot, then reset the viewport override.

- [ ] **Step 5: Review final repository state**

Run:

```bash
git status --short
git log -4 --oneline --decorate
```

Expected: no uncommitted implementation changes remain; the hardware-links and repository-CTA commits are the newest implementation commits after the approved spec commits.

If browser QA required any correction, repeat the relevant red-green test, run `npm run quality`, and commit only the correction with a focused conventional commit message before declaring completion.
