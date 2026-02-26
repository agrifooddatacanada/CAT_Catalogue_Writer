export function removeIndices(valuePath) {
  return valuePath.replace(/\[\d+\]/g, "");
}
