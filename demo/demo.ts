import { CanvasRenderer } from "../lib/renderers/canvas";
import { Timeline } from "../lib/timeline";
import { Tooltip } from "../lib/tooltip";
import { TimelineEvent, TimelineEventInteraction } from "../lib/format";

// If your data has a custom datum you can pass it here.
type Datum = never;

const elm = document.createElement("div");

const panelWidth = 400;

const renderer = new CanvasRenderer<Datum>(
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
const timeline = new Timeline<Datum>(
  renderer,
  (d as TimelineEvent<Datum>[]).map((v: TimelineEvent<Datum>) => {
    v.label = v.label.replace(`['/bin/bash', '-c', '`, "");
    return v;
  }),
  {
    toFill: ({ label }: { label: string }) => {
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

new Tooltip<Datum>(renderer.target);

const detailPanel = document.createElement("div");
detailPanel.classList.add("detail-panel");
detailPanel.style.left = `calc(100% - ${panelWidth}px)`;
detailPanel.style.width = `${panelWidth}px`;
document.body.appendChild(detailPanel);

window.addEventListener("timeline-event-click", (e: Event) => {
  const m = (e as TimelineEventInteraction<Datum>).detail.match;
  if (m == null) {
    return;
  }

  detailPanel.textContent = `evt: ${m.label}\n\n
duration: ${(m.end - m.start) / 1000} seconds\n\n
datum: ${JSON.stringify(m.datum || "N/A", null, 2)}
  `;
});

document.body.appendChild(elm);

window.addEventListener("resize", () => {
  timeline.resize({ width: window.innerWidth, height: window.innerHeight });
});

timeline.render();
