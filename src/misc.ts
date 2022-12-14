export function clampedLerp({
  start,
  end,
  factor,
}: {
  start: number;
  end: number;
  factor: number;
}): number {
  const clampedFactor = Math.max(0, Math.min(factor, 1));
  return start + (end - start) * clampedFactor;
}

export function getGithubUsernameOfHost(): undefined | string {
  const m = window.location.host.match(/^([\w-]+)\.github\.io$/);
  if (m === null) {
    return;
  }
  return m[1];
}
