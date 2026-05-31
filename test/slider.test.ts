import assert from "node:assert/strict";
import test from "node:test";
import {
  IMAGE_EXTENSIONS,
  fileNameFromPath,
  isSupportedImagePath,
  parseEmbedLine,
  parseImageCaptionsFromSource,
  parseImageSliderSource
} from "../src/slider.ts";

test("parses Obsidian image embeds and captions", () => {
  const result = parseImageSliderSource(`
![[image.png]]
![[folder/chart.jpg|caption text]]
![[folder/spaced chart.jpg | spaced caption]]
not supported
`);

  assert.equal(result.slides.length, 3);
  assert.deepEqual(result.slides[0], {
    original: "![[image.png]]",
    path: "image.png",
    caption: ""
  });
  assert.deepEqual(result.slides[1], {
    original: "![[folder/chart.jpg|caption text]]",
    path: "folder/chart.jpg",
    caption: "caption text"
  });
  assert.deepEqual(result.slides[2], {
    original: "![[folder/spaced chart.jpg | spaced caption]]",
    path: "folder/spaced chart.jpg",
    caption: "spaced caption"
  });
  assert.deepEqual(result.unsupportedLines, ["not supported"]);
});

test("recognizes supported image extensions only", () => {
  assert.equal(isSupportedImagePath("image.png"), true);
  assert.equal(isSupportedImagePath("image.JPG"), true);
  assert.equal(isSupportedImagePath("image.avif#anchor"), true);
  assert.equal(isSupportedImagePath("file.pdf"), false);
  assert.equal(isSupportedImagePath("file.mp4"), false);
  assert.equal(isSupportedImagePath("no-extension"), false);
});

test("extracts fallback alt text from path", () => {
  assert.equal(fileNameFromPath("folder/sub/image.png"), "image.png");
  assert.equal(fileNameFromPath("image.png#anchor"), "image.png");
});

test("rejects unsupported line forms without throwing", () => {
  assert.equal(parseEmbedLine("![](image.png)"), null);
  assert.equal(parseEmbedLine("[[image.png]]"), null);
  assert.equal(parseEmbedLine("![[|caption only]]"), null);
});

test("parses captions for normal image embeds", () => {
  assert.deepEqual(
    parseImageCaptionsFromSource(`
![[chart.png|breakout caption]]
![[spaced.png | spaced caption]]
![[sized.png|300]]
![[sized-spaced.png | 300x200]]
![markdown caption](chart-2.png)
![image](chart-3.png "title")
`),
    [
      { caption: "breakout caption" },
      { caption: "spaced caption" },
      { caption: "" },
      { caption: "" },
      { caption: "markdown caption" },
      { caption: "image" }
    ]
  );
});

test("keeps the documented image extension set complete", () => {
  assert.deepEqual(
    [...IMAGE_EXTENSIONS].sort(),
    ["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]
  );
});
