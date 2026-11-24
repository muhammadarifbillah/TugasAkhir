/** Index of the next slide in `dir` (1 forward, -1 back), wrapping at both ends. */
export function nextIndex(current: number, count: number, dir: 1 | -1): number {
  return (current + dir + count) % count;
}
