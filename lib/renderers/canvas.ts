import { RenderOp, Renderer } from "./renderer";
import { SummaryEvent } from "../format";
import { scaleLinear } from "d3-scale";

interface RenderInstructions {
  opts: RenderOp[];
  xMax: number;
  yMax: number;
  ySummary: SummaryEvent[];
  xSummary: SummaryEvent[];
}

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
  private ySummaryCtx: CanvasRenderingContext2D;
  private xSummary: HTMLCanvasElement;
  private xSummaryCtx: CanvasRenderingContext2D;
  private marginWrapper: HTMLElement;
  private timeline: HTMLElement;
  private scrollOffset: { x: number; y: number } = { x: 0, y: 0 };
  private lastOps?: RenderInstructions;
  private zoomLevel: number = 0;
  private margin: { top: number; left: number };

  constructor(
    public readonly dimensions: {
      width: number;
      height: number;
      margin?: { top: number; left: number };
    },
    public readonly target: Element
  ) {
    this.margin = this.dimensions.margin || { top: 100, left: 100 };

    this.overflowElm = document.createElement("div");
    this.overflowElm.style.width = "1px";
    this.overflowElm.style.height = "1px";
    this.wrapper = document.createElement("div");
    this.wrapper.style.overflow = "scroll";
    this.wrapper.style.zIndex = "1";
    this.wrapper.style.width = `${dimensions.width}px`;
    this.wrapper.style.height = `${dimensions.height}px`;
    this.wrapper.style.position = "relative";

    this.displayDensity = window.devicePixelRatio;
    this.canvas = document.createElement("canvas");
    this.canvas.width =
      (dimensions.width - this.margin.left) * this.displayDensity;
    this.canvas.height =
      (dimensions.height - this.margin.top) * this.displayDensity;
    this.canvas.style.width = `${dimensions.width - this.margin.left}px`;
    this.canvas.style.height = `${dimensions.height - this.margin.top}px`;
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.position = "fixed";
    this.canvas.style.left = `${this.margin.left}px`;
    this.canvas.style.top = `${this.margin.top}px`;

    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.font = "normal normal 10px monospace";
    this.ctx.textBaseline = "top";

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
    this.ySummary.width = (this.margin.left / 2) * this.displayDensity;
    this.ySummary.height =
      (dimensions.height - this.margin.top - 20) * this.displayDensity;
    this.ySummary.style.width = `${this.margin.left / 2}px`;
    this.ySummary.style.height = `${dimensions.height -
      this.margin.top -
      20}px`;
    this.ySummary.style.border = `1px solid #cccccc`;

    this.ySummaryCtx = this.ySummary.getContext("2d")!;

    this.axes.appendChild(this.ySummary);

    this.xSummary = document.createElement("canvas");
    this.xSummary.className = "xSummary";
    this.xSummary.style.position = "fixed";
    this.xSummary.style.left = `${this.margin.left}px`;
    this.xSummary.width =
      (dimensions.width - this.margin.left - 20) * this.displayDensity;
    this.xSummary.height = (this.margin.top / 2) * this.displayDensity;
    this.xSummary.style.width = `${dimensions.width - this.margin.left - 20}px`;
    this.xSummary.style.height = `${this.margin.top / 2}px`;
    this.xSummary.style.border = `1px solid #cccccc`;

    this.xSummaryCtx = this.xSummary.getContext("2d")!;

    this.axes.appendChild(this.xSummary);

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

    this.setTransform();
  }

  private setTransform() {
    this.ctx.resetTransform();
    this.ctx.scale(this.xScale(), this.yScale());
  }

  onScroll() {
    this.scrollOffset = {
      x: this.wrapper.scrollLeft,
      y: this.wrapper.scrollTop,
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

  private internalRender(instructions: RenderInstructions) {
    this.lastOps = instructions;
    this.ctx.resetTransform();
    this.ctx.clearRect(
      0,
      0,
      this.dimensions.width * this.displayDensity,
      this.dimensions.height * this.displayDensity
    );
    this.overflowElm.style.width = `${this.margin.top +
      instructions.xMax * this.xScale()}px`;
    this.overflowElm.style.height = `${this.margin.left +
      instructions.yMax * this.yScale()}px`;
    this.setTransform();

    const transformScrollX = this.scrollOffset.x / this.xScale();
    const transformScrollY = this.scrollOffset.y / this.yScale();

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

        const fontSize = parseInt(this.ctx.font);

        this.ctx.fillText(
          opt.text.text.slice(0, Math.floor(opt.width / fontSize) + 3),
          opt.x + (opt.text.offsetX || 0) - transformScrollX,
          opt.y +
            (opt.text.offsetY || opt.height / 2 - fontSize / 2) -
            transformScrollY
        );
      }
    }

    const ySummaryY = scaleLinear()
      .domain([0, instructions.ySummary.length])
      .range([0, this.ySummary.height / this.displayDensity]);

    const ySummaryX = scaleLinear()
      .domain([1, 0])
      .range([0, this.ySummary.width / this.displayDensity]);
    this.ySummaryCtx.fillStyle = "#cccccc";

    for (const yS of instructions.ySummary) {
      this.ySummaryCtx.fillRect(
        ySummaryX(yS.pct),
        ySummaryY(yS.index),
        ySummaryX(0) - ySummaryX(yS.pct),
        ySummaryY(1)
      );
    }

    const xSummaryX = scaleLinear()
      .domain([0, instructions.xSummary.length])
      .range([0, this.xSummary.width / this.displayDensity]);

    const xSummaryY = scaleLinear()
      .domain([1, 0])
      .range([0, this.xSummary.height / this.displayDensity]);

    this.xSummaryCtx.fillStyle = "#cccccc";

    for (const xS of instructions.xSummary) {
      this.xSummaryCtx.fillRect(
        xSummaryX(xS.index),
        xSummaryY(xS.pct),
        xSummaryX(1),
        xSummaryY(0) - xSummaryY(xS.pct)
      );
    }
  }

  private zoom(changeAmount: number): void {
    const originalZoomLevel = this.zoomLevel;
    this.zoomLevel += changeAmount;
    if (this.xScale() <= MIN_ZOOM || this.yScale() <= MIN_ZOOM) {
      this.zoomLevel = originalZoomLevel;
      return this.zoom(changeAmount / 2);
    } else {
      if (this.lastOps) {
        this.render(this.lastOps)
      }
    }
  }

  zoomIn() {
    this.zoom(ZOOM_AMOUNT);
  }

  zoomOut() {
    this.zoom(-ZOOM_AMOUNT);
  }

  render(instructions: RenderInstructions) {
    requestAnimationFrame(() => this.internalRender(instructions));
  }
}
