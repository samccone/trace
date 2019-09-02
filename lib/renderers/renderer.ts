export abstract class Renderer {
   constructor(public readonly dimensions: {width: number; height: number}, public readonly target: Element) {
   }

   abstract render(): void;
}