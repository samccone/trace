export interface RenderOp {
    x: number;
    y: number;
    width: number;
    height: number;
    text?: {
        offsetX?: number;
        offsetY?: number;
        fill?: string;
        text?: string;
    };
    fill: string;
}


export abstract class Renderer {
   constructor(public readonly dimensions: {width: number; height: number}, public readonly target: Element) {
   }

   abstract render(opts: RenderOp[]): void;
}