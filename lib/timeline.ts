import { Renderer, RenderOp } from "./renderers/renderer";
import { TimelineEvents, TimelineEvent } from "./format";
import { scaleLinear } from "d3-scale";

export class Timeline {
  constructor(
    public readonly renderer: Renderer,
    public readonly data: TimelineEvents,
    private readonly opts: {
      toFill?: (t: TimelineEvent) => string;
    } = {},
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

    const sortedData = data.sort((a,b) => {
      return (a.end - a.start) - (b.end - b.start);
    })

    const medianIndex = Math.floor(sortedData.length/2)
    const median = sortedData[medianIndex]

    const x = scaleLinear()
      .domain([xMin || 0,( xMin || 0) + ( median.end - median.start)])
      .range([0, 100]);

    const PADDING = 0.3;
    const BANDWIDTH = 20;

    const y = (value: string | number) => {
      return rows.indexOf(value + "") * (20 * (1 + PADDING));
    };


    let maxX: number = -Infinity;

    const opts = data.reduce(
      (p, d) => {
        const width = x(d.end) - x(d.start);

        if (width < 0) {
          console.warn(`Start ${d.start} is after End ${d.end}`);

          return p;
        }

        const localX = x(d.start);
        if (localX + width > maxX) {
          maxX = localX + width;
        }

        let fillColor = this.opts.toFill ? this.opts.toFill(d) : '#ccc';

        const value = {
          x: localX,
          y: y(d.rowId) || 0,
          width,
          height: BANDWIDTH,
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

    return {
        opts,
        xMax: maxX,
        yMax: rows.length * (20 * (1 + PADDING)) 
    };
  }

  render() {
    const renderData = this.transformData(this.data) 
    this.renderer.render(renderData);
  }
}
