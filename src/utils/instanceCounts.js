export function buildInstanceCountsFromValues(flatValues) {
  const counts = {};
  if (!flatValues || typeof flatValues !== "object") return counts;

  Object.keys(flatValues).forEach((path) => {
    // Record EVERY [number] segment in nested paths so parent array counts are
    // never missed when an instance only contains nested array children.
    const regex = /\[(\d+)\]/g;
    let match;

    while ((match = regex.exec(path)) !== null) {
      const idx = parseInt(match[1], 10);
      const parentPath = path.slice(0, match.index);
      const needed = idx + 1; // 0-based index -> count = maxIndex + 1
      if (needed > (counts[parentPath] || 0)) {
        counts[parentPath] = needed;
      }
    }
  });
  return counts;
}
