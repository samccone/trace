import { RenderOp } from "../format";

export abstract class Renderer {
  constructor(
    public readonly dimensions: { width: number; height: number },
    public readonly target: Element
  ) {}

  abstract resize(dimensions: { width: number; height: number }): void;

  abstract render(opts: { opts: RenderOp[]; xMax: number; yMax: number }): void;

  abstract zoomIn(mousePosition: { x: number; y: number }): void;

  abstract zoomOut(mousePosition: { x: number; y: number }): void;

  abstract startDragging(): void;

  abstract grab(): void;

  abstract stopDragging(): void;

  abstract drag(
    by: { x: number; y: number },
    start: { x: number; y: number; target: Element } | null
  ): void;

  abstract onClick(mousePosition: { x: number; y: number }): void;
}
