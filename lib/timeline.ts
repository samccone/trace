import { Renderer } from "./renderers/renderer";
import { TimelineEvents } from "./format";

export class Timeline {
    constructor(public readonly renderer: Renderer, public readonly data: TimelineEvents) {
    }

    render() {
       this.renderer.render([{
           x: 100,
           y: 100,
           width: 50,
           height: 20,
           fill: 'teal',
           text: {
               offsetX: 0,
               offsetY: 0,
               fill: 'red',
               text: 'hello world'
           }
       }]); 
    }
}