export type ImageSizeAttrs = {
  width?: number | null;
  height?: number | null;
  originalWidth?: number | null;
  originalHeight?: number | null;
};

export function getImageAspectRatio(attrs: ImageSizeAttrs): number | null {
  if (attrs.originalWidth && attrs.originalHeight) {
    return attrs.originalWidth / attrs.originalHeight;
  }

  if (attrs.width && attrs.height) {
    return attrs.width / attrs.height;
  }

  return null;
}

export function getHeightForWidth(
  width: number,
  attrs: ImageSizeAttrs,
): number {
  const ratio = getImageAspectRatio(attrs);
  if (!ratio) {
    return width;
  }

  return Math.round(width / ratio);
}

export function applyImageDisplayStyles(
  el: HTMLImageElement,
  attrs: ImageSizeAttrs,
) {
  if (attrs.width != null) {
    el.style.width = `${attrs.width}px`;
  }

  el.style.maxWidth = "100%";
  el.style.height = "auto";

  const ratio = getImageAspectRatio(attrs);
  if (ratio != null) {
    el.style.aspectRatio = String(ratio);
  } else {
    el.style.removeProperty("aspect-ratio");
  }
}

export function buildImageSizeAttrs(options: {
  naturalWidth: number;
  naturalHeight: number;
  width?: number | null;
}): ImageSizeAttrs {
  const { naturalWidth, naturalHeight, width = naturalWidth } = options;

  return {
    originalWidth: naturalWidth,
    originalHeight: naturalHeight,
    width,
    height: getHeightForWidth(width, {
      originalWidth: naturalWidth,
      originalHeight: naturalHeight,
    }),
  };
}
