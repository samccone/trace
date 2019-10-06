import { ScaleLinear } from "d3-scale";

export interface RowMap<T> {
  [idx: string]: InternalTimelineEvent<T>[];
}

export type TimelineEventInteraction<T> = CustomEvent<{
  match: TimelineEvent<T> | undefined;
}>;

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

export interface RenderInstructions<T> {
  opts: RenderOp[];
  xMax: number;
  yMax: number;
  xUnit: ScaleLinear<number, number>;
  yUnit: ScaleLinear<number, number>;
  ySummary: SummaryEvent[];
  xSummary: SummaryEvent[];
  rowMap: RowMap<T>;
}

export interface TimelineEvent<T = never> {
  // Start time in miliseconds
  start: number;

  // End time in miliseconds
  end: number;

  // Text label to be associated with the timeline entry
  label: string;

  // Process / Thread that the events are associated with.
  rowId: string;

  // Optional additional data you want associated with each event
  // [helpful for rendering debugging info]
  datum?: T;
}

export interface InternalTimelineEvent<T = never> extends TimelineEvent<T> {
  // End time - Start time in miliseconds
  duration?: number;
  // Process / Thread index
  row?: number;
  facet?: string;
  // Internal ID for Event tracking [Shared with RenderOp]
  uuid?: string;
}

export interface SummaryEvent {
  index: number;
  pct: number;
  x?: number;
  width?: number;
  y?: number;
  height?: number;
  text?: string;
}
