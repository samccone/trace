import { Renderer, RenderOp } from "./renderer";

export class CanvasRenderer implements Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private displayDensity: number;

  constructor(
    public readonly dimensions: { width: number; height: number },
    public readonly target: Element
  ) {
    this.displayDensity = window.devicePixelRatio;
    this.canvas = document.createElement("canvas");
    this.canvas.width = dimensions.width * this.displayDensity;
    this.canvas.height = dimensions.height * this.displayDensity;
    this.canvas.style.width = `${dimensions.width}px`;
    this.canvas.style.height = `${dimensions.height}px`;

    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.textBaseline = "top";
    this.ctx.scale(this.displayDensity, this.displayDensity);
    this.target.appendChild(this.canvas);
  }

  render(opts: RenderOp[]) {
    for (const opt of opts) {
      this.ctx.fillStyle = opt.fill;
      this.ctx.fillRect(opt.x, opt.y, opt.width, opt.height);
      if (opt.text != null && opt.text.text != null) {
        if (opt.text.fill != null) {
          this.ctx.fillStyle = opt.text.fill;
        }

        const fontSize = parseInt(this.ctx.font);

        this.ctx.fillText(
          opt.text.text,
          opt.x + (opt.text.offsetX || fontSize / 2),
          opt.y + (opt.text.offsetY || opt.height / 2 - fontSize / 2)
        );
      }
    }
  }
}
