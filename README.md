# Simple Image Slider

Simple Image Slider is a lightweight Obsidian plugin that renders a group of image embeds as a stable slider with caption overlays.

It is intentionally small. It supports Obsidian image wikilinks, click navigation, keyboard navigation, swipe/drag navigation, and captions. It does not include thumbnails, fullscreen mode, autoplay, video/audio/PDF support, annotations, compression, compare mode, or a settings panel.

## Usage

Add an `image-slider` code block to a note:

````markdown
```image-slider
![[Pasted image 20260527081410.png|超大阳线突破前高]]
![[Pasted image 20260527081714.png|继续上涨，而后回调也没有低于超大阳线收盘]]
![[Pasted image 20260527081906.png|失败的情况：博通]]
```
````

Supported line forms:

```markdown
![[image.png]]
![[image.png|caption]]
![[folder/image.png|caption]]
```

The text after `|` is displayed as a caption overlay on the image. If a slide has no caption, no caption overlay is shown.

## Behavior

- One image is shown at a time.
- Previous and next buttons wrap around at the ends.
- Left and right arrow keys work when the slider has focus.
- Horizontal swipe or drag changes slides.
- Small accidental drag movement is ignored.
- The image uses `object-fit: contain`.
- Hover effects do not resize, crop, scale, shift, or reflow the image area.
- Missing or unsupported lines are skipped; valid images still render.
- If no valid images are found, the block renders `No valid images found.`

## Install Manually

1. Build the plugin:

```bash
npm install
npm run build
```

2. Copy these files into your vault:

```text
<vault>/.obsidian/plugins/simple-image-slider/
  main.js
  manifest.json
  styles.css
```

3. Enable `Simple Image Slider` in Obsidian community plugins.

## Development

```bash
npm install
npm run verify
```

`npm run verify` runs parser/CSS tests and then builds the Obsidian plugin.

## Acceptance Tests

The acceptance test plan is documented in:

[docs/specs/goal-and-acceptance-tests.md](docs/specs/goal-and-acceptance-tests.md)

The requirements spec is documented in:

[docs/specs/simple-image-slider-requirements.md](docs/specs/simple-image-slider-requirements.md)

## License

MIT
