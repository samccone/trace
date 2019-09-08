export interface TimelineEvent {
  // Start time in miliseconds
  start: number;
  // End time in miliseconds
  end: number;
  // End time - Start time in miliseconds
  duration: number;
  // Text label to be associated with the timeline entry
  label: string;
  // Process / Thread that the events are associated with.
  rowId: string;
  // Process / Thread index
  row: number;

  facet?: string;
}

export type TimelineEvents = TimelineEvent[];

export interface SummaryEvent {
  index: number;
  pct: number;
}
