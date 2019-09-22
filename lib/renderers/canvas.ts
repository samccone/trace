import { Renderer } from "./renderer";
import { RenderInstructions } from "../format";
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
  private ySummaryY: ScaleLinear<number, number>;
  private ySummaryX: ScaleLinear<number, number>;

  private ySummaryCtx: CanvasRenderingContext2D;
  private yAxis: HTMLCanvasElement;
  private yAxisCtx: CanvasRenderingContext2D;
  private xSummary: HTMLCanvasElement;
  private xSummaryCtx: CanvasRenderingContext2D;
  private xSummaryY: ScaleLinear<number, number>;
  private xSummaryX: ScaleLinear<number, number>;
  private xAxis: HTMLCanvasElement;
  private xAxisCtx: CanvasRenderingContext2D;
  private marginWrapper: HTMLElement;
  private timeline: HTMLElement;
  private scrollOffset: { x: number; y: number } = { x: 0, y: 0 };
  private lastOps?: RenderInstructions;
  private zoomLevel: number = 0;
  private margin: { top: number; left: number; right: number };

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

    this.ySummary.style.border = `1px solid #cccccc`;
    this.ySummary.style.borderRight = `1px solid black`;

    this.ySummaryCtx = this.ySummary.getContext("2d")!;
    this.ySummaryCtx.scale(this.displayDensity, this.displayDensity);
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

    this.xSummary.style.border = `1px solid #cccccc`;
    this.xSummary.style.borderBottom = `1px solid black`;

    this.xSummaryCtx = this.xSummary.getContext("2d")!;
    this.xSummaryCtx.scale(this.displayDensity, this.displayDensity);
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

  onClick({ x, y }: { x: number; y: number }) {
    const wrapperX = x * this.displayDensity - this.margin.left;
    const wrapperY = y * this.displayDensity - this.margin.top;

    if (wrapperX < 0 || wrapperY < 0) {
      // skip
      return;
    }

    const timelineX = wrapperX + this.wrapper.scrollLeft;
    const timelineY = wrapperY + this.wrapper.scrollTop;

    const row = Math.floor(this.lastOps!.yUnit.invert(timelineY));
    const timestamp = this.lastOps!.xUnit.invert(timelineX);
    const match = binarySearch(timestamp, this.lastOps!.rowMap[row]!);

    if (match != null) {
      console.log(match);
    }
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
    this.ySummaryX.range([0, this.ySummary.width / this.displayDensity]);

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
    this.xSummaryY.range([0, this.xSummary.height / this.displayDensity]);
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
    this.ctx.scale(this.xScale(), this.yScale());

    this.yAxisCtx.resetTransform();
    this.yAxisCtx.scale(1, this.yScale());

    this.xAxisCtx.resetTransform();
    this.xAxisCtx.scale(this.xScale(), 1);
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

  private xScale() {
    return this.displayDensity + this.zoomLevel;
  }

  private yScale() {
    return this.displayDensity + this.zoomLevel;
  }

  private timelineWidth(): number {
    if (this.lastOps == null) {
      return 0;
    }

    return this.lastOps.xMax * this.xScale();
  }

  private timelineHeight(): number {
    if (this.lastOps == null) {
      return 0;
    }

    return this.lastOps.yMax * this.yScale();
  }
  private maxHeight(): number {
    return this.margin.top + this.timelineHeight();
  }

  private maxWidth(): number {
    return this.margin.left + this.margin.right + this.timelineWidth();
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
      this.xAxis.width * this.displayDensity * 1,
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
      this.xAxis.width * this.displayDensity * 1,
      this.xAxis.height * this.displayDensity
    );
  }

  private internalRender(instructions: RenderInstructions) {
    this.lastOps = instructions;
    this.clearAll();
    this.overflowElm.style.width = `${this.maxWidth()}px`;
    this.overflowElm.style.height = `${this.maxHeight()}px`;

    this.setTransform();

    const transformScrollX = this.scrollOffset.x / this.xScale();
    const transformScrollY = this.scrollOffset.y / this.yScale();
    const fontSize = parseInt(this.ctx.font);

    for (const opt of instructions.opts) {
      this.ctx.fillStyle = opt.fill;
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

    const shownY = Math.min(1, this.canvas.height / this.timelineHeight());
    const offsetY = this.wrapper.scrollTop / this.timelineHeight();

    this.ySummaryCtx.strokeStyle = "blue";
    this.ySummaryCtx.fillStyle = "rgba(0,0,255,.1)";

    const yBrush: [number, number, number, number] = [
      0,
      (this.ySummary.width / this.displayDensity) * offsetY,
      this.ySummary.width / this.displayDensity,
      (this.ySummary.height / this.displayDensity) * shownY
    ];

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

    const shownX = Math.min(1, this.canvas.width / this.timelineWidth());
    const offsetX = this.wrapper.scrollLeft / this.timelineWidth();

    this.xSummaryCtx.strokeStyle = "blue";
    this.xSummaryCtx.fillStyle = "rgba(0,0,255,.1)";
    const xBrush: [number, number, number, number] = [
      (this.xSummary.width / this.displayDensity) * offsetX,
      0,
      (this.xSummary.width / this.displayDensity) * shownX,
      this.xSummary.height / this.displayDensity
    ];
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

    const viewportMouseX = Math.max(
      0,
      mousePosition.x * this.displayDensity -
        this.margin.left -
        this.margin.right
    );
    const viewportMouseY = Math.max(
      0,
      mousePosition.y * this.displayDensity - this.margin.top
    );
    const timelineXPercent =
      (viewportMouseX + this.wrapper.scrollLeft) / this.timelineWidth();
    const timelineYPercent =
      (viewportMouseY + this.wrapper.scrollTop) / this.timelineHeight();

    const originalZoomLevel = this.zoomLevel;
    this.zoomLevel += changeAmount;
    if (this.xScale() <= MIN_ZOOM || this.yScale() <= MIN_ZOOM) {
      this.zoomLevel = originalZoomLevel;
      return;
    }

    this.wrapper.scrollTo(
      timelineXPercent * this.timelineWidth() - viewportMouseX,
      timelineYPercent * this.timelineHeight() - viewportMouseY
    );

    this.render(this.lastOps);
  }

  zoomIn(mousePosition: { x: number; y: number }) {
    this.zoom({ changeAmount: ZOOM_AMOUNT, mousePosition });
  }

  zoomOut(mousePosition: { x: number; y: number }) {
    this.zoom({ changeAmount: -ZOOM_AMOUNT, mousePosition });
  }

  startDragging() {
    this.target.style.cursor = "grab";
  }

  grab() {
    this.target.style.cursor = "grabbing";
  }

  stopDragging() {
    this.target.style.cursor = "initial";
  }

  scrollBy(
    { x, y }: { x: number; y: number },
    start: { x: number; y: number } | null
  ) {
    // console.log(start);
    if (
      start &&
      (start.x < this.margin.left / 2 && start.y > this.margin.top)
    ) {
      console.log(x, this.ySummaryY.invert(x));
    } else {
      this.wrapper.scrollBy(x, y);
    }
  }

  render(instructions: RenderInstructions) {
    requestAnimationFrame(() => this.internalRender(instructions));
  }
}
