export const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "avif"
]);

export interface ParsedSlideLine {
  original: string;
  path: string;
  caption: string;
}

export interface ResolvedSlide {
  path: string;
  resourcePath: string;
  caption: string;
  alt: string;
}

export interface ParseResult {
  slides: ParsedSlideLine[];
  unsupportedLines: string[];
}

export interface ParsedImageCaption {
  caption: string;
}

export function parseImageSliderSource(source: string): ParseResult {
  const slides: ParsedSlideLine[] = [];
  const unsupportedLines: string[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const parsed = parseEmbedLine(line);
    if (parsed) {
      slides.push(parsed);
    } else {
      unsupportedLines.push(line);
    }
  }

  return { slides, unsupportedLines };
}

export function parseImageCaptionsFromSource(source: string): ParsedImageCaption[] {
  const captions: ParsedImageCaption[] = [];
  const imagePattern =
    /!\[\[([^\]|]+?)(?:\|([^\]]*?))?\]\]|!\[([^\]]*?)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const match of source.matchAll(imagePattern)) {
    const wikilinkCaption = match[2]?.trim();
    const markdownCaption = match[3]?.trim();
    const caption = wikilinkCaption ?? markdownCaption ?? "";

    captions.push({
      caption: isImageSizeAlias(caption) ? "" : caption
    });
  }

  return captions;
}

export function parseEmbedLine(line: string): ParsedSlideLine | null {
  const match = line.match(/^!\[\[([^\]|]+?)(?:\|([^\]]*?))?\]\]$/);
  if (!match) {
    return null;
  }

  const path = match[1]?.trim();
  if (!path) {
    return null;
  }

  return {
    original: line,
    path,
    caption: (match[2] ?? "").trim()
  };
}

export function isImageSizeAlias(alias: string): boolean {
  return /^\d+(?:\s*x\s*\d+)?$/i.test(alias);
}

export function isSupportedImagePath(path: string): boolean {
  const cleanPath = path.split("#")[0]?.split("?")[0] ?? path;
  const extension = cleanPath.match(/\.([^.\/\\]+)$/)?.[1]?.toLowerCase();
  return extension ? IMAGE_EXTENSIONS.has(extension) : false;
}

export function fileNameFromPath(path: string): string {
  const withoutAnchor = path.split("#")[0] ?? path;
  const segments = withoutAnchor.split("/");
  return segments[segments.length - 1] || withoutAnchor;
}
