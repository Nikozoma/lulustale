import { CORE_SAFE_VIEW, LOGICAL_CAMERA_HEIGHT } from "./constants";
import type { Size } from "./camera";

export type LogicalViewport = Size & {
  outputScale: number;
  cssWidth: number;
  cssHeight: number;
  compatibilityFallback: boolean;
};

export function calculateLogicalViewport(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number
): LogicalViewport {
  const dpr = Math.max(1, devicePixelRatio || 1);
  const physicalWidth = Math.max(1, Math.floor(cssWidth * dpr));
  const physicalHeight = Math.max(1, Math.floor(cssHeight * dpr));
  const referenceScale = Math.floor(
    Math.min(physicalWidth / CORE_SAFE_VIEW.width, physicalHeight / CORE_SAFE_VIEW.height)
  );
  const outputScale = Math.max(1, referenceScale);
  const compatibilityFallback = referenceScale < 1;
  const width = Math.max(
    CORE_SAFE_VIEW.width,
    compatibilityFallback ? CORE_SAFE_VIEW.width : Math.floor(physicalWidth / outputScale)
  );
  const height = LOGICAL_CAMERA_HEIGHT;
  const cssPixelScale = compatibilityFallback
    ? Math.min(cssWidth / width, cssHeight / height)
    : outputScale / dpr;

  return {
    width,
    height,
    outputScale,
    cssWidth: Math.max(1, Math.floor(width * cssPixelScale)),
    cssHeight: Math.max(1, Math.floor(height * cssPixelScale)),
    compatibilityFallback
  };
}

export function applyLogicalViewport(canvas: HTMLCanvasElement, viewport: LogicalViewport): void {
  const backingWidth = viewport.width * viewport.outputScale;
  const backingHeight = viewport.height * viewport.outputScale;
  if (canvas.width !== backingWidth) {
    canvas.width = backingWidth;
  }
  if (canvas.height !== backingHeight) {
    canvas.height = backingHeight;
  }
  canvas.style.width = `${viewport.cssWidth}px`;
  canvas.style.height = `${viewport.cssHeight}px`;
}
