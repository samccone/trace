import { Renderer, RenderOp } from "./renderers/renderer";
import { TimelineEvents } from "./format";
import { scaleLinear, scaleBand } from "d3-scale";

export class Timeline {
  constructor(
    public readonly renderer: Renderer,
    public readonly data: TimelineEvents
  ) {}

  transformData(data: TimelineEvents) {
    let xMin: number | undefined;
    let xMax: number | undefined;
    let facets: string[] = [];
    let rows: string[] = [];

    data.forEach(d => {
      if (!xMin || d.start < xMin) {
        xMin = d.start;
      }

      if (!xMax || d.end > xMax) {
        xMax = d.end;
      }

      if (rows.indexOf(d.rowId + "") === -1) {
        rows.push(d.rowId + "");
      }

      if (
        d.facet &&
        typeof d.facet === "string" &&
        facets.indexOf(d.facet) === -1
      ) {
        facets.push(d.facet);
      }
    });

    const x = scaleLinear()
      .domain([xMin || 0, xMax || 0])
      .range([0, this.renderer.dimensions.width]);

    const PADDING = 0.3;
    const BANDWIDTH = 20;

    const y = (value: string | number) => {
      return rows.indexOf(value + "") * (20 * (1 + PADDING));
    };

    return data.reduce(
      (p, d) => {
        const width = x(d.end) - x(d.start);

        if (width < 0) {
          console.warn(`Start ${d.start} is after End ${d.end}`);

          return p;
        }

        const value = {
          x: x(d.start),
          y: y(d.rowId) || 0,
          width,
          height: BANDWIDTH,
          fill: "#ccc",
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
  }

  render() {
    this.renderer.render(this.transformData(this.data));
  }
}
