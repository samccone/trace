import { CanvasRenderer } from "../lib/renderers/canvas";
import { Timeline } from "../lib/timeline";
import { TimelineEvent, TimelineEvents } from "../lib/format";
import { d } from "../data/data4";

const elm = document.createElement("div");

const renderer = new CanvasRenderer(
  { width: window.innerWidth, height: window.innerHeight },
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

document.body.appendChild(elm);

window.addEventListener("resize", () => {
  renderer.resize({ width: window.innerWidth, height: window.innerHeight });
  timeline.cachedRender();
});

timeline.render();
