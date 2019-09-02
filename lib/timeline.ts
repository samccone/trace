import { Renderer } from "./renderers/renderer";
import { TimelineEvents } from "./format";
import {
  scaleLinear,
  scaleBand,
} from "d3-scale";

export class Timeline {
  constructor(
    public readonly renderer: Renderer,
    public readonly data: TimelineEvents
  ) {}

  transformData(data: TimelineEvents) {
    let xMin: number | undefined;
    let xMax: number | undefined;
    let facets: string[] = [];

    data.forEach(d => {
      if (!xMin || d.start < xMin) {
        xMin = d.start;
      }

      if (!xMax || d.end > xMax) {
        xMax = d.end;
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

    if (facets.length === 0) {
      facets.push("None");
    }

    const y = scaleBand()
      .domain(facets)
      .range([0, this.renderer.dimensions.height])
      .round(true);

    const height = y.bandwidth();

    return data.map(d => {
      return {
        x: x(d.start),
        y: y(d.facet || "None") || 0,
        width: x(d.end) - x(d.start),
        height,
        fill: "black",
        text: {
          offsetX: 0,
          offsetY: 0,
          fill: "white",
          text: d.label,
        },
      };
    });
  }

  render() {
    this.renderer.render(this.transformData(this.data));
  }
}
