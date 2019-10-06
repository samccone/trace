type PointerStates = "initial" | "pointer" | "grabbing";

export class Cursor {
  private state: PointerStates = "initial";

  constructor(private target: HTMLElement) {}

  grab() {
    this.setState("grabbing");
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
