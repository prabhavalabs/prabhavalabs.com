# AgentMeter hardware links and GitHub CTA design

## Goal

Make the AgentMeter article more useful to readers who want to build the project and make the open-source repository difficult to miss, without turning the article into a sales page.

## Scope

- Add two direct purchase links for the exact Waveshare ESP32-S3-Touch-AMOLED-2.16 board used by AgentMeter.
- State quietly that the links are non-affiliate and do not earn money for Prabhava Labs.
- Show a prominent GitHub-star call to action below the featured image and again after the article body.
- Keep the CTA reusable for future blog posts with repositories.

Out of scope: affiliate tracking, price display, stock checks, seller endorsements, a store, analytics, or changes to the AgentMeter repository.

## Content design

The existing “Building your own” section will gain a short “Where to get the hardware” subsection immediately after the requirements list. It will link to:

1. The official Waveshare product page: `https://www.waveshare.com/esp32-s3-touch-amoled-2.16.htm`
2. The supplied AliExpress listing: `https://www.aliexpress.com/item/1005012589432425.html`

The links will be described as purchase options, not endorsements. A muted line beneath them will read: “Direct, non-affiliate links. Prabhava Labs does not earn from purchases.” The text will also remind readers to confirm the listing names the ESP32-S3 2.16-inch model, because closely related Waveshare boards use different controllers and pin maps.

The repository CTA will use this message:

- Eyebrow: “Open source”
- Heading: “AgentMeter is built in the open.”
- Body: “If the project is useful or interesting, give it a star on GitHub.”
- Button: “Star AgentMeter on GitHub”

## Architecture

Add an optional `repo` URL to the blog content schema. AgentMeter’s frontmatter will set it to `https://github.com/prabhavalabs/agentmeter`.

Create a server-rendered Astro component for the repository CTA. It will accept the repository URL and article title, render the existing Prabhava Labs GitHub mark, and expose one clear external link. The blog article layout will render the component only when `repo` exists:

- once immediately after the featured-image figure;
- once immediately after the rendered article content.

This keeps repository metadata in content, presentation in a component, and placement in the shared article layout. Posts without a repository remain unchanged.

## Visual and interaction design

The CTA will use the site’s restrained dark glass treatment, subtle violet border/glow, rounded corners, serif display heading, and muted supporting text. At the `md` breakpoint and above, the copy and button will sit side by side. Below `md`, they will stack and the button will become a full-width tap target. It must remain visually distinct from prose without resembling an advertisement.

External links will open in a new tab with `rel="noreferrer"`. The button will have an accessible label that includes the project name and GitHub destination. Keyboard focus will use the site’s existing visible focus treatment.

## Failure and edge cases

- Missing `repo`: render no CTA and preserve the current article layout.
- Missing featured image: skip the top placement; the bottom CTA still renders.
- Long project titles: allow wrapping without clipping or horizontal overflow.
- Purchase availability or price changes: do not display price or availability claims.
- AliExpress page details cannot be guaranteed: describe it only as the supplied listing and tell readers to verify the exact model before ordering.

## Verification

- Add a failing content/layout regression check before implementation that requires AgentMeter to expose the repository CTA twice and both purchase destinations once the feature exists.
- Run `npm run quality` after implementation.
- Render `/blog/building-agentmeter/` locally and verify page identity, meaningful content, no framework overlay, and no relevant console warnings or errors.
- On desktop and a 390-pixel mobile viewport, verify two GitHub CTAs, both exact purchase URLs, readable disclosure text, no clipping or horizontal overflow, and visible keyboard focus.
- Exercise a GitHub CTA and a purchase link far enough to confirm their `href`, new-tab behavior, and accessible labels without completing any purchase or transmitting personal data.
