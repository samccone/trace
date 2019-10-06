import { TimelineEventInteraction } from "../lib/format";

export class Tooltip<T> {
  private tooltip: HTMLElement;
  private pendingMove: { x: number; y: number } | null = null;

  constructor(private target: HTMLElement) {
    this.tooltip = document.createElement("div");
    this.tooltip.className = "tooltip";
    this.setEventListeners();
    this.setStyles();
    document.body.appendChild(this.tooltip);
  }

  private setStyles() {
    this.tooltip.style.pointerEvents = "none";
    this.tooltip.style.zIndex = "10";
    this.tooltip.style.position = "fixed";
    this.tooltip.style.background = "#000";
    this.tooltip.style.color = "white";
    this.tooltip.style.padding = "8px";
    this.tooltip.style.fontSize = "12px";
    this.tooltip.style.transform =
      "translateX(-50%) translateY(-100%) translateY(-10px)";
    this.tooltip.style.borderRadius = "3px";
  }

  private onMove(e: { x: number; y: number }) {
    if (this.pendingMove) {
      return;
    }

    this.pendingMove = e;
    requestAnimationFrame(() => {
      if (this.pendingMove != null) {
        this.tooltip.style.top = `${this.pendingMove.y}px`;
        this.tooltip.style.left = `${this.pendingMove.x}px`;
      }
      this.pendingMove = null;
    });
  }

  private setEventListeners() {
    this.target.addEventListener("mouseleave", _ => {
      this.tooltip.style.visibility = "hidden";
    });

    this.target.addEventListener("mousemove", e => {
      this.onMove({ x: e.clientX, y: e.clientY });
    });

    window.addEventListener("timeline-event-hover", (e: Event) => {
      const m = (e as TimelineEventInteraction<T>).detail.match;
      if (m == null) {
        this.tooltip.style.visibility = "hidden";
      } else {
        this.tooltip.style.visibility = "visible";
        this.tooltip.textContent = `Duration: ${m.end - m.start}ms`;
      }
    });
  }
}
