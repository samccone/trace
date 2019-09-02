import {Renderer} from './renderer';

export class CanvasRenderer implements Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

   constructor(public readonly dimensions: {width: number; height: number}, public readonly target: Element) {
      this.canvas = document.createElement('canvas') ;
      this.canvas.width = dimensions.width;
      this.canvas.height = dimensions.height;

      this.ctx = this.canvas.getContext('2d')!;
      this.target.appendChild(this.canvas);
   }

   render() {
       this.ctx.fillRect(10, 30, 100, 100);
   }
}