import theme from "../lib/themes/default";

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
    width: 400,
    height: 400,
    margin: {
      right: 100,
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

function buildDemoData() {
  let ret = [];

  for (let i = 0; i < 1000; i++) {
    for (let j = 0; j < 100; j++) {
      ret.push({
        start: i,
        end: i + 1,
        label: `${i}`,
        rowId: `${j}`
      });
    }
  }

  return ret;
}

const timeline = new Timeline<Datum>(renderer, buildDemoData(), {
  toFill: ({ label }: { label: string }) => {
    if (label.indexOf("1") != -1) {
      return colors[0];
    }

    if (label.indexOf("4") != -1) {
      return colors[1];
    }

    if (label.indexOf("8") != -1) {
      return colors[2];
    }

    if (label.indexOf("9") != -1) {
      return colors[3];
    }

    if (label.indexOf("6") != -1) {
      return colors[4];
    }
    return colors[5];
  }
});

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

timeline.render();
