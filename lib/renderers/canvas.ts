import { Renderer, RenderOp } from "./renderer";

export class CanvasRenderer implements Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private displayDensity: number;
  private wrapper: HTMLElement;
  private overflowElm: HTMLElement;
  private scrollOffset: {x: number; y: number} = {x: 0, y: 0};
  private lastOps?:  {opts: RenderOp[], xMax: number, yMax: number};

  constructor(
    public readonly dimensions: { width: number; height: number },
    public readonly target: Element
  ) {
    this.overflowElm = document.createElement('div');
    this.overflowElm.style.width = '1px';
    this.overflowElm.style.height = '10000px';
    this.wrapper = document.createElement('div');
    this.wrapper.style.overflow = 'scroll';
    this.wrapper.style.zIndex = '1';
    this.wrapper.style.width =  `${dimensions.width}px`;
    this.wrapper.style.height =  `${dimensions.height}px`;
    this.wrapper.style.position = 'relative';

    this.displayDensity = window.devicePixelRatio;
    this.canvas = document.createElement("canvas");
    this.canvas.width = dimensions.width * this.displayDensity;
    this.canvas.height = dimensions.height * this.displayDensity;
    this.canvas.style.width = `${dimensions.width}px`;
    this.canvas.style.height = `${dimensions.height}px`;
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.position = 'fixed';
    this.canvas.style.left = `0px`;
    this.canvas.style.top = `0px`;

    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.font = 'normal normal 8px monospace'
    this.ctx.textBaseline = "top";
    this.ctx.scale(this.displayDensity, this.displayDensity);
    this.wrapper.appendChild(this.overflowElm);
    this.wrapper.appendChild(this.canvas);
    this.target.appendChild(this.wrapper);

    this.wrapper.addEventListener('scroll', () => {
        this.onScroll();
    });
  }

  onScroll() {
      this.scrollOffset = {
          x: this.wrapper.scrollLeft,
          y: this.wrapper.scrollTop
      };

      if (this.lastOps) {
          this.render(this.lastOps)
      }
  }

  private internalRender(instructions: {opts: RenderOp[], xMax: number, yMax: number}) {
    this.lastOps = instructions;

    this.overflowElm.style.width = `${instructions.xMax}px`;
    this.overflowElm.style.height = `${instructions.yMax}px`;

    this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);
    for (const opt of instructions.opts) {
      this.ctx.fillStyle = opt.fill;
      this.ctx.fillRect(opt.x - this.scrollOffset.x, opt.y - this.scrollOffset.y, opt.width, opt.height);
      if (opt.text != null && opt.text.text != null) {
        if (opt.text.fill != null) {
          this.ctx.fillStyle = opt.text.fill;
        }

        const fontSize = parseInt(this.ctx.font);

        this.ctx.fillText(
          opt.text.text.slice(0, Math.floor(opt.width / fontSize) + 3),
          opt.x + (opt.text.offsetX || 0) - this.scrollOffset.x,
          opt.y + (opt.text.offsetY || opt.height / 2 - fontSize / 2) - this.scrollOffset.y,
        );
      }
    }
  }

  render(instructions: {opts: RenderOp[], xMax: number, yMax: number}) {
    requestAnimationFrame(() => this.internalRender(instructions));
  }
}
