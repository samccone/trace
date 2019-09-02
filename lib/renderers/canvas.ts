import { Renderer, RenderOp } from './renderer';

export class CanvasRenderer implements Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(public readonly dimensions: { width: number; height: number }, public readonly target: Element) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = dimensions.width;
        this.canvas.height = dimensions.height;

        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.textBaseline = 'top';
        this.target.appendChild(this.canvas);
    }

    render(opts: RenderOp[]) {
        for (const opt of opts) {
            this.ctx.fillStyle = opt.fill;
            this.ctx.fillRect(opt.x, opt.y, opt.width
                , opt.height);
            if (opt.text != null && opt.text.text != null) {
                if (opt.text.fill != null) {
                    this.ctx.fillStyle = opt.text.fill;
                }

                this.ctx.fillText(opt.text.text, opt.x + (opt.text.offsetX || 0), opt.y + (opt.text.offsetY || 0));
            }
        }
    }
}