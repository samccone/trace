import { CanvasRenderer } from "../lib/renderers/canvas";
import { Timeline } from "../lib/timeline";
import {d} from '../data/data4';

const elm = document.createElement("div");

const renderer = new CanvasRenderer({ width: window.innerWidth, height: window.innerHeight}, elm);
const timeline = new Timeline(renderer, d.map(v => {
    v.label = v.label.replace(`['/bin/bash', '-c'`, '');
    return v;
}), {
    toFill: ({label}: TimelineEvent) => {
        if (label.indexOf('git remote -v') != -1) {
          return 'teal';
        }

        if (label.indexOf('git log') != -1) {
          return 'yellow';
        }

        if (label.indexOf('git config') != -1) {
            return 'red';
        }

        if (label.indexOf('git clean') != -1) {
          return 'purple';
        }

        if (label.indexOf('git status') != -1) {
          return 'pink';
        }
        return 'red';
    }
});

document.body.appendChild(elm);

timeline.render();