import { RenderOp, Theme } from "../format";

export abstract class Renderer {
  constructor(
    public readonly dimensions: { width: number; height: number },
    public readonly theme: Theme,
    public readonly target: Element
  ) {}

  abstract resize(dimensions: { width: number; height: number }): void;

  abstract render(opts: { opts: RenderOp[]; xMax: number; yMax: number }): void;

  abstract zoomIn(mousePosition: { x: number; y: number }): void;

  abstract zoomOut(mousePosition: { x: number; y: number }): void;

  abstract startDragging(
    mousePosition: {
      x: number;
      y: number;
      target: Element;
    } | null
  ): void;

  abstract stopDragging(): void;

  abstract drag(
    by: { x: number; y: number; dx: number; dy: number },
    start: { x: number; y: number; target: Element } | null
  ): void;

  abstract range(): void;

  abstract startRange(
    mousePosition: {
      x: number;
      y: number;
      target: Element;
    } | null
  ): void;

  abstract stopRange(): void;

  abstract dragRange(
    by: { x: number; y: number; dx: number; dy: number },
    start: { x: number; y: number; target: Element } | null
  ): void;

  abstract click(
    mousePosition: {
      x: number;
      y: number;
      target: Element;
    },
    shiftDown: Boolean
  ): void;

  abstract mouseMove(
    mousePosition: { x: number; y: number },
    opts: { shiftDown: boolean }
  ): void;
}
