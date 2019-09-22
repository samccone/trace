export function uuid(): string {
  return Array(20)
    .fill(null)
    .map(_ => String.fromCharCode(Math.random() * 300))
    .join("");
}
