export interface RenderOp {
  x: number;
  y: number;
  width: number;
  height: number;
  text?: {
    offsetX?: number;
    offsetY?: number;
    fill?: string;
    text?: string;
  };
  fill: string;
}

export abstract class Renderer {
  constructor(
    public readonly dimensions: { width: number; height: number },
    public readonly target: Element
  ) {}

  abstract render(opts: { opts: RenderOp[]; xMax: number; yMax: number }): void;

  abstract zoomIn(mousePosition: { x: number; y: number }): void;

  abstract zoomOut(mousePosition: { x: number; y: number }): void;

  abstract startDragging(): void;

  abstract grab(): void;

  abstract stopDragging(): void;

  abstract scrollBy(by: { x: number; y: number }): void;
}
