import { CanvasRenderer } from "../lib/renderers/canvas";
import { Timeline } from "../lib/timeline";

const elm = document.createElement("div");

const renderer = new CanvasRenderer({ width: 400, height: 400 }, elm);
const timeline = new Timeline(renderer, [
  {
    start: 10,
    end: 50,
    rowId: "1",
    label: "something",
  },
  {
    start: 20,
    end: 90,
    rowId: "2",
    label: "test",
  },
]);

document.body.appendChild(elm);

timeline.render();
