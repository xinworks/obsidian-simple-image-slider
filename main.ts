import { MarkdownPostProcessorContext, Plugin, setIcon, TFile } from "obsidian";
import {
  fileNameFromPath,
  isSupportedImagePath,
  parseImageSliderSource,
  ParsedSlideLine,
  ResolvedSlide
} from "./src/slider";

const DRAG_THRESHOLD_PX = 48;
const TOUCH_INTENT_THRESHOLD_PX = 8;

type SlideDirection = -1 | 1;

interface SlideSlot {
  element: HTMLDivElement;
  image: HTMLImageElement;
  offset: -1 | 0 | 1;
}

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
    let touchStartX: number | null = null;
    let touchStartY: number | null = null;
    let isAnimating = false;
    let transitionTimer: number | null = null;

    const wrapper = container.createDiv({ cls: "simple-image-slider" });
    wrapper.tabIndex = 0;
    wrapper.setAttr("role", "group");
    wrapper.setAttr("aria-label", "Image slider");

    const frame = wrapper.createDiv({ cls: "simple-image-slider__frame" });
    const track = frame.createDiv({ cls: "simple-image-slider__track" });
    const slideSlots: SlideSlot[] = ([-1, 0, 1] as const).map((offset) => {
      const element = track.createDiv({ cls: "simple-image-slider__slide" });
      const image = element.createEl("img", {
        cls: "simple-image-slider__image",
        attr: {
          draggable: "false"
        }
      });

      return { element, image, offset };
    });
    const status = wrapper.createDiv({
      cls: "simple-image-slider__status",
      attr: {
        "aria-live": "polite"
      }
    });
    const caption = wrapper.createDiv({
      cls: "simple-image-slider__caption"
    });

    let previousButton: HTMLButtonElement | null = null;
    let nextButton: HTMLButtonElement | null = null;

    const normalizeIndex = (index: number): number =>
      (index + slides.length) % slides.length;

    const setTrackOffset = (offsetPx: number, animated: boolean): void => {
      track.toggleClass("simple-image-slider__track--animated", animated);
      track.style.transform =
        offsetPx === 0
          ? "translate3d(-100%, 0, 0)"
          : `translate3d(calc(-100% + ${offsetPx}px), 0, 0)`;
    };

    const renderSlides = (): void => {
      for (const slot of slideSlots) {
        const slideIndex = normalizeIndex(currentIndex + slot.offset);
        const slide = slides[slideIndex];
        const isCurrent = slot.offset === 0;

        slot.image.src = slide.resourcePath;
        slot.image.alt = isCurrent ? slide.alt : "";
        slot.image.setAttr("data-slide-path", slide.path);
        slot.image.toggleClass("simple-image-slider__image--current", isCurrent);
        slot.element.toggleClass("simple-image-slider__slide--current", isCurrent);
        slot.element.setAttr("aria-hidden", isCurrent ? "false" : "true");
      }
    };

    const updateCaptionAndStatus = (): void => {
      const slide = slides[currentIndex];

      caption.textContent = slide.caption;
      caption.toggleClass("simple-image-slider__caption--hidden", !slide.caption);

      status.textContent = `${currentIndex + 1} / ${slides.length}`;
    };

    const update = (): void => {
      renderSlides();
      updateCaptionAndStatus();
      setTrackOffset(0, false);
    };

    const onTrackTransitionEnd = (onDone: () => void): void => {
      let isDone = false;

      const finish = (): void => {
        if (isDone) {
          return;
        }

        isDone = true;
        if (transitionTimer !== null) {
          window.clearTimeout(transitionTimer);
          transitionTimer = null;
        }
        track.removeEventListener("transitionend", finish);
        onDone();
      };

      track.addEventListener("transitionend", finish);
      transitionTimer = window.setTimeout(finish, 360);
    };

    const animateToCurrent = (): void => {
      if (isAnimating) {
        return;
      }

      isAnimating = true;
      setTrackOffset(0, true);
      onTrackTransitionEnd(() => {
        setTrackOffset(0, false);
        isAnimating = false;
      });
    };

    const slideWithAnimation = (direction: SlideDirection): void => {
      if (slides.length <= 1 || isAnimating) {
        return;
      }

      isAnimating = true;
      const frameWidth = frame.getBoundingClientRect().width;
      setTrackOffset(direction === 1 ? -frameWidth : frameWidth, true);

      onTrackTransitionEnd(() => {
        currentIndex = normalizeIndex(currentIndex + direction);
        renderSlides();
        updateCaptionAndStatus();
        setTrackOffset(0, false);
        isAnimating = false;
      });
    };

    if (slides.length > 1) {
      previousButton = frame.createEl("button", {
        cls: "simple-image-slider__button simple-image-slider__button--previous",
        attr: {
          "aria-label": "Previous image",
          type: "button"
        }
      });
      setIcon(previousButton, "chevron-left");

      nextButton = frame.createEl("button", {
        cls: "simple-image-slider__button simple-image-slider__button--next",
        attr: {
          "aria-label": "Next image",
          type: "button"
        }
      });
      setIcon(nextButton, "chevron-right");

      this.bindNavigationButton(previousButton, () => slideWithAnimation(-1));
      this.bindNavigationButton(nextButton, () => slideWithAnimation(1));
    }

    wrapper.addEventListener("keydown", (event: KeyboardEvent) => {
      if (slides.length <= 1) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        slideWithAnimation(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        slideWithAnimation(-1);
      }
    });

    const navigateFromDelta = (deltaX: number, deltaY: number): boolean => {
      if (
        Math.abs(deltaX) < DRAG_THRESHOLD_PX ||
        Math.abs(deltaX) < Math.abs(deltaY)
      ) {
        return false;
      }

      slideWithAnimation(deltaX < 0 ? 1 : -1);
      return true;
    };

    const isHorizontalTouchIntent = (deltaX: number, deltaY: number): boolean =>
      Math.abs(deltaX) >= TOUCH_INTENT_THRESHOLD_PX &&
      Math.abs(deltaX) > Math.abs(deltaY);

    frame.addEventListener("pointerdown", (event: PointerEvent) => {
      if (slides.length <= 1 || event.pointerType === "touch" || isAnimating) {
        return;
      }

      track.toggleClass("simple-image-slider__track--animated", false);
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      try {
        frame.setPointerCapture(event.pointerId);
      } catch {
        // Some mobile WebViews expose pointer events without capture support.
      }
    });

    frame.addEventListener("pointermove", (event: PointerEvent) => {
      if (
        slides.length <= 1 ||
        event.pointerType === "touch" ||
        pointerStartX === null ||
        pointerStartY === null ||
        isAnimating
      ) {
        return;
      }

      const deltaX = event.clientX - pointerStartX;
      const deltaY = event.clientY - pointerStartY;

      if (isHorizontalTouchIntent(deltaX, deltaY)) {
        event.preventDefault();
        setTrackOffset(deltaX, false);
      }
    });

    frame.addEventListener("pointerup", (event: PointerEvent) => {
      if (
        slides.length <= 1 ||
        event.pointerType === "touch" ||
        pointerStartX === null ||
        pointerStartY === null ||
        isAnimating
      ) {
        return;
      }

      const deltaX = event.clientX - pointerStartX;
      const deltaY = event.clientY - pointerStartY;
      pointerStartX = null;
      pointerStartY = null;

      if (!navigateFromDelta(deltaX, deltaY)) {
        animateToCurrent();
      }
    });

    frame.addEventListener("pointercancel", () => {
      pointerStartX = null;
      pointerStartY = null;
      if (!isAnimating) {
        animateToCurrent();
      }
    });

    frame.addEventListener(
      "touchstart",
      (event: TouchEvent) => {
        if (slides.length <= 1 || event.touches.length !== 1 || isAnimating) {
          return;
        }

        event.stopPropagation();
        track.toggleClass("simple-image-slider__track--animated", false);
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      },
      { passive: false }
    );

    frame.addEventListener(
      "touchmove",
      (event: TouchEvent) => {
        if (
          slides.length <= 1 ||
          touchStartX === null ||
          touchStartY === null ||
          event.touches.length !== 1 ||
          isAnimating
        ) {
          return;
        }

        const touch = event.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        if (isHorizontalTouchIntent(deltaX, deltaY)) {
          event.preventDefault();
          event.stopPropagation();
          setTrackOffset(deltaX, false);
        }
      },
      { passive: false }
    );

    frame.addEventListener(
      "touchend",
      (event: TouchEvent) => {
        if (
          slides.length <= 1 ||
          touchStartX === null ||
          touchStartY === null ||
          event.changedTouches.length !== 1 ||
          isAnimating
        ) {
          return;
        }

        event.stopPropagation();
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        touchStartX = null;
        touchStartY = null;

        if (
          Math.abs(deltaX) >= DRAG_THRESHOLD_PX &&
          Math.abs(deltaX) >= Math.abs(deltaY)
        ) {
          event.preventDefault();
          event.stopPropagation();
          navigateFromDelta(deltaX, deltaY);
        } else {
          animateToCurrent();
        }
      },
      { passive: false }
    );

    frame.addEventListener("touchcancel", () => {
      touchStartX = null;
      touchStartY = null;
      if (!isAnimating) {
        animateToCurrent();
      }
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
    let lastTouchNavigation = 0;

    button.addEventListener("pointerdown", (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
    });

    button.addEventListener("pointerup", (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
    });

    button.addEventListener(
      "touchstart",
      (event: TouchEvent) => {
        event.preventDefault();
        event.stopPropagation();
      },
      { passive: false }
    );

    button.addEventListener(
      "touchend",
      (event: TouchEvent) => {
        event.preventDefault();
        event.stopPropagation();
        lastTouchNavigation = Date.now();
        onNavigate();
      },
      { passive: false }
    );

    button.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (Date.now() - lastTouchNavigation < 500) {
        return;
      }
      onNavigate();
    });
  }
}
