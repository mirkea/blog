# Image gallery + lightbox

Inline multi-image galleries and click-to-zoom lightboxes for blog post images. Built on [Swiper](https://swiperjs.com/) (`swiper/react`).

## Components

| File | Role |
|---|---|
| [`src/components/ImageGallery.tsx`](../src/components/ImageGallery.tsx) | Row of images in one post (3-across on desktop, 1.5 peek on mobile). Click a thumb → lightbox. |
| [`src/components/Lightbox.tsx`](../src/components/Lightbox.tsx) | Shared full-screen zoomable overlay. Used by both `ImageGallery` and `MarkdownImageLightbox`. |
| [`src/components/MarkdownImageLightbox.tsx`](../src/components/MarkdownImageLightbox.tsx) | Mounted once per post. Makes every plain `![]()` markdown image clickable → same lightbox, single-image. |

All three are React islands (Astro `client:*`), styled via global rules in [`src/layouts/styles/markdown.css`](../src/layouts/styles/markdown.css) (search `image-gallery`), not component-scoped CSS — Swiper needs global class targeting (`.swiper-button-next`, `.swiper-pagination-bullet`, etc.) which can't be scoped per-component.

## Using the gallery in a post

Posts must be `.mdx` (plain `.md` can't import components — MDX is enabled via `@astrojs/mdx` in `astro.config.mjs`, collection type `"content"` covers both).

```mdx
import ImageGallery from "../../../components/ImageGallery";

<ImageGallery
  client:visible
  images={[
    { src: "/images/foo.png", alt: "Foo", caption: "Optional caption" },
    { src: "/images/bar.png", alt: "Bar" },
    { src: "/images/baz.png", alt: "Baz" },
  ]}
/>
```

- `client:visible` is required — the component only hydrates (and thus becomes clickable/zoomable) once scrolled into view.
- `caption` is optional per image.
- Any number of images works; breakpoints (see below) adapt slide count.
- Image paths: put files in `public/` and reference by absolute `/path.png` (see `public/gallery-test/` for the pattern), or use a relative import path resolvable by Vite. Do **not** rely on the per-post `assets/` folder convention used by plain markdown images — that's only auto-resolved for `![]()` syntax, not for props passed into a component.

Plain markdown images (`![Alt](./assets/foo.png)`) need no special markup — they get the lightbox automatically via `MarkdownImageLightbox`, which is mounted globally in `BlogPost.astro`.

## How it works

### Inline row (`ImageGallery`)

A `Swiper` with:
- `slidesPerView={1.5}` on mobile (shows one full image + a peek of the next, inviting a swipe), `2.2` at `640px`, `min(images.length, 3)` at `1024px` — see the `breakpoints` prop.
- Each slide is a `<button class="image-gallery-thumb-button">` wrapping the `<img>`, not a bare `<img>` — needed for a11y (keyboard-focusable, `aria-label`) and to attach the click-to-open-lightbox handler without fighting Swiper's own touch/drag handling.
- Thumbnails render inside a fixed `aspect-4/3` box with `object-contain` (not `object-cover`) — cropping was tried first and rejected because it cut off content on portrait/UI-screenshot images with varying aspect ratios. Full image is always visible, letterboxed against `--color-bg-surface`.
- Clicking a thumb sets `lightboxIndex` state and renders `<Lightbox images={images} initialIndex={lightboxIndex} onClose={...} />`.

### Lightbox

- Rendered via `createPortal(..., document.body)`. **This is required, not a style choice.** The theme's article entrance animation (`article { transform: translateY(0) }` in `markdown.css`) creates a CSS containing block, which breaks `position: fixed` for any descendant — including a naive in-place lightbox overlay. Portaling to `document.body` escapes that ancestor entirely.
- Portal render is gated behind a `mounted` state (`useState` + `useEffect(() => setMounted(true), [])`). **Also required, not defensive boilerplate.** `document.body` doesn't exist during Astro's server-side render pass (even for `client:*` islands, which still get SSR'd before hydration) — calling `createPortal` unconditionally throws `Target container is not a DOM element` at SSR time.
- Overlay uses `fixed inset-0 h-dvh w-screen`. The explicit `h-dvh w-screen` (not just `inset-0`) is load-bearing for mobile: `inset-0` alone was observed to leave the overlay short of full viewport height under mobile browser chrome/emulation, exposing page content below it. `dvh` (dynamic viewport height) resolves correctly against the actual visible viewport where plain `vh`/percent chains didn't.
- Swiper's `Zoom` module handles pinch (touch) / double-click (mouse) zoom out of the box — no custom zoom/pan code. Each slide wraps its `<img>` in `.swiper-zoom-container`, which is Swiper's required class for the zoom module to attach to.
- `Navigation` (arrows) only shown when `images.length > 1` — a single standalone image has nothing to navigate to.
- Escape key, backdrop click (`e.target === e.currentTarget` guard so clicking the image itself doesn't close it), and an explicit × button all call `onClose`.
- `document.body.style.overflow = "hidden"` while open, restored on close, to stop background scroll.

### Standalone markdown images (`MarkdownImageLightbox`)

- One instance mounted in `BlogPost.astro` (`client:load`, immediately — not `client:visible`, since it just attaches a listener and has no visible content itself) right after the `.markdown-content` wrapper.
- Uses **event delegation**: one click listener on `.markdown-content`, not one per `<img>`. Checks `e.target.closest("img")`, then excludes anything inside `.image-gallery` (so gallery thumbnails — which have their own click handler — don't double-fire this one too).
- On a qualifying click, opens `<Lightbox images={[{src, alt}]} initialIndex={0} />` — single-image, no nav arrows.
- Does **not** apply to the post's hero image (rendered directly in `BlogPost.astro`, outside `.markdown-content`) — this is deliberate, the hero image isn't a content image.

## Known gotchas for anyone extending this

1. **Don't put the lightbox JSX inline as a child of the gallery's own DOM tree.** It must go through `createPortal(..., document.body)`. Any ancestor with a CSS `transform` (this theme's `article` element has one for its entrance animation) silently breaks `position: fixed` for descendants — the overlay will render but be clipped to that ancestor's box instead of the viewport.
2. **Don't call `createPortal` before confirming you're client-side.** Guard with a `mounted` flag set in `useEffect`. This project's islands are still SSR'd once before hydration despite `client:visible`/`client:load`.
3. **Don't rely on `inset-0` alone for a full-screen mobile overlay.** Pair it with explicit `h-dvh w-screen`.
4. **`object-cover` is wrong for this gallery's use case.** These images are frequently UI screenshots / mockups with mixed aspect ratios and important content near the edges — `object-cover` crops unpredictably per image. Use `object-contain` in a fixed-aspect box instead.
5. Adding a new gallery-related CSS rule? It goes in `markdown.css` under the `/* Image gallery (Swiper) */` / `/* Lightbox */` sections, using global class selectors — Swiper's internal DOM (nav buttons, pagination bullets, zoom containers) isn't reachable via component-scoped styles.

## Testing

There's no automated test for this — it was verified manually in-browser (desktop + mobile emulation) during development. A throwaway test post existed at `src/content/blog/gallery-test/` with test images in `public/gallery-test/`; check whether it's still present before assuming it's a real post, and check with whoever's driving before deleting it — it's useful to keep around as a manual QA fixture if you're changing this component.
