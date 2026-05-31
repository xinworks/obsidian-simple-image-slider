# Goal and Acceptance Tests

## Goal

Build a lightweight Obsidian plugin that turns a small block of Obsidian image embeds into a stable image slider. The slider must support click and swipe navigation, display each image's caption without covering the image, and avoid any hover behavior that changes image size or layout.

## Test Scope

These acceptance tests cover the first usable version only. They intentionally exclude thumbnails, fullscreen, autoplay, videos, audio, PDFs, annotations, compression, compare mode, plugin settings, and automatic note migration.

## Test Fixture

Use a test note in the XIN vault with this content:

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

Primary manual fixture:

```text
/Users/XIN/Library/Mobile Documents/iCloud~md~obsidian/Documents/XIN/Trading/追热点强叙事.md
```

## Acceptance Tests

### AT-001 Render Image Slider Block

Steps:

1. Open the fixture note in Obsidian.
2. Switch to Reading view or Live Preview rendered state.
3. Locate the `image-slider` block.

Expected result:

- The block renders as a slider, not as raw code.
- Exactly one image is visible at a time.
- The first image is visible by default.
- The rendered block does not modify the Markdown source.

### AT-002 Caption

Steps:

1. Render the fixture slider.
2. Observe the visible image caption.
3. Navigate through all slides.

Expected result:

- Each slide displays the caption from the text after `|` in the corresponding embed.
- The caption appears below the image and does not cover chart content.
- The caption remains readable in the current Obsidian theme.
- Captions update correctly when the visible image changes.

### AT-003 Click Navigation

Steps:

1. Render the fixture slider.
2. Click the next control once.
3. Click the previous control once.

Expected result:

- Clicking next changes from slide 1 to slide 2.
- Clicking previous changes from slide 2 back to slide 1.
- The caption changes together with the image.
- No additional images become visible during the transition.

### AT-004 Wraparound Navigation

Steps:

1. Navigate to the last slide.
2. Click next.
3. Click previous.

Expected result:

- Clicking next on the last slide returns to the first slide.
- Clicking previous on the first slide returns to the last slide.
- The displayed caption always matches the displayed image.

### AT-005 Swipe And Drag Navigation

Steps:

1. Render the fixture slider.
2. Swipe or drag horizontally from right to left across the image.
3. Swipe or drag horizontally from left to right across the image.
4. Try a very small accidental movement.

Expected result:

- A right-to-left swipe moves to the next slide.
- A left-to-right swipe moves to the previous slide.
- Small accidental movement does not change slides.
- The image area does not jump or resize during dragging.

### AT-006 Hover Stability

Steps:

1. Render the fixture slider.
2. Place the mouse outside the image area.
3. Note the image boundary and slider boundary.
4. Move the mouse over the image and controls.
5. Move the mouse out again.

Expected result:

- The image width and height do not change on hover.
- The slider width and height do not change on hover.
- Surrounding note content does not shift on hover.
- Hover effects are limited to opacity, color, or visibility of controls.
- No crop, zoom, scale, border-width change, padding change, or layout reflow is introduced by hover.

### AT-007 Keyboard Navigation

Steps:

1. Focus the slider using mouse click or keyboard tab navigation.
2. Press the right arrow key.
3. Press the left arrow key.
4. Move focus outside the slider.
5. Press arrow keys again.

Expected result:

- Right arrow moves to the next slide while the slider has focus.
- Left arrow moves to the previous slide while the slider has focus.
- Arrow keys do not affect the slider when focus is outside the slider.
- Obsidian's global keyboard behavior is not hijacked outside the slider.

### AT-008 Single Image Block

Test content:

````markdown
```image-slider
![[Pasted image 20260527081410.png|单图说明]]
```
````

Expected result:

- The single image renders with its caption below the image.
- Previous and next controls are hidden or disabled.
- No broken, empty, or misleading controls are shown.
- Keyboard or swipe input does not cause errors.

### AT-009 Missing Image Handling

Test content:

````markdown
```image-slider
![[missing-image.png|缺失图片]]
![[Pasted image 20260527081410.png|有效图片]]
```
````

Expected result:

- The valid image still renders.
- The missing image does not break the whole slider.
- A compact warning indicates that one image could not be resolved.
- The warning does not obscure the valid image caption.

### AT-010 No Valid Images

Test content:

````markdown
```image-slider
not an image
![[missing-image.png|缺失图片]]
```
````

Expected result:

- The block renders the message `No valid images found.`
- No broken image icon or JavaScript error is visible.
- Obsidian remains usable and responsive.

### AT-011 Image Fit And Layout Stability

Steps:

1. Render the fixture slider.
2. Navigate through every slide.
3. Observe the slider area while images with different dimensions load.

Expected result:

- Images fit inside the slider with `object-fit: contain` behavior.
- Images are not cropped by default.
- The slider keeps a stable height while changing slides.
- Surrounding note content does not jump during navigation.

### AT-012 Source Preservation

Steps:

1. Open the fixture note in source mode.
2. Record the Markdown content of the `image-slider` block.
3. Switch to rendered mode and interact with the slider.
4. Return to source mode.

Expected result:

- The Markdown source is unchanged.
- Slide navigation does not write state back into the note.
- The plugin does not add frontmatter, comments, block IDs, or generated markup to the note.

### AT-013 Supported Syntax And Path Resolution

Test content:

````markdown
```image-slider
![[Pasted image 20260527081410.png]]
![[Pasted image 20260527081714.png|带 caption 的文件名链接]]
![[attachments/Pasted image 20260527081906.png|带文件夹路径的链接]]
```
````

Expected result:

- A line without caption renders as a slide without a caption.
- A line with `|caption` renders with that caption.
- A line with a folder path resolves relative to the current note through Obsidian link resolution.
- Valid image extensions are accepted: `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp`, `avif`.
- The implementation does not require broad vault-wide filename search for normally resolvable links.

### AT-014 Accessibility Labels

Steps:

1. Render a slider with captions.
2. Inspect the previous and next controls.
3. Inspect the visible image element.
4. Render a slide without a caption and inspect its image element.

Expected result:

- The previous control has an accessible label equivalent to `Previous image`.
- The next control has an accessible label equivalent to `Next image`.
- A slide with caption uses the caption as image alt text.
- A slide without caption uses the image file name as image alt text.
- The slider container is reachable by keyboard focus.

### AT-015 Non-Image And Non-Goal Exclusion

Test content:

````markdown
```image-slider
![[sample.pdf|PDF should not render]]
![[sample.mp4|Video should not render]]
![[sample.md|Markdown should not render]]
![[Pasted image 20260527081410.png|有效图片]]
```
````

Expected result:

- Non-image files are skipped.
- The valid image still renders.
- The slider does not render thumbnails, fullscreen controls, autoplay controls, annotation controls, note panels, compression UI, or compare-mode UI.
- The plugin works without configuring a settings panel.

## Completion Gate

The first implementation is acceptable only when all acceptance tests pass in Obsidian desktop against the fixture note. If automated browser or DOM checks are added later, they may support the manual run, but they do not replace the final Obsidian render check.
