import {CanvasRenderer} from '../lib/renderers/canvas.js';
import {Timeline} from '../lib/timeline.js';

const elm = document.createElement('div');

const renderer = new CanvasRenderer({width: 400, height: 400}, elm);
const timeline = new Timeline(renderer, [{
    start: 10,
    end: 50,
    rowId: '1',
    label: 'something'
}]);

document.body.appendChild(elm);

timeline.render();