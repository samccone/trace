import { Renderer, RenderOp } from "./renderers/renderer";
import { TimelineEvents, TimelineEvent } from "./format";
import { scaleLinear } from "d3-scale";

export class Timeline {
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
    window.addEventListener("keypress", e => {
      if (e.key === "k") {
        this.renderer.zoomIn();
      }

      if (e.key === "j") {
        this.renderer.zoomOut();
      }
    });
  }

  transformData(data: TimelineEvents) {
    let xMin: number | undefined = Infinity;
    let xMax: number | undefined;
    let facets: string[] = [];
    let rows: string[] = [];
    let rowMap = {};

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

      if (!rowMap[r]) {
        rowMap[r] = [];
      }
      rowMap[r].push(d);

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
          y: yUnit(d.row) || 0,
          width,
          height: BANDHEIGHT,
          fill: fillColor,
          text: {
            offsetX: 0,
            offsetY: 0,
            fill: "black",
            text: d.label,
          },
        };

        p.push(value);

        return p;
      },
      [] as RenderOp[]
    );

    const totalDuration = (xMax || 0) - (xMin || 0);

    const ySummary = Object.keys(rowMap).map(d => {
      const totalForRow = rowMap[d].reduce((p, c) => p + c.duration, 0);
      rowMap[d] = rowMap[d].sort((a, b) => a.start - b.start);
      return {
        index: parseInt(d),
        pct: totalForRow / totalDuration,
      };
    });

    const BUCKETS = 100;
    const increment = totalDuration / BUCKETS;

    const xSummary = [...new Array(BUCKETS)].map((n, bucket) => {
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
      };
    });

    console.log(xSummary);
    return {
      opts,
      xMax: xUnit(xMax || 0),
      yMax: yUnit(rows.length),
      xSummary,
      ySummary,
    };
  }

  render() {
    const renderData = this.transformData(this.data);
    this.renderer.render(renderData);
  }
}
