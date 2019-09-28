import { Renderer } from "./renderer";
import { RenderInstructions, TimelineEvent } from "../format";
import { scaleLinear, ScaleLinear } from "d3-scale";
import { binarySearch } from "../search";

const ZOOM_AMOUNT = 0.1;
const MIN_ZOOM = 0.1;

export class CanvasRenderer implements Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private displayDensity: number;
  private wrapper: HTMLElement;
  private overflowElm: HTMLElement;
  private axes: HTMLElement;
  private ySummary: HTMLCanvasElement;
  private validYBrush: Boolean;

  private ySummaryY: ScaleLinear<number, number>;
  private ySummaryX: ScaleLinear<number, number>;

  private ySummaryCtx: CanvasRenderingContext2D;
  private yAxis: HTMLCanvasElement;
  private yAxisCtx: CanvasRenderingContext2D;

  private xSummary: HTMLCanvasElement;
  private validXBrush: Boolean;

  private xSummaryCtx: CanvasRenderingContext2D;
  private xSummaryY: ScaleLinear<number, number>;
  private xSummaryX: ScaleLinear<number, number>;

  private xAxis: HTMLCanvasElement;
  private xAxisCtx: CanvasRenderingContext2D;

  private marginWrapper: HTMLElement;
  private timeline: HTMLElement;
  private scrollOffset: { x: number; y: number } = { x: 0, y: 0 };
  private lastOps?: RenderInstructions;
  private zoomLevel: number = 0.0;
  private margin: { top: number; left: number; right: number };
  private activeUUID: string | undefined;

  constructor(
    public dimensions: {
      width: number;
      height: number;
      margin?: { top: number; left: number; right: number };
    },
    public readonly target: HTMLElement
  ) {
    this.margin = this.dimensions.margin || { top: 100, left: 100, right: 200 };

    this.overflowElm = document.createElement("div");
    this.overflowElm.style.width = "1px";
    this.overflowElm.style.height = "1px";
    this.wrapper = document.createElement("div");
    this.wrapper.style.overflow = "scroll";
    this.wrapper.style.zIndex = "1";
    this.wrapper.style.position = "relative";

    this.displayDensity = window.devicePixelRatio;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;

    this.canvas.style.pointerEvents = "none";
    this.canvas.style.position = "fixed";
    this.canvas.style.left = `${this.margin.left}px`;
    this.canvas.style.top = `${this.margin.top}px`;

    this.marginWrapper = document.createElement("div");
    this.axes = document.createElement("div");
    this.axes.style.position = "relative";
    this.axes.style.top = "0px";
    this.axes.style.left = "0px";
    this.axes.className = "axes";

    this.ySummary = document.createElement("canvas");
    this.ySummary.className = "ySummary";
    this.ySummary.style.position = "fixed";
    this.ySummary.style.top = `${this.margin.top}px`;
    this.validYBrush = false;

    this.ySummary.style.border = `1px solid #cccccc`;
    this.ySummary.style.borderRight = `1px solid black`;

    this.ySummaryCtx = this.ySummary.getContext("2d")!;
    // this.ySummaryCtx.scale(this.displayDensity, this.displayDensity);
    this.ySummaryY = scaleLinear();
    this.ySummaryX = scaleLinear().domain([1, 0]);

    this.axes.appendChild(this.ySummary);

    this.yAxis = document.createElement("canvas");
    this.yAxis.className = "yAxis";
    this.yAxis.style.position = "fixed";
    this.yAxis.style.top = `${this.margin.top}px`;
    this.yAxis.style.left = `${this.margin.left / 2}px`;

    this.yAxis.style.borderRight = `1px solid black`;

    this.yAxisCtx = this.yAxis.getContext("2d")!;

    this.axes.appendChild(this.yAxis);

    this.xSummary = document.createElement("canvas");
    this.xSummary.className = "xSummary";
    this.xSummary.style.position = "fixed";
    this.xSummary.style.left = `${this.margin.left}px`;
    this.validXBrush = false;

    this.xSummary.style.border = `1px solid #cccccc`;
    this.xSummary.style.borderBottom = `1px solid black`;

    this.xSummaryCtx = this.xSummary.getContext("2d")!;
    // this.xSummaryCtx.scale(this.displayDensity, this.displayDensity);
    this.xSummaryY = scaleLinear().domain([1, 0]);
    this.xSummaryX = scaleLinear();

    this.axes.appendChild(this.xSummary);

    this.xAxis = document.createElement("canvas");
    this.xAxis.className = "xAxis";
    this.xAxis.style.position = "fixed";
    this.xAxis.style.left = `${this.margin.left}px`;
    this.xAxis.style.top = `${this.margin.top / 2}px`;
    this.xAxis.style.borderBottom = `1px solid black`;

    this.xAxisCtx = this.xAxis.getContext("2d")!;

    this.axes.appendChild(this.xAxis);

    this.timeline = document.createElement("div");
    this.timeline.style.position = "relative";
    this.timeline.style.left = `${this.margin.left}px`;
    this.timeline.style.top = `${this.margin.top}px`;

    this.wrapper.appendChild(this.marginWrapper);
    this.marginWrapper.appendChild(this.axes);
    this.marginWrapper.appendChild(this.timeline);
    this.timeline.appendChild(this.canvas);
    this.wrapper.appendChild(this.overflowElm);
    this.wrapper.appendChild(this.canvas);
    this.target.appendChild(this.wrapper);

    this.wrapper.addEventListener("scroll", () => {
      this.onScroll();
    });

    this.resize(dimensions);
    this.setTransform();
  }

  resize(dimensions: { width: number; height: number }) {
    this.clearAll();
    this.dimensions = { ...this.dimensions, ...dimensions };
    this.wrapper.style.width = `${dimensions.width}px`;
    this.wrapper.style.height = `${dimensions.height}px`;

    this.canvas.width =
      (dimensions.width - this.margin.left - this.margin.right) *
      this.displayDensity;
    this.canvas.height =
      (dimensions.height - this.margin.top) * this.displayDensity;
    this.canvas.style.width = `${dimensions.width -
      this.margin.left -
      this.margin.right}px`;
    this.canvas.style.height = `${dimensions.height - this.margin.top}px`;

    this.ySummary.width = (this.margin.left / 2) * this.displayDensity;
    this.ySummary.height =
      (dimensions.height - this.margin.top) * this.displayDensity;
    this.ySummary.style.width = `${this.margin.left / 2}px`;
    this.ySummary.style.height = `${dimensions.height - this.margin.top}px`;
    this.ySummaryY.range([0, this.ySummary.height / this.displayDensity]);
    this.ySummaryX.range([0, this.ySummary.width]);

    this.yAxis.width = (this.margin.left / 2) * this.displayDensity;
    this.yAxis.height =
      (dimensions.height - this.margin.top) * this.displayDensity;
    this.yAxis.style.width = `${this.margin.left / 2}px`;
    this.yAxis.style.height = `${dimensions.height - this.margin.top}px`;

    this.xSummary.width =
      (dimensions.width - this.margin.left - this.margin.right) *
      this.displayDensity;
    this.xSummary.height = (this.margin.top / 2) * this.displayDensity;
    this.xSummary.style.width = `${dimensions.width -
      this.margin.left -
      this.margin.right}px`;
    this.xSummary.style.height = `${this.margin.top / 2}px`;
    this.xSummaryY.range([0, this.xSummary.height]);
    this.xSummaryX.range([0, this.xSummary.width / this.displayDensity]);

    this.xAxis.width =
      (dimensions.width - this.margin.left - this.margin.right) *
      this.displayDensity;
    this.xAxis.height = (this.margin.top / 2) * this.displayDensity;
    this.xAxis.style.width = `${dimensions.width -
      this.margin.left -
      this.margin.right}px`;
    this.xAxis.style.height = `${this.margin.top / 2}px`;

    // We need to set font alignment after resize.
    this.ctx.font = "normal normal 10px monospace";
    this.ctx.textBaseline = "top";
  }

  private setTransform() {
    this.ctx.resetTransform();
    this.ctx.scale(this.scale(), this.scale());

    this.ySummaryCtx.resetTransform();
    this.ySummaryCtx.scale(this.displayDensity, this.displayDensity);

    this.xSummaryCtx.resetTransform();
    this.xSummaryCtx.scale(this.displayDensity, this.displayDensity);

    this.yAxisCtx.resetTransform();
    this.yAxisCtx.scale(this.displayDensity, this.scale());

    this.xAxisCtx.resetTransform();
    this.xAxisCtx.scale(this.scale(), this.displayDensity);
  }

  onScroll() {
    this.scrollOffset = {
      x: this.wrapper.scrollLeft,
      y: this.wrapper.scrollTop
    };

    if (this.lastOps) {
      this.internalRender(this.lastOps);
    }
  }

  private scale() {
    return this.displayDensity + this.zoomLevel;
  }

  private timelineMouse({ x, y }: { x: number; y: number }) {
    return {
      x: Math.max(0, x - this.margin.left),
      y: Math.max(0, y - this.margin.top)
    };
  }

  private toTimelinePosition({
    x,
    y
  }: {
    x: number;
    y: number;
  }): { x: number; y: number } {
    const timelineMouse = this.timelineMouse({ x, y });

    const s = this.displayDensity;
    const timelineX = s * timelineMouse.x + this.wrapper.scrollLeft;
    const timelineY = s * timelineMouse.y + this.wrapper.scrollTop;

    return {
      x: timelineX,
      y: timelineY
    };
  }

  private timelineWidth(): number {
    if (this.lastOps == null) {
      return 0;
    }

    return this.lastOps.xMax * this.scale();
  }

  private timelineHeight(): number {
    if (this.lastOps == null) {
      return 0;
    }

    return this.lastOps.yMax * this.scale();
  }
  private maxHeight(): number {
    return this.margin.top + this.timelineHeight();
  }

  private maxWidth(): number {
    return this.margin.left + this.margin.right + this.timelineWidth();
  }

  private ySummaryBrushRange(): {
    x: number;
    y: number;
    width: number;
    height: number;
    rect: [number, number, number, number];
  } {
    const shownY = Math.min(1, this.canvas.height / this.timelineHeight());
    const offsetY = this.wrapper.scrollTop / this.timelineHeight();

    const rect: [number, number, number, number] = [
      0,
      (this.ySummary.height / this.displayDensity) * offsetY,
      this.ySummary.width / this.displayDensity,
      (this.ySummary.height / this.displayDensity) * shownY
    ];

    return {
      x: rect[0],
      y: rect[1],
      width: rect[2],
      height: rect[3],
      rect
    };
  }
  private xSummaryBrushRange(): {
    x: number;
    y: number;
    width: number;
    height: number;
    rect: [number, number, number, number];
  } {
    const shownX = Math.min(1, this.canvas.width / this.timelineWidth());
    const offsetX = this.wrapper.scrollLeft / this.timelineWidth();

    const rect: [number, number, number, number] = [
      (this.xSummary.width / this.displayDensity) * offsetX,
      0,
      (this.xSummary.width / this.displayDensity) * shownX,
      this.xSummary.height / this.displayDensity
    ];

    return {
      x: rect[0],
      y: rect[1],
      width: rect[2],
      height: rect[3],
      rect
    };
  }

  private clearAll() {
    this.ctx.resetTransform();
    this.yAxisCtx.resetTransform();
    this.xAxisCtx.resetTransform();

    this.ctx.clearRect(
      0,
      0,
      this.dimensions.width * this.displayDensity,
      this.dimensions.height * this.displayDensity
    );

    this.ySummaryCtx.clearRect(
      0,
      0,
      this.ySummary.width * this.displayDensity,
      this.ySummary.height * this.displayDensity
    );

    this.xSummaryCtx.clearRect(
      0,
      0,
      this.xAxis.width * this.displayDensity,
      this.xAxis.height * this.displayDensity
    );

    this.yAxisCtx.clearRect(
      0,
      0,
      this.yAxis.width * this.displayDensity,
      this.yAxis.height * this.displayDensity
    );

    this.xAxisCtx.clearRect(
      0,
      0,
      this.xAxis.width * this.displayDensity,
      this.xAxis.height * this.displayDensity
    );
  }

  private internalRender(instructions: RenderInstructions) {
    this.lastOps = instructions;
    this.clearAll();
    this.overflowElm.style.width = `${this.maxWidth()}px`;
    this.overflowElm.style.height = `${this.maxHeight()}px`;

    this.setTransform();

    const transformScrollX = this.scrollOffset.x / this.scale();
    const transformScrollY = this.scrollOffset.y / this.scale();
    const fontSize = parseInt(this.ctx.font);

    for (const opt of instructions.opts) {
      if (this.activeUUID === opt.uuid) {
        this.ctx.fillStyle = "red";
      } else {
        this.ctx.fillStyle = opt.fill;
      }

      this.ctx.fillRect(
        opt.x - transformScrollX,
        opt.y - transformScrollY,
        opt.width,
        opt.height
      );
      if (opt.text != null && opt.text.text != null) {
        if (opt.text.fill != null) {
          this.ctx.fillStyle = opt.text.fill;
        }

        this.ctx.fillText(
          opt.text.text.slice(0, Math.floor(opt.width / fontSize) + 3),
          opt.x + (opt.text.offsetX || 0) - transformScrollX,
          opt.y +
            (opt.text.offsetY || opt.height / 2 - fontSize / 2) -
            transformScrollY
        );
      }
    }

    this.ySummaryY.domain([0, instructions.ySummary.length]);

    this.ySummaryCtx.fillStyle = "#cccccc";

    for (const yS of instructions.ySummary) {
      this.ySummaryCtx.fillRect(
        this.ySummaryX(yS.pct),
        this.ySummaryY(yS.index),
        this.ySummaryX(0) - this.ySummaryX(yS.pct),
        this.ySummaryY(1)
      );
      this.yAxisCtx.fillStyle = "#b7b7d1";

      if (yS.y !== undefined && yS.height !== undefined) {
        this.yAxisCtx.fillRect(
          this.ySummaryX(yS.pct),
          yS.y - transformScrollY,
          this.ySummaryX(0) - this.ySummaryX(yS.pct),
          yS.height
        );

        this.yAxisCtx.fillStyle = "black";

        yS.text &&
          this.yAxisCtx.fillText(
            yS.text.slice(0, Math.floor(this.yAxis.width / fontSize) + 3),
            0,
            yS.y - transformScrollY + yS.height / 2
          );
      }
    }

    this.ySummaryCtx.strokeStyle = "blue";
    this.ySummaryCtx.fillStyle = "rgba(0,0,255,.1)";
    const yBrushCoords = this.ySummaryBrushRange();

    const yBrush: [number, number, number, number] = yBrushCoords.rect;

    this.ySummaryCtx.strokeRect(...yBrush);
    this.ySummaryCtx.fillRect(...yBrush);

    this.xSummaryX.domain([0, instructions.xSummary.length]);

    this.xSummaryCtx.fillStyle = "#cccccc";

    for (const [i, xS] of instructions.xSummary.entries()) {
      this.xSummaryCtx.fillRect(
        this.xSummaryX(xS.index),
        this.xSummaryY(xS.pct),
        this.xSummaryX(1),
        this.xSummaryY(0) - this.xSummaryY(xS.pct)
      );

      this.xAxisCtx.fillStyle = "#b7b7d1";

      if (xS.x !== undefined && xS.width !== undefined) {
        this.xAxisCtx.fillRect(
          xS.x - transformScrollX,
          this.xSummaryY(xS.pct),
          xS.width,
          this.xSummaryY(0) - this.xSummaryY(xS.pct)
        );
        this.xAxisCtx.fillStyle = "black";

        if (xS.text && i % 3 === 0) {
          this.xAxisCtx.fillText(
            xS.text,
            xS.x - transformScrollX,
            this.xAxis.height
          );
        }
      }
    }

    this.xSummaryCtx.strokeStyle = "blue";
    this.xSummaryCtx.fillStyle = "rgba(0,0,255,.1)";
    const xBrushCoords = this.xSummaryBrushRange();

    const xBrush: [number, number, number, number] = xBrushCoords.rect;
    this.xSummaryCtx.strokeRect(...xBrush);
    this.xSummaryCtx.fillRect(...xBrush);
  }

  private zoom({
    changeAmount,
    mousePosition
  }: {
    changeAmount: number;
    mousePosition: { x: number; y: number };
  }): void {
    if (this.lastOps == null) {
      return;
    }

    const originalScrollLeft = this.wrapper.scrollLeft;
    const originalScrollTop = this.wrapper.scrollTop;
    const { x, y } = this.toTimelinePosition(mousePosition);
    const timelineXPercent = x / this.timelineWidth();
    const timelineYPercent = y / this.timelineHeight();

    const originalZoomLevel = this.zoomLevel;
    this.zoomLevel += changeAmount;
    if (this.scale() <= MIN_ZOOM || this.scale() <= MIN_ZOOM) {
      this.zoomLevel = originalZoomLevel;
      return;
    }

    this.wrapper.scrollTo(
      timelineXPercent * this.timelineWidth() - (x - originalScrollLeft),
      timelineYPercent * this.timelineHeight() - (y - originalScrollTop)
    );

    this.render(this.lastOps);
  }

  zoomIn(mousePosition: { x: number; y: number }) {
    this.zoom({ changeAmount: ZOOM_AMOUNT, mousePosition });
  }

  zoomOut(mousePosition: { x: number; y: number }) {
    this.zoom({ changeAmount: -ZOOM_AMOUNT, mousePosition });
  }

  click({ x, y, target }: { x: number; y: number; target: HTMLCanvasElement }) {
    if (target === this.ySummary) {
      this.wrapper.scrollTo(
        this.wrapper.scrollLeft,
        (this.ySummaryY.invert(y) / this.ySummaryY.domain()[1]) *
          this.timelineHeight() -
          this.canvas.height / 2
      );
    } else if (target === this.xSummary) {
      this.wrapper.scrollTo(
        (this.xSummaryX.invert(x) / this.xSummaryX.domain()[1]) *
          this.timelineWidth() -
          this.canvas.width / 2,
        this.wrapper.scrollTop
      );
    } else {
      const match = this.entryFromPosition({ x, y });
      if (match != null) {
        console.log(match);
      }
    }
  }

  grab() {
    this.target.style.cursor = "grabbing";
  }

  startDragging({
    x,
    y,
    target
  }: {
    x: number;
    y: number;
    target: HTMLCanvasElement;
  }) {
    this.target.style.cursor = "grab";

    if (target === this.ySummary) {
      const yBrushCoords = this.ySummaryBrushRange();
      if (y >= yBrushCoords.y && y <= yBrushCoords.y + yBrushCoords.height) {
        this.validYBrush = true;
      }
    } else if (target === this.xSummary) {
      const xBrushCoords = this.xSummaryBrushRange();
      if (x >= xBrushCoords.x && x <= xBrushCoords.x + xBrushCoords.width) {
        this.validXBrush = true;
      }
    }
  }

  stopDragging() {
    this.target.style.cursor = "initial";
    this.validYBrush = false;
    this.validXBrush = false;
  }

  drag(
    { x, y }: { x: number; y: number },
    start: { x: number; y: number; target: HTMLCanvasElement } | null
  ) {
    if (start && start.target === this.ySummary) {
      if (this.validYBrush) {
        this.wrapper.scrollBy(
          0,
          -(this.ySummaryY.invert(y) / this.ySummaryY.domain()[1]) *
            this.timelineHeight()
        );
      }
    } else if (start && start.target === this.xSummary) {
      if (this.validXBrush) {
        this.wrapper.scrollBy(
          -(this.xSummaryX.invert(x) / this.xSummaryX.domain()[1]) *
            this.timelineWidth(),
          0
        );
      }
    } else {
      this.wrapper.scrollBy(x, y);
    }
  }

  private entryFromPosition(mousePosition: {
    x: number;
    y: number;
  }): TimelineEvent | undefined {
    if (this.lastOps == null) {
      return undefined;
    }

    const { x, y } = this.toTimelinePosition(mousePosition);

    const row = Math.floor(this.lastOps.yUnit.invert(y / this.scale()));
    const timestamp = this.lastOps.xUnit.invert(x / this.scale());

    return binarySearch(timestamp, this.lastOps.rowMap[row]!);
  }

  mouseMove(mousePosition: { x: number; y: number }) {
    if (this.lastOps == null) {
      return;
    }

    const match = this.entryFromPosition(mousePosition);

    if (match == null && this.activeUUID != null) {
      this.activeUUID = undefined;
      this.render(this.lastOps);
      return;
    }

    if (match != null && match.uuid !== this.activeUUID) {
      this.activeUUID = match.uuid;
      this.render(this.lastOps);
    }
  }

  render(instructions: RenderInstructions) {
    requestAnimationFrame(() => this.internalRender(instructions));
  }
}
