type PointerStates = "initial" | "pointer" | "grabbing" | "crosshair";

export class Cursor {
  private state: PointerStates = "initial";

  constructor(private target: HTMLElement) {}

  grab() {
    this.setState("grabbing");
  }

  range() {
    this.setState("crosshair");
  }

  unrange() {
    this.setState("initial", { force: true });
  }

  ungrab() {
    this.setState("initial", { force: true });
  }

  point() {
    this.setState("pointer");
  }

  unset() {
    this.setState("initial");
  }

  private setState(
    s: PointerStates,
    { force }: { force: boolean } = { force: false }
  ) {
    if (this.state === "initial" || this.state === "pointer") {
      this.state = s;
    }

    if (force) {
      this.state = s;
    }

    this.target.style.cursor = this.state;
  }
}
