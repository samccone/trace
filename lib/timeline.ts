import { Renderer } from "./renderers/renderer";
import {
  TimelineEvent,
  RenderInstructions,
  RenderOp,
  RowMap,
  InternalTimelineEvent,
  TimelineZoomEvent,
  SummaryEvent
} from "./format";
import { scaleLinear } from "d3";
import { uuid } from "./uuid";

const padNumbers = (num: number) => {
  const s = num + "";
  if (s.length === 1) return `0${s}`;
  return s;
};

const formatDate = (d: Date) => {
  return `${padNumbers(d.getHours())}:${padNumbers(
    d.getMinutes()
  )}:${padNumbers(d.getSeconds())}`;
};

export class Timeline<T> {
  private dragging = false;
  private pointerDown = false;
  private shiftDown = false;
  private pendingMouseWheel = false;
  private draggingRange = false;
  private eventRegistrationHash: { [eventName: string]: (e: any) => void };
  private pointerDownPosition: {
    x: number;
    y: number;
    target: Element;
  } | null = null;
  private startDraggingPosition: {
    x: number;
    y: number;
    target: Element;
  } | null = null;
  private lastMousePosition: { x: number; y: number; target?: Element } = {
    x: 0,
    y: 0
  };
  private lastRenderOps: RenderInstructions<T> | undefined;
  private xRange: [number, number];
  private yRange: [number, number];
  constructor(
    public readonly renderer: Renderer,
    public readonly data: TimelineEvent<T>[],
    private readonly opts: { toFill?: (t: { label: string }) => string } = {}
  ) {
    this.eventRegistrationHash = {
      keydown: (e: Event) => this.onKeyDown(e),
      keyup: (e: Event) => this.onKeyUp(e),
      pointermove: (e: Event) => this.onPointerMove(e),
      pointerdown: (e: Event) => this.onPointerDown(e),
      pointerup: (e: any) => this.onPointerUp(e),
      "timeline-zoom-time": (e: Event) =>
        this.onZoomTime(e as TimelineZoomEvent),
      wheel: (e: WheelEvent) => this.onWheel(e)
    };
    this.xRange = [
      0,
      renderer.dimensions.width -
        ((renderer.dimensions.margin && renderer.dimensions.margin.left) || 0) -
        ((renderer.dimensions.margin && renderer.dimensions.margin.right) || 0)
    ];

    this.yRange = [
      0,
      renderer.dimensions.height -
        ((renderer.dimensions.margin && renderer.dimensions.margin.top) || 0) -
        ((renderer.dimensions.margin && renderer.dimensions.margin.bottom) || 0)
    ];
    this.setListeners();
  }

  private onKeyDown(e: KeyboardEvent) {
    this.shiftDown = e.shiftKey;
    if (this.shiftDown) {
      this.renderer.range();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.shiftDown = e.shiftKey;
  }

  private onPointerMove(e: any) {
    const currentPosition = {
      x: e.layerX,
      y: e.layerY,
      target: e.target as Element
    };
    this.renderer.mouseMove(currentPosition, { shiftDown: this.shiftDown });

    if (this.pointerDown) {
      if (!this.dragging && !this.draggingRange) {
        if (this.shiftDown) {
          this.renderer.startRange(this.pointerDownPosition);
          this.draggingRange = true;
        } else {
          this.renderer.startDragging(this.pointerDownPosition);
          this.dragging = true;
        }

        this.startDraggingPosition = this.pointerDownPosition;
      }

      if (this.lastMousePosition == null) {
        this.lastMousePosition = { x: e.layerX, y: e.layerY };
      } else {
        const dx = this.lastMousePosition.x - e.layerX;
        const dy = this.lastMousePosition.y - e.layerY;

        if (this.draggingRange) {
          this.renderer.dragRange(
            { ...currentPosition, dx, dy },
            this.startDraggingPosition
          );
        } else {
          this.renderer.drag(
            { ...currentPosition, dx, dy },
            this.startDraggingPosition
          );
        }
      }
    } else {
      if (this.shiftDown) {
        this.renderer.range();
      }
    }
    this.lastMousePosition = currentPosition;
  }

  private onPointerDown(e: any) {
    this.pointerDown = true;
    this.pointerDownPosition = {
      x: e.layerX,
      y: e.layerY,
      target: e.target as Element
    };
  }

  private onPointerUp(_: PointerEvent) {
    if (!this.draggingRange && !this.dragging && this.pointerDownPosition) {
      this.renderer.click(this.pointerDownPosition, this.shiftDown);
    } else if (this.dragging) {
      this.dragging = false;
      this.renderer.stopDragging();
      this.startDraggingPosition = null;
    } else if (this.draggingRange) {
      this.draggingRange = false;
      this.renderer.stopRange();
      this.startDraggingPosition = null;
    }

    this.pointerDown = false;
    this.pointerDownPosition = null;
  }

  private onZoomTime(e: TimelineZoomEvent) {
    if ((e as TimelineZoomEvent).detail.direction === "OUT") {
      this.xRange = [this.xRange[0], this.xRange[1] / 1.5];
    } else {
      this.xRange = [this.xRange[0], this.xRange[1] * 1.5];
    }

    this.render();
  }

  private onWheel(e: WheelEvent) {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();

      if (this.pendingMouseWheel) {
        return;
      }

      this.pendingMouseWheel = true;
      requestAnimationFrame(() => {
        if (e.deltaY != null && e.deltaY < 0) {
          this.renderer.zoomIn(this.lastMousePosition);
        } else {
          this.renderer.zoomOut(this.lastMousePosition);
        }
        this.pendingMouseWheel = false;
      });
    }
  }

  private setListeners() {
    window.addEventListener("keydown", this.eventRegistrationHash["keydown"]);
    window.addEventListener("keyup", this.eventRegistrationHash["keyup"]);
    this.renderer.target.addEventListener(
      "pointermove",
      this.eventRegistrationHash["pointermove"]
    );
    this.renderer.target.addEventListener(
      "pointerdown",
      this.eventRegistrationHash["pointerdown"]
    );
    this.renderer.target.addEventListener(
      "pointerup",
      this.eventRegistrationHash["pointerup"]
    );
    window.addEventListener(
      "timeline-zoom-time",
      this.eventRegistrationHash["timeline-zoom-time"]
    );
    window.addEventListener("wheel", this.eventRegistrationHash["wheel"], {
      passive: false
    });
  }

  removeListeners() {
    window.removeEventListener(
      "keydown",
      this.eventRegistrationHash["keydown"]
    );
    window.removeEventListener("keyup", this.eventRegistrationHash["keyup"]);
    this.renderer.target.removeEventListener(
      "pointermove",
      this.eventRegistrationHash["pointermove"]
    );
    this.renderer.target.removeEventListener(
      "pointerdown",
      this.eventRegistrationHash["pointerdown"]
    );
    this.renderer.target.removeEventListener(
      "pointerup",
      this.eventRegistrationHash["pointerup"]
    );
    window.removeEventListener(
      "timeline-zoom-time",
      this.eventRegistrationHash["timeline-zoom-time"]
    );
    window.removeEventListener("wheel", this.eventRegistrationHash["wheel"]);
  }

  transformData<T>(data: TimelineEvent<T>[]): RenderInstructions<T> {
    let xMin: number | undefined = Infinity;
    let xMax: number | undefined;
    let facets: string[] = [];
    let rows: string[] = [];
    let rowMap: RowMap<T> = {};

    const internalData: InternalTimelineEvent<T>[] = data.map(
      (d: InternalTimelineEvent<T>) => {
        if (!xMin || d.start < xMin) {
          xMin = d.start;
        }

        if (!xMax || d.end > xMax) {
          xMax = d.end;
        }

        d.duration = d.end - d.start;

        if (rows.indexOf(d.rowId + "") === -1) {
          rows.push(d.rowId + "");
        }
        const r = rows.indexOf(d.rowId + "");
        d.row = r;
        d.uuid = uuid();

        const stringR = r + "";
        if (!rowMap[stringR]) {
          rowMap[stringR] = [];
        }
        rowMap[stringR].push(d);

        if (
          d.facet &&
          typeof d.facet === "string" &&
          facets.indexOf(d.facet) === -1
        ) {
          facets.push(d.facet);
        }

        return d;
      }
    );

    const xScale = scaleLinear()
      .domain([xMin || 0, xMax || 0])
      .range(this.xRange);

    const yScale = scaleLinear()
      .domain([0, rows.length])
      .range(this.yRange);

    const BANDHEIGHT = yScale(1);

    const opts = internalData.reduce((p, d) => {
      const width = xScale(d.end) - xScale(d.start);

      if (width < 0) {
        console.warn(`Start ${d.start} is after End ${d.end}`);
        return p;
      }

      let fillColor = this.opts.toFill ? this.opts.toFill(d) : "#ccc";

      const value = {
        x: xScale(d.start),
        y: yScale(d.row || 0),
        width,
        uuid: d.uuid!,
        height: BANDHEIGHT,
        fill: fillColor,
        text: {
          offsetX: 0,
          offsetY: 0,
          fill: "black",
          text: d.label
        }
      };

      p.push(value);

      return p;
    }, [] as RenderOp[]);

    const totalDuration = (xMax || 0) - (xMin || 0);

    const ySummary = Object.keys(rowMap).map((d, i) => {
      const totalForRow = rowMap[d].reduce((p, c) => p + (c.duration || 0), 0);
      rowMap[d] = rowMap[d].sort((a, b) => a.start - b.start);
      return {
        index: Number(d),
        pct: totalForRow / totalDuration,
        y: yScale(Number(d)),
        height: BANDHEIGHT,
        text: rows[i]
      };
    });

    const BUCKETS = 200;
    const increment = totalDuration / BUCKETS;

    const xSummary: SummaryEvent[] = [];
    for (let bucket = 0; bucket < BUCKETS; bucket++) {
      let totalForColumn = 0;

      Object.keys(rowMap).forEach(row => {
        const rowItems = rowMap[row];
        const columnAsX = (xMin || 0) + increment * bucket + increment / 2;

        let i = 0;
        let r = rowItems[i];

        while (r && r.start <= columnAsX) {
          if (r.end >= columnAsX) totalForColumn++;
          i++;
          r = rowItems[i];
        }
      });

      const totalX = rows.length;
      xSummary.push({
        index: bucket,
        pct: totalForColumn / totalX,
        x: xScale((xMin || 0) + increment * bucket),
        width: xScale((xMin || 0) + increment),
        text: formatDate(new Date((xMin || 0) + increment * bucket))
      });
    }

    return {
      opts,
      xMax: xScale(xMax || 0),
      xScale,
      yMax: yScale(rows.length),
      yScale,
      xSummary,
      ySummary,
      rowMap
    };
  }

  render() {
    const renderData = this.transformData<T>(this.data);
    this.lastRenderOps = renderData;
    this.renderer.render(renderData);
  }

  resize(dimensions: { width: number; height: number }) {
    this.renderer.resize(dimensions);
    if (this.lastRenderOps != null) {
      this.renderer.render(this.lastRenderOps);
    }
  }
}
