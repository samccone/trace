import { CanvasRenderer } from "../lib/renderers/canvas";
import { Timeline } from "../lib/timeline";
import {d} from '../data/data';


const elm = document.createElement("div");

const renderer = new CanvasRenderer({ width: 1000, height: 10000 }, elm);
const timeline = new Timeline(renderer, d);

document.body.appendChild(elm);

timeline.render();
