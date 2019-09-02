export interface TimelineEvent {
    // Start time in miliseconds
    start: number;
    // End time in miliseconds
    end: number;
    // Text label to be associated with the timeline entry
    label: string;
    // Process / Thread that the events are associated with.
    rowId: string;
}

export type TimelineEvents = TimelineEvent[];