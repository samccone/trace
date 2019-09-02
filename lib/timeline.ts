import { Renderer } from "./renderers/renderer";
import { TimelineEvents } from "./format";

export class Timeline {
    constructor(public readonly renderer: Renderer, public readonly data: TimelineEvents) {
    }

    render() {
       this.renderer.render(); 
    }
}