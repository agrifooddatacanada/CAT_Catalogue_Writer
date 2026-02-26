export function buildInstanceCountsFromValues(flatValues) {
  const counts = {};

  Object.keys(flatValues).forEach((path) => {
    // Match any [number] in the path
    const regex = /\[(\d+)\]/g;
    let match;
    let lastIndex = -1;
    let parentPath = path;

    // Find the last index and its parent path
    while ((match = regex.exec(path)) !== null) {
      lastIndex = parseInt(match[1], 10);
      parentPath = path.slice(0, match.index); // up to the '[' of this index
    }

    if (lastIndex >= 0) {
      const current = counts[parentPath] || 0;
      const needed = lastIndex + 1; // indices are 0-based → count = maxIndex + 1
      if (needed > current) {
        counts[parentPath] = needed;
      }
    }
  });
  return counts;
}
