import { Renderer } from "./renderers/renderer";
import {
  TimelineEvents,
  TimelineEvent,
  RenderInstructions,
  RenderOp
} from "./format";
import { scaleLinear } from "d3-scale";

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

export class Timeline {
  private dragging = false;
  private pointerDown = false;
  private pointerDownPosition: { x: number; y: number } | null = null;
  private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private lastRenderOps: RenderInstructions | undefined;

  constructor(
    public readonly renderer: Renderer,
    public readonly data: TimelineEvents,
    private readonly opts: {
      toFill?: (t: TimelineEvent) => string;
    } = {}
  ) {
    this.setListeners();
  }

  private setListeners() {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (!this.dragging) {
          this.renderer.startDragging();
          this.dragging = true;
        }

        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.code === "Space") {
        this.dragging = false;
        this.renderer.stopDragging();
      }
    });

    window.addEventListener("pointermove", (e: any) => {
      this.lastMousePosition = { x: e.layerX, y: e.layerY };

      if (this.dragging && this.pointerDown) {
        if (this.pointerDownPosition == null) {
          this.pointerDownPosition = { x: e.layerX, y: e.layerY };
        } else {
          const x = this.pointerDownPosition.x - e.layerX;
          const y = this.pointerDownPosition.y - e.layerY;
          this.renderer.scrollBy({ x, y });
          this.pointerDownPosition = { x: e.layerX, y: e.layerY };
        }
      }
    });

    window.onpointerdown = (e: any) => {
      this.pointerDown = true;

      if (this.dragging) {
        this.pointerDownPosition = { x: e.layerX, y: e.layerY };
        this.renderer.grab();
      }
    };

    window.addEventListener("pointerup", (_: PointerEvent) => {
      this.pointerDown = false;
      this.pointerDownPosition = null;

      if (this.dragging) {
        this.renderer.startDragging();
      }
    });

    window.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        if (e.metaKey || e.ctrlKey) {
          if (e.deltaY != null && e.deltaY < 0) {
            this.renderer.zoomIn(this.lastMousePosition);
          } else {
            this.renderer.zoomOut(this.lastMousePosition);
          }

          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  transformData(data: TimelineEvents) {
    let xMin: number | undefined = Infinity;
    let xMax: number | undefined;
    let facets: string[] = [];
    let rows: string[] = [];
    let rowMap: { [idx: string]: TimelineEvent[] } = {};

    data.forEach(d => {
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
    });

    const sortedData = data.sort((a, b) => {
      return a.end - a.start - (b.end - b.start);
    });

    const medianIndex = Math.floor(sortedData.length / 2);
    const median = sortedData[medianIndex];

    const xUnit = scaleLinear()
      .domain([xMin || 0, (xMin || 0) + (median.end - median.start)])
      .range([0, 100]);

    const PADDING = 0.3;
    const BANDHEIGHT = 20;

    const yUnit = scaleLinear().range([0, BANDHEIGHT * (1 + PADDING)]);

    const opts = data.reduce(
      (p, d) => {
        const width = xUnit(d.end) - xUnit(d.start);

        if (width < 0) {
          console.warn(`Start ${d.start} is after End ${d.end}`);
          return p;
        }

        let fillColor = this.opts.toFill ? this.opts.toFill(d) : "#ccc";

        const value = {
          x: xUnit(d.start),
          y: yUnit(d.row || 0),
          width,
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
      },
      [] as RenderOp[]
    );

    const totalDuration = (xMax || 0) - (xMin || 0);

    const ySummary = Object.keys(rowMap).map((d, i) => {
      const totalForRow = rowMap[d].reduce((p, c) => p + (c.duration || 0), 0);
      rowMap[d] = rowMap[d].sort((a, b) => a.start - b.start);
      return {
        index: parseInt(d),
        pct: totalForRow / totalDuration,
        y: yUnit(parseInt(d)),
        height: BANDHEIGHT,
        text: rows[i]
      };
    });

    const BUCKETS = 100;
    const increment = totalDuration / BUCKETS;

    const xSummary = [...new Array(BUCKETS)].map((_, bucket) => {
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
      return {
        index: bucket,
        pct: totalForColumn / totalX,
        x: xUnit((xMin || 0) + increment * bucket),
        width: xUnit((xMin || 0) + increment),
        text: formatDate(new Date((xMin || 0) + increment * bucket))
      };
    });

    return {
      opts,
      xMax: xUnit(xMax || 0),
      yMax: yUnit(rows.length),
      xUnit,
      yUnit,
      xSummary,
      ySummary
    };
  }

  render() {
    const renderData = this.transformData(this.data);
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
