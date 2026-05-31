# Simple Image Slider Requirements

## Summary

Build a lightweight Obsidian community plugin that renders a small image slider from a Markdown code block. The plugin is intended for notes that contain multiple related chart screenshots or pasted images. It should reduce vertical clutter while keeping each image's short description visible as a caption below the image.

## Problem

Inline image sequences in Obsidian notes take too much vertical space and interrupt reading. Existing Media Slider-style plugins include many unrelated capabilities such as video, audio, PDF, thumbnails, fullscreen, compression, annotations, notes, and compare mode. For this workflow, those features add complexity without solving the core problem.

## Goals

- Render multiple Obsidian image embeds as one slider.
- Support left/right navigation by button click.
- Support horizontal swipe or drag navigation.
- Display each image's caption without covering image content.
- Keep the authoring syntax close to normal Obsidian image embeds.
- Work in Obsidian reading mode and live preview rendered blocks.
- Keep implementation small, predictable, and easy to maintain.

## Non-Goals

- No video, audio, PDF, YouTube, Markdown-file, or folder gallery support.
- No thumbnails.
- No fullscreen mode.
- No image compression.
- No drawing or annotation layer.
- No per-slide notes.
- No before/after comparison mode.
- No autoplay.
- No plugin settings panel for the first version.
- No migration or automatic rewrite of existing notes.

## Markdown Syntax

The plugin registers a Markdown code block named `image-slider`.

````markdown
```image-slider
![[Pasted image 20260527081410.png|超大阳线突破前高]]
![[Pasted image 20260527081714.png|继续上涨，而后回调也没有低于超大阳线收盘]]
![[Pasted image 20260527081906.png|失败的情况：博通]]
```
````

Each non-empty line should be parsed as one slide.

Supported line forms:

```markdown
![[image.png]]
![[image.png|caption]]
![[folder/image.png|caption]]
```

Unsupported or unresolved lines should be skipped and reported as a compact inline warning inside the rendered block.

## Caption Behavior

- The caption comes from the text after `|` in the Obsidian embed.
- Captions display below the image, not as an overlay.
- Desktop and mobile use the same caption layout.
- Caption text should remain readable on light and dark themes.
- Long captions may wrap to multiple lines without covering image content.
- If no caption is provided, no caption is shown.

## Slider Behavior

- Show one image at a time.
- Provide previous and next controls.
- Hide or disable previous/next controls when there is only one image.
- Navigation wraps around by default: after the last image, next returns to the first image; before the first image, previous returns to the last image.
- Support keyboard left/right arrow navigation when the slider has focus.
- Support touch swipe and pointer drag:
  - Swipe left: next image.
  - Swipe right: previous image.
  - Small accidental movement should not trigger navigation.
- The slider should preserve a stable height while switching images to avoid layout jumping.

## Image Rendering

- Only image files are supported.
- Supported extensions: `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp`, `avif`.
- Resolve Obsidian wikilinks relative to the current note using Obsidian metadata APIs.
- Use Obsidian's vault resource path for local images.
- Do not search the whole vault by filename unless Obsidian's link resolver cannot resolve the path.
- Images should fit within the slider without cropping by default.
- The stable image canvas should prioritize filling available width and leave vertical whitespace before creating large left/right gutters.
- Use `object-fit: contain`.

## Visual Requirements

- The rendered block should feel native inside Obsidian, not like a separate web app.
- The image area should be clean and minimal.
- Controls should be visible but unobtrusive.
- Controls should work on desktop and mobile.
- Hovering over the image must not change the image size, slider size, or surrounding layout.
- Hover effects may only change opacity, color, or visibility of controls.
- The slider should not require custom snippets or theme-specific CSS.
- CSS class names should be plugin-scoped to avoid affecting normal note images.

## Error States

- If there are no valid images, render a short message: `No valid images found.`
- If some lines cannot be resolved, render valid images and show a compact warning count.
- Missing images should not break rendering of the whole slider.

## Accessibility

- The slider container should be focusable.
- Previous and next buttons should have accessible labels.
- If a caption exists, use it as the image `alt` text.
- If no caption exists, use the image file name as `alt` text.
- Keyboard navigation should not hijack global arrows unless focus is inside the slider.

## Acceptance Criteria

- A note containing an `image-slider` block renders one visible image with its caption below it.
- Clicking next and previous changes the visible image.
- Swiping or dragging horizontally changes the visible image.
- Captions match the corresponding image after navigation.
- A block with one image renders without broken controls.
- A block with an unresolved image still renders the remaining valid images.
- Hovering over the image does not resize, crop, shift, or reflow the image area.
- The plugin does not modify note content.
- The plugin does not require settings to be configured before use.

## First Test Note

Use the existing note as a manual test case:

```text
/Users/XIN/Library/Mobile Documents/iCloud~md~obsidian/Documents/XIN/Trading/追热点强叙事.md
```

The current Media Slider trial block can be converted to:

````markdown
```image-slider
![[Pasted image 20260527081410.png|超大阳线突破前高]]
![[Pasted image 20260527081714.png|继续上涨，而后回调也没有低于超大阳线收盘]]
![[Pasted image 20260527081906.png|失败的情况：博通]]
![[Pasted image 20260527082631.png|失败的情况：META]]
![[Pasted image 20260527082029.png|Shopify，大阳线后回调，回测 EMA20]]
![[Pasted image 20260527082503.png|突破前高后回测 EMA20]]
```
````

## Implementation Notes

- Start from the official Obsidian sample plugin structure.
- Plugin ID candidate: `simple-image-slider`.
- Code block name: `image-slider`.
- Keep the first version as a single-purpose plugin with no settings tab.
- Prefer TypeScript for Obsidian API typing.
- Avoid dependencies beyond the standard Obsidian plugin toolchain.
- Main Obsidian APIs likely needed:
  - `registerMarkdownCodeBlockProcessor`
  - `metadataCache.getFirstLinkpathDest`
  - `vault.adapter.getResourcePath`

## Open Questions

- Should caption placement become configurable later?
- Should navigation wrap around, or stop at the ends?
- Should the slider height be automatic, fixed, or configurable inline later?
- Should normal Markdown image syntax `![caption](path.png)` be supported in a later version?
