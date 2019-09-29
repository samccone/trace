import { CanvasRenderer } from "../lib/renderers/canvas";
import { Timeline } from "../lib/timeline";
import {
  TimelineEvent,
  TimelineEvents,
  TimelineEventInteraction
} from "../lib/format";
import { d } from "../data/data4";

const elm = document.createElement("div");

const panelWidth = 400;

const renderer = new CanvasRenderer(
  {
    width: window.innerWidth,
    height: window.innerHeight,
    margin: {
      right: panelWidth,
      top: 100,
      left: 100
    }
  },
  elm
);
const timeline = new Timeline(
  renderer,
  (d as TimelineEvents).map((v: TimelineEvent) => {
    v.label = v.label.replace(`['/bin/bash', '-c', '`, "");
    return v;
  }),
  {
    toFill: ({ label }: TimelineEvent) => {
      if (label.indexOf("git remote -v") != -1) {
        return "#fa8775";
      }

      if (label.indexOf("git log") != -1) {
        return "#cd34b5";
      }

      if (label.indexOf("git config") != -1) {
        return "#bc55e3";
      }

      if (label.indexOf("git clean") != -1) {
        return "#8f8fff";
      }

      if (label.indexOf("git status") != -1) {
        return "#69CDB9";
      }
      return "#ffd700";
    }
  }
);

const tooltip = document.createElement("div");
tooltip.style.pointerEvents = "none";
tooltip.style.zIndex = "10";
tooltip.style.position = "fixed";
tooltip.style.background = "#000";
tooltip.style.color = "white";
tooltip.style.padding = "5px";
tooltip.style.fontSize = "10px";
tooltip.style.transform = "translateX(-50%) translateY(-140%)";
tooltip.style.borderRadius = "3px";
document.body.appendChild(tooltip);

window.addEventListener("mousemove", e => {
  tooltip.style.top = `${e.clientY}px`;
  tooltip.style.left = `${e.clientX}px`;
});

const detailPanel = document.createElement("div");
detailPanel.classList.add("detail-panel");
detailPanel.style.left = `calc(100% - ${panelWidth}px)`;
detailPanel.style.width = `${panelWidth}px`;
document.body.appendChild(detailPanel);

window.addEventListener("timeline-event-click", (e: Event) => {
  const m = (e as TimelineEventInteraction).detail.match;
  detailPanel.textContent = `evt: ${m.label}\n\n
duration: ${(m.end - m.start) / 1000} seconds
  `;
});

window.addEventListener("timeline-event-hover", (e: Event) => {
  const m = (e as TimelineEventInteraction).detail.match;
  tooltip.textContent = `Duration: ${m.end - m.start}ms`;
});

document.body.appendChild(elm);

window.addEventListener("resize", () => {
  timeline.resize({ width: window.innerWidth, height: window.innerHeight });
});

timeline.render();
