import { MarkdownPostProcessorContext, Plugin, TFile } from "obsidian";
import {
  fileNameFromPath,
  isSupportedImagePath,
  parseImageSliderSource,
  ParsedSlideLine,
  ResolvedSlide
} from "./src/slider";

const DRAG_THRESHOLD_PX = 48;

interface ResolutionResult {
  slides: ResolvedSlide[];
  skippedCount: number;
}

export default class SimpleImageSliderPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerMarkdownCodeBlockProcessor(
      "image-slider",
      async (source, el, ctx) => {
        await this.renderImageSlider(source, el, ctx);
      }
    );
  }

  private async renderImageSlider(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    el.empty();

    const parsed = parseImageSliderSource(source);
    const resolved = this.resolveSlides(parsed.slides, ctx.sourcePath);
    const skippedCount = parsed.unsupportedLines.length + resolved.skippedCount;

    if (resolved.slides.length === 0) {
      el.createDiv({
        cls: "simple-image-slider-empty",
        text: "No valid images found."
      });
      return;
    }

    this.createSlider(el, resolved.slides, skippedCount);
  }

  private resolveSlides(
    slideLines: ParsedSlideLine[],
    sourcePath: string
  ): ResolutionResult {
    const slides: ResolvedSlide[] = [];
    let skippedCount = 0;

    for (const slideLine of slideLines) {
      const file = this.resolveImageFile(slideLine.path, sourcePath);
      if (!file || !isSupportedImagePath(file.path)) {
        skippedCount += 1;
        continue;
      }

      slides.push({
        path: file.path,
        resourcePath: this.app.vault.adapter.getResourcePath(file.path),
        caption: slideLine.caption,
        alt: slideLine.caption || fileNameFromPath(file.path)
      });
    }

    return { slides, skippedCount };
  }

  private resolveImageFile(path: string, sourcePath: string): TFile | null {
    const linkDestination = this.app.metadataCache.getFirstLinkpathDest(
      path,
      sourcePath
    );
    if (linkDestination instanceof TFile) {
      return linkDestination;
    }

    const directFile = this.app.vault.getAbstractFileByPath(path);
    if (directFile instanceof TFile) {
      return directFile;
    }

    const matchingFiles = this.app.vault
      .getFiles()
      .filter((file) => file.name.toLowerCase() === path.toLowerCase());

    if (matchingFiles.length === 1) {
      return matchingFiles[0];
    }

    return null;
  }

  private createSlider(
    container: HTMLElement,
    slides: ResolvedSlide[],
    skippedCount: number
  ): void {
    let currentIndex = 0;
    let pointerStartX: number | null = null;
    let pointerStartY: number | null = null;

    const wrapper = container.createDiv({ cls: "simple-image-slider" });
    wrapper.tabIndex = 0;
    wrapper.setAttr("role", "group");
    wrapper.setAttr("aria-label", "Image slider");

    const frame = wrapper.createDiv({ cls: "simple-image-slider__frame" });
    const image = frame.createEl("img", {
      cls: "simple-image-slider__image",
      attr: {
        draggable: "false"
      }
    });
    const caption = frame.createDiv({
      cls: "simple-image-slider__caption"
    });
    const status = wrapper.createDiv({
      cls: "simple-image-slider__status",
      attr: {
        "aria-live": "polite"
      }
    });

    let previousButton: HTMLButtonElement | null = null;
    let nextButton: HTMLButtonElement | null = null;

    const update = (): void => {
      const slide = slides[currentIndex];
      image.src = slide.resourcePath;
      image.alt = slide.alt;
      image.setAttr("data-slide-path", slide.path);

      caption.textContent = slide.caption;
      caption.toggleClass("simple-image-slider__caption--hidden", !slide.caption);

      status.textContent = `${currentIndex + 1} / ${slides.length}`;
    };

    const showSlide = (index: number): void => {
      currentIndex = (index + slides.length) % slides.length;
      update();
    };

    if (slides.length > 1) {
      previousButton = frame.createEl("button", {
        cls: "simple-image-slider__button simple-image-slider__button--previous",
        text: "‹",
        attr: {
          "aria-label": "Previous image",
          type: "button"
        }
      });
      nextButton = frame.createEl("button", {
        cls: "simple-image-slider__button simple-image-slider__button--next",
        text: "›",
        attr: {
          "aria-label": "Next image",
          type: "button"
        }
      });

      this.bindNavigationButton(previousButton, () => showSlide(currentIndex - 1));
      this.bindNavigationButton(nextButton, () => showSlide(currentIndex + 1));
    }

    wrapper.addEventListener("keydown", (event: KeyboardEvent) => {
      if (slides.length <= 1) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showSlide(currentIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        showSlide(currentIndex - 1);
      }
    });

    frame.addEventListener("pointerdown", (event: PointerEvent) => {
      if (slides.length <= 1) {
        return;
      }

      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      frame.setPointerCapture(event.pointerId);
    });

    frame.addEventListener("pointerup", (event: PointerEvent) => {
      if (
        slides.length <= 1 ||
        pointerStartX === null ||
        pointerStartY === null
      ) {
        return;
      }

      const deltaX = event.clientX - pointerStartX;
      const deltaY = event.clientY - pointerStartY;
      pointerStartX = null;
      pointerStartY = null;

      if (
        Math.abs(deltaX) < DRAG_THRESHOLD_PX ||
        Math.abs(deltaX) < Math.abs(deltaY)
      ) {
        return;
      }

      showSlide(deltaX < 0 ? currentIndex + 1 : currentIndex - 1);
    });

    frame.addEventListener("pointercancel", () => {
      pointerStartX = null;
      pointerStartY = null;
    });

    if (skippedCount > 0) {
      const warning = wrapper.createDiv({
        cls: "simple-image-slider__warning",
        text: `${skippedCount} image${skippedCount === 1 ? "" : "s"} could not be resolved.`
      });
      warning.setAttr("aria-live", "polite");
    }

    update();
  }

  private bindNavigationButton(
    button: HTMLButtonElement,
    onNavigate: () => void
  ): void {
    button.addEventListener("pointerdown", (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
    });

    button.addEventListener("pointerup", (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
    });

    button.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigate();
    });
  }
}
