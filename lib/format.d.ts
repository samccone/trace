import { ScaleLinear } from "d3-scale";

export interface RowMap {
  [idx: string]: TimelineEvent[];
}

export type TimelineEventInteraction = CustomEvent<{ match: TimelineEvent }>;

export interface RenderOp {
  x: number;
  y: number;
  width: number;
  height: number;
  text?: {
    offsetX?: number;
    offsetY?: number;
    fill?: string;
    text?: string;
  };
  fill: string;

  // Internal ID for Event tracking [shared with TimelineEvent]
  uuid: string;
}

export interface RenderInstructions {
  opts: RenderOp[];
  xMax: number;
  yMax: number;
  xUnit: ScaleLinear<number, number>;
  yUnit: ScaleLinear<number, number>;
  ySummary: SummaryEvent[];
  xSummary: SummaryEvent[];
  rowMap: RowMap;
}

export interface TimelineEvent {
  // Start time in miliseconds
  start: number;
  // End time in miliseconds
  end: number;
  // End time - Start time in miliseconds
  duration?: number;
  // Text label to be associated with the timeline entry
  label: string;
  // Process / Thread that the events are associated with.
  rowId: string;
  // Process / Thread index
  row?: number;

  facet?: string;

  // Internal ID for Event tracking [Shared with RenderOp]
  uuid: string;
}

export type TimelineEvents = TimelineEvent[];

export interface SummaryEvent {
  index: number;
  pct: number;
  x?: number;
  width?: number;
  y?: number;
  height?: number;
  text?: string;
}
