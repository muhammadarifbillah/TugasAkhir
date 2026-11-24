/** Timeline for the hero temper rail: step n (0..gates) starts at n × stepMs. */
export function railSchedule(stepMs: number, gates: number): { at: number; step: number }[] {
  return Array.from({ length: gates + 1 }, (_, step) => ({ at: step * stepMs, step }));
}
