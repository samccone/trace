import { Renderer } from "./renderer";
import { Cursor } from "../cursor";
import {
  RenderInstructions,
  TimelineEventInteraction,
  InternalTimelineEvent,
  TimelineZoomEvent
} from "../format";
import { scaleLinear, ScaleLinear } from "d3";
import { binarySearch } from "../search";
import { Theme } from "../format";
import { toRGB } from "../hex";

const ZOOM_AMOUNT = 0.2;
const MIN_ZOOM = 1;

export class CanvasRenderer<T> implements Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private wrapper: HTMLElement;
  private selectedRange: {
    start: { x: number; y: number } | null;
    end: { x: number; y: number } | null;
  };

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
  private pendingRender: number | undefined;

  private marginWrapper: HTMLElement;
  private timeline: HTMLElement;
  private scrollOffset: { x: number; y: number } = { x: 0, y: 0 };
  private lastOps?: RenderInstructions<T>;
  private zoomLevel: number = 1;
  private margin: { top: number; left: number; right: number };
  private hoverUUID: string | undefined;
  private selectedUUID: string | undefined;
  private cursor: Cursor;

  constructor(
    public dimensions: {
      width: number;
      height: number;
      margin?: { top: number; left: number; right: number; bottom: number };
    },
    public readonly theme: Theme,
    public readonly target: HTMLElement
  ) {
    this.cursor = new Cursor(target);
    this.margin = this.dimensions.margin || { top: 100, left: 100, right: 200 };
    this.selectedRange = { start: null, end: null };
    this.overflowElm = document.createElement("div");
    this.overflowElm.style.width = "1px";
    this.overflowElm.style.height = "1px";

    this.wrapper = document.createElement("div");
    this.wrapper.style.overflow = "scroll";
    this.wrapper.style.zIndex = "1";
    this.wrapper.style.position = "relative";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "trace";
    this.ctx = this.canvas.getContext("2d")!;

    this.canvas.style.pointerEvents = "none";
    this.canvas.style.position = "sticky";
    this.canvas.style.left = `${this.margin.left}px`;
    this.canvas.style.top = `${this.margin.top}px`;

    this.marginWrapper = document.createElement("div");
    this.marginWrapper.className = "margin-wrapper";
    this.marginWrapper.style.position = "sticky";
    this.marginWrapper.style.top = "0px";
    this.marginWrapper.style.left = "0px";
    this.axes = document.createElement("div");
    this.axes.style.position = "relative";
    this.axes.style.top = "0px";
    this.axes.style.left = "0px";
    this.axes.className = "axes";

    this.ySummary = document.createElement("canvas");
    this.ySummary.className = "ySummary";
    this.ySummary.style.position = "absolute";
    this.ySummary.style.top = `${this.margin.top}px`;
    this.validYBrush = false;

    this.ySummaryCtx = this.ySummary.getContext("2d")!;
    this.ySummaryY = scaleLinear();
    this.ySummaryX = scaleLinear().domain([1, 0]);

    this.axes.appendChild(this.ySummary);

    this.yAxis = document.createElement("canvas");
    this.yAxis.className = "yAxis";
    this.yAxis.style.position = "absolute";
    this.yAxis.style.top = `${this.margin.top}px`;
    this.yAxis.style.left = `${this.margin.left / 2}px`;

    this.yAxisCtx = this.yAxis.getContext("2d")!;

    this.axes.appendChild(this.yAxis);

    this.xSummary = document.createElement("canvas");
    this.xSummary.className = "xSummary";
    this.xSummary.style.position = "absolute";
    this.xSummary.style.left = `${this.margin.left}px`;
    this.validXBrush = false;

    this.xSummaryCtx = this.xSummary.getContext("2d")!;
    this.xSummaryY = scaleLinear().domain([1, 0]);
    this.xSummaryX = scaleLinear();

    this.axes.appendChild(this.xSummary);

    this.xAxis = document.createElement("canvas");
    this.xAxis.className = "xAxis";
    this.xAxis.style.position = "absolute";
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
    this.wrapper.appendChild(this.canvas);
    this.wrapper.appendChild(this.overflowElm);
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

    this.canvas.width = dimensions.width - this.margin.left - this.margin.right;
    this.canvas.height = dimensions.height - this.margin.top;
    this.canvas.style.width = `${dimensions.width -
      this.margin.left -
      this.margin.right}px`;
    this.canvas.style.height = `${dimensions.height - this.margin.top}px`;
    this.overflowElm.style.marginTop = `-${this.canvas.style.height}`;

    this.ySummary.width = this.margin.left / 2;
    this.ySummary.height = dimensions.height - this.margin.top;
    this.ySummary.style.width = `${this.margin.left / 2}px`;
    this.ySummary.style.height = `${dimensions.height - this.margin.top}px`;
    this.ySummaryY.range([0, this.ySummary.height]);
    this.ySummaryX.range([0, this.ySummary.width]);

    this.yAxis.width = this.margin.left / 2;
    this.yAxis.height = dimensions.height - this.margin.top;
    this.yAxis.style.width = `${this.margin.left / 2}px`;
    this.yAxis.style.height = `${dimensions.height - this.margin.top}px`;
    this.yAxisCtx.font = `normal normal 12px "Barlow"`;

    this.xSummary.width =
      dimensions.width - this.margin.left - this.margin.right;
    this.xSummary.height = this.margin.top / 2;
    this.xSummary.style.width = `${dimensions.width -
      this.margin.left -
      this.margin.right}px`;
    this.xSummary.style.height = `${this.margin.top / 2}px`;
    this.xSummaryY.range([0, this.xSummary.height]);
    this.xSummaryX.range([0, this.xSummary.width]);

    this.xAxis.width = dimensions.width - this.margin.left - this.margin.right;
    this.xAxis.height = this.margin.top / 2;
    this.xAxis.style.width = `${dimensions.width -
      this.margin.left -
      this.margin.right}px`;
    this.xAxis.style.height = `${this.margin.top / 2}px`;
    this.xAxisCtx.font = `normal normal 12px "Barlow"`;

    // We need to set font alignment after resize.
    this.ctx.font = `normal normal 12px "Barlow"`;
    this.ctx.textBaseline = "top";
  }

  private setTransform() {
    this.ctx.resetTransform();
    this.ctx.scale(this.scale(), this.scale());

    this.ySummaryCtx.resetTransform();

    this.xSummaryCtx.resetTransform();
  }

  onScroll() {
    this.scrollOffset = {
      x: this.wrapper.scrollLeft,
      y: this.wrapper.scrollTop
    };

    if (this.lastOps) {
      this.render(this.lastOps);
    }
  }

  private scale() {
    return this.zoomLevel;
  }

  private overTopMargin({ y }: { y: number }): boolean {
    return y <= this.margin.top;
  }

  private overMargin({ x, y }: { x: number; y: number }): boolean {
    if (x <= this.margin.left) {
      return true;
    }

    if (x >= this.dimensions.width - this.margin.right) {
      return true;
    }

    if (this.overTopMargin({ y })) {
      return true;
    }

    return false;
  }

  private toTimelinePosition({
    x,
    y
  }: {
    x: number;
    y: number;
  }): { x: number; y: number } {
    const timelineMouse = {
      x: Math.max(0, x - this.margin.left),
      y: Math.max(0, y - this.margin.top)
    };

    const timelineX = timelineMouse.x + this.scrollOffset.x;
    const timelineY = timelineMouse.y + this.scrollOffset.y;

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

  private ySummaryBrushRange(): {
    x: number;
    y: number;
    width: number;
    height: number;
    rect: [number, number, number, number];
  } {
    const shownY = Math.min(1, this.canvas.height / this.timelineHeight());
    const offsetY = this.scrollOffset.y / this.timelineHeight();

    const rect: [number, number, number, number] = [
      0,
      this.ySummary.height * offsetY,
      this.ySummary.width,
      this.ySummary.height * shownY
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
    const offsetX = this.scrollOffset.x / this.timelineWidth();

    const rect: [number, number, number, number] = [
      this.xSummary.width * offsetX,
      0,
      this.xSummary.width * shownX,
      this.xSummary.height
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

    this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);

    this.ySummaryCtx.clearRect(0, 0, this.ySummary.width, this.ySummary.height);

    this.xSummaryCtx.clearRect(0, 0, this.xAxis.width, this.xAxis.height);

    this.yAxisCtx.clearRect(0, 0, this.yAxis.width, this.yAxis.height);

    this.xAxisCtx.clearRect(0, 0, this.xAxis.width, this.xAxis.height);
  }

  private writeText(
    ctx: CanvasRenderingContext2D,
    opts: [string, number, number],
    height: number
  ) {
    if (height === null || height * this.zoomLevel > 8) {
      ctx.fillText(...opts);
    }
  }

  private internalRender(instructions: RenderInstructions<T>) {
    this.lastOps = instructions;
    this.clearAll();
    this.overflowElm.style.width = `${this.margin.left +
      this.margin.right +
      this.lastOps!.xMax * this.zoomLevel}px`;
    this.overflowElm.style.height = `${this.margin.top +
      this.lastOps!.yMax * this.zoomLevel}px`;

    this.setTransform();

    const transformScrollX = this.scrollOffset.x / this.scale();
    const transformScrollY = this.scrollOffset.y / this.scale();
    const fontSize = Math.max(10 / this.zoomLevel, this.lastOps.yScale(1) / 3);

    const rowRenderBounds = this.visibleRows(instructions);
    this.ctx.font = `normal normal ${fontSize}px Barlow`;
    const xTextOffset = 4 / this.zoomLevel;
    for (const opt of instructions.opts) {
      const currentRow = this.toRow(instructions.yScale, opt.y * this.scale());
      if (
        currentRow < rowRenderBounds.min ||
        currentRow > rowRenderBounds.max
      ) {
        continue;
      }

      if (this.hoverUUID === opt.uuid || this.selectedUUID === opt.uuid) {
        this.ctx.fillStyle = this.theme.active;
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

        const [R, G, B] = toRGB(opt.fill);

        if (R * 0.299 + G * 0.587 + B * 0.114 > 100) {
          //dark font
          this.ctx.fillStyle = "#26264B";
        } else {
          //light font
          this.ctx.fillStyle = "#D0CFE2";
        }

        this.writeText(
          this.ctx,
          [
            opt.text.text.slice(0, Math.floor(opt.width / fontSize) + 3),
            opt.x +
              ((opt.text.offsetX && opt.text.offsetX / this.zoomLevel) || 0) -
              transformScrollX +
              xTextOffset,
            opt.y +
              (opt.text.offsetY || opt.height / 2 - fontSize / 2) -
              transformScrollY
          ],
          this.lastOps.yScale(1)
        );
      }
    }
    if (this.selectedRange.start !== null) {
      const [R, G, B] = toRGB(this.theme.active);
      this.ctx.fillStyle = `rgba(${R},${G},${B},0.2)`;
      this.ctx.strokeStyle = this.theme.active;
      const startX =
        this.selectedRange.start.x > this.selectedRange.end!.x
          ? this.selectedRange.start.x
          : this.selectedRange.end!.x;
      const startY =
        this.selectedRange.start.y > this.selectedRange.end!.y
          ? this.selectedRange.start.y
          : this.selectedRange.end!.y;
      const endX =
        this.selectedRange.start.x < this.selectedRange.end!.x
          ? this.selectedRange.start.x
          : this.selectedRange.end!.x;
      const endY =
        this.selectedRange.start.y < this.selectedRange.end!.y
          ? this.selectedRange.start.y
          : this.selectedRange.end!.y;

      const selectedRect: [number, number, number, number] = [
        startX - transformScrollX,
        startY - transformScrollY,
        endX - startX,
        endY - startY
      ];

      this.ctx.fillRect(...selectedRect);
      this.ctx.strokeRect(...selectedRect);
      this.ctx.fillStyle = "black";
      this.ctx.textAlign = "center";
      this.ctx.lineWidth = 2 / this.zoomLevel;
      this.ctx.font = `normal normal ${14 / this.zoomLevel}px Barlow`;

      this.selectedRange.end &&
        this.ctx.fillText(
          Math.abs(
            Math.round(
              this.lastOps.xScale.invert(this.selectedRange.end.x) -
                this.lastOps.xScale.invert(this.selectedRange.start.x)
            )
          ) + " ms",
          selectedRect[0] + selectedRect[2] / 2,
          selectedRect[1] - 15 / this.zoomLevel
        );
      this.ctx.textAlign = "left";
    }

    this.ySummaryY.domain([0, instructions.ySummary.length]);

    this.ySummaryCtx.fillStyle = "#575679";

    const yAxisBarHeight =
      instructions.ySummary &&
      instructions.ySummary[0] &&
      instructions.ySummary[0].height! * this.scale();

    const yAxisLabelMod = Math.round(Math.max(1, 15 / yAxisBarHeight));

    for (const [i, yS] of instructions.ySummary.entries()) {
      this.ySummaryCtx.fillRect(
        this.ySummaryX(yS.pct),
        this.ySummaryY(yS.index),
        this.ySummaryX(0) - this.ySummaryX(yS.pct),
        this.ySummaryY(1)
      );
      this.yAxisCtx.fillStyle = "#BDBDCF";

      if (yS.y !== undefined && yS.height !== undefined) {
        this.yAxisCtx.fillRect(
          this.ySummaryX(yS.pct),
          (yS.y - transformScrollY) * this.scale(),
          this.ySummaryX(0) - this.ySummaryX(yS.pct),
          yAxisBarHeight
        );

        this.yAxisCtx.fillStyle = "#575679";

        yS.text &&
          i % yAxisLabelMod === 0 &&
          this.yAxisCtx.fillText(
            yS.text.slice(0, Math.floor(this.yAxis.width / fontSize) + 3),
            4,
            (yS.y - transformScrollY + yS.height / 2) * this.scale()
          );
      }
    }

    const [R, G, B] = toRGB(this.theme.active);
    this.ySummaryCtx.strokeStyle = this.theme.active;
    this.ySummaryCtx.fillStyle = `rgba(${R},${G},${B},0.2)`;
    const yBrushCoords = this.ySummaryBrushRange();

    const yBrush: [number, number, number, number] = yBrushCoords.rect;

    this.ySummaryCtx.strokeRect(...yBrush);
    this.ySummaryCtx.fillRect(...yBrush);

    this.xSummaryX.domain([0, instructions.xSummary.length]);

    this.xSummaryCtx.fillStyle = "#575679";

    const xAxisBarWidth =
      instructions.xSummary &&
      instructions.xSummary[0] &&
      instructions.xSummary[0].width! * this.scale();

    const xAxisLabelMod = Math.round(Math.max(1, 80 / xAxisBarWidth));

    const textDraws: Array<[string, number, number]> = [];
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
          (xS.x - transformScrollX) * this.scale(),
          this.xSummaryY(xS.pct),
          xS.width * this.scale(),
          this.xSummaryY(0) - this.xSummaryY(xS.pct)
        );
        this.xAxisCtx.fillStyle = "#575679";

        if (xS.text && i % xAxisLabelMod === 0) {
          textDraws.push([
            xS.text,
            (xS.x - transformScrollX) * this.scale() + 4,
            this.xAxis.height
          ]);
        }
      }
    }

    for (const d of textDraws) {
      this.xAxisCtx.fillText(...d);
    }

    {
      const [R, G, B] = toRGB(this.theme.active);
      this.xSummaryCtx.strokeStyle = this.theme.active;
      this.xSummaryCtx.fillStyle = `rgba(${R},${G},${B},0.2)`;
    }

    const xBrushCoords = this.xSummaryBrushRange();

    const xBrush: [number, number, number, number] = xBrushCoords.rect;
    this.xSummaryCtx.strokeRect(...xBrush);
    this.xSummaryCtx.fillRect(...xBrush);
    this.pendingRender = undefined;
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

    if (this.overMargin(mousePosition)) {
      if (this.overTopMargin(mousePosition)) {
        let evt: TimelineZoomEvent = new CustomEvent("timeline-zoom-time", {
          detail: {
            direction: (changeAmount > 0 ? "IN" : "OUT") as "IN" | "OUT"
          }
        });

        window.dispatchEvent(evt);
      }

      return;
    }

    const originalScrollLeft = this.scrollOffset.x;
    const originalScrollTop = this.scrollOffset.y;

    const { x, y } = this.toTimelinePosition(mousePosition);
    const timelineXPercent = x / this.timelineWidth();
    const timelineYPercent = y / this.timelineHeight();

    this.zoomLevel += changeAmount + changeAmount * this.zoomLevel;
    if (this.scale() <= MIN_ZOOM) {
      this.zoomLevel = 1;
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

  click(
    { x, y, target }: { x: number; y: number; target: HTMLCanvasElement },
    shiftDown: Boolean
  ) {
    if (shiftDown) {
      this.selectedRange = { start: null, end: null };
    }

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
      this.selectedUUID = undefined;
      if (match != null) {
        this.selectedUUID = match.uuid;
        const evt: TimelineEventInteraction<T> = new CustomEvent(
          "timeline-event-click",
          {
            detail: { match }
          }
        );

        window.dispatchEvent(evt);
      }
    }
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
    this.cursor.grab();

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
    this.cursor.ungrab();
    this.validYBrush = false;
    this.validXBrush = false;
  }

  drag(
    { dx, dy }: { dx: number; dy: number },
    start: { x: number; y: number; target: HTMLCanvasElement } | null
  ) {
    if (start && start.target === this.ySummary) {
      if (this.validYBrush) {
        this.wrapper.scrollBy(
          0,
          -(this.ySummaryY.invert(dy) / this.ySummaryY.domain()[1]) *
            this.timelineHeight()
        );
      }
    } else if (start && start.target === this.xSummary) {
      if (this.validXBrush) {
        this.wrapper.scrollBy(
          -(this.xSummaryX.invert(dx) / this.xSummaryX.domain()[1]) *
            this.timelineWidth(),
          0
        );
      }
    } else {
      this.wrapper.scrollBy(dx, dy);
    }
  }

  range() {
    this.cursor.range();
  }

  startRange({ x, y }: { x: number; y: number; target: HTMLCanvasElement }) {
    const pos = this.toTimelinePosition({ x, y });
    this.cursor.range();

    if (this.lastOps) {
      this.selectedRange.start = {
        x: pos.x / this.scale(),
        y: pos.y / this.scale()
      };
    }
  }

  dragRange({ x, y }: { x: number; y: number }) {
    const pos = this.toTimelinePosition({ x, y });
    this.selectedRange.end = {
      x: pos.x / this.scale(),
      y: pos.y / this.scale()
    };

    this.render(this.lastOps!);
  }

  stopRange() {
    this.cursor.unrange();
  }

  private entryFromPosition(mousePosition: {
    x: number;
    y: number;
  }): InternalTimelineEvent<T> | undefined {
    if (this.lastOps == null) {
      return undefined;
    }

    const { x, y } = this.toTimelinePosition(mousePosition);

    const row = this.toRow(this.lastOps.yScale, y);
    const timestamp = this.lastOps.xScale.invert(x / this.scale());

    return binarySearch(timestamp, this.lastOps.rowMap[row]!);
  }

  private toRow(yScale: ScaleLinear<number, number>, y: number): number {
    return Math.floor(yScale.invert(y / this.scale()));
  }

  private visibleRows(
    renderInstructions: RenderInstructions<T>
  ): { min: number; max: number } {
    return {
      min: Math.floor(
        renderInstructions.yScale.invert(this.scrollOffset.y / this.scale())
      ),
      max: Math.floor(
        renderInstructions.yScale.invert(
          (this.scrollOffset.y + this.dimensions.height) / this.scale()
        )
      )
    };
  }

  mouseMove(
    mousePosition: { x: number; y: number },
    { shiftDown }: { shiftDown: boolean }
  ) {
    if (this.lastOps == null) {
      return;
    }

    if (shiftDown || this.overMargin(mousePosition)) {
      this.hoverUUID = undefined;
      this.cursor.unset();
      const evt: TimelineEventInteraction<T> = new CustomEvent(
        "timeline-event-hover",
        {
          detail: { match: undefined }
        }
      );

      window.dispatchEvent(evt);
      this.render(this.lastOps);
      return;
    }

    const match = this.entryFromPosition(mousePosition);

    if (match == null && this.hoverUUID != null) {
      this.hoverUUID = undefined;
      return;
    }

    const evt: TimelineEventInteraction<T> = new CustomEvent(
      "timeline-event-hover",
      {
        detail: { match: match }
      }
    );

    if (match != null && match.uuid !== this.hoverUUID) {
      this.hoverUUID = match.uuid;
      this.render(this.lastOps);
      this.cursor.point();
      window.dispatchEvent(evt);
    }

    if (match == null) {
      this.cursor.unset();
      window.dispatchEvent(evt);
    }
  }

  render(instructions: RenderInstructions<T>) {
    if (this.pendingRender) {
      return;
    }

    this.pendingRender = requestAnimationFrame(() =>
      this.internalRender(instructions)
    );
  }
}
