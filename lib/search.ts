export function binarySearch<
  K extends { start: number; end: number },
  T extends K[]
>(value: number, values: T): K | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const middle = Math.floor(values.length / 2);
  const target = values[middle];

  if (target.start <= value && target.end >= value) {
    return target;
  }

  // At this point we have no match, bail.
  if (values.length === 1) {
    return undefined;
  }

  if (target.start > value) {
    return binarySearch(value, values.slice(0, middle));
  } else {
    return binarySearch(value, values.slice(middle));
  }
}
