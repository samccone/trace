import theme from "../lib/themes/default";

import { CanvasRenderer } from "../lib/renderers/canvas";
import { Timeline } from "../lib/timeline";
import { Tooltip } from "../lib/tooltip";
import { TimelineEvent, TimelineEventInteraction } from "../lib/format";
import { d } from "../data/data4";
// If your data has a custom datum you can pass it here.
type Datum = never;

const elm = document.createElement("div");

const panelWidth = 400;

const renderer = new CanvasRenderer<Datum>(
  {
    width: 600,
    height: 1000,
    margin: {
      right: 200, //panelWidth,
      top: 100,
      left: 100,
      bottom: 0
    }
  },
  theme,
  elm
);

const colors = [
  "#ffd700",
  "#7ad4f7",
  // "#e14b4b",
  // "#32b7ac",
  // "#166c91",
  // "#4949e7",
  // "#f8846c",
  "#a5a5ef",
  "#bee3e0",
  "#e5f6d0",
  // "#6677BB",
  // "#2d344f",
  // "#73102f",
  // "#66631d",
  // "#3b165b",
  "#116b64"
];

const timeline = new Timeline<Datum>(
  renderer,
  (d as TimelineEvent<Datum>[]).map((v: TimelineEvent<Datum>) => {
    v.label = v.label.replace(`['/bin/bash', '-c', '`, "");
    return v;
  }),
  {
    toFill: ({ label }: { label: string }) => {
      if (label.indexOf("git remote -v") != -1) {
        return colors[0];
      }

      if (label.indexOf("git log") != -1) {
        return colors[1];
      }

      if (label.indexOf("git config") != -1) {
        return colors[2];
      }

      if (label.indexOf("git clean") != -1) {
        return colors[3];
      }

      if (label.indexOf("git status") != -1) {
        return colors[4];
      }
      return colors[5];
    }
  }
);

new Tooltip<Datum>(renderer.target);

const detailPanel = document.createElement("div");
detailPanel.classList.add("detail-panel");
detailPanel.style.left = `calc(100% - ${panelWidth}px)`;
detailPanel.style.width = `${panelWidth}px`;
document.body.appendChild(detailPanel);
document.body.querySelector("#root")!.appendChild(elm);

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

document.body.querySelector("#root")!.appendChild(elm);

window.addEventListener("resize", () => {
  //timeline.resize({ width: window.innerWidth, height: window.innerHeight });
});

timeline.render();
