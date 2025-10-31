// canonicalize.js

/**
 * Canonicalizes a JSON-compatible value by:
 * - Sorting object properties lexicographically
 * - Preserving array element order
 * - Using native JSON.stringify for primitives and values with toJSON()
 *
 * Returns a stable string suitable for hashing/signing.
 *
 * @param {any} value
 * @returns {string}
 */
function canonicalize(value) {
  let buffer = '';
  serialize(value);
  return buffer;

  function serialize(v) {
    // Primitives and values with custom toJSON delegate to JSON.stringify
    if (v === null || typeof v !== 'object' || typeof v.toJSON === 'function') {
      buffer += JSON.stringify(v);
      return;
    }

    if (Array.isArray(v)) {
      buffer += '[';
      let first = true;
      for (const el of v) {
        if (!first) buffer += ',';
        first = false;
        serialize(el);
      }
      buffer += ']';
      return;
    }

    // Object branch: stable key ordering
    buffer += '{';
    let first = true;
    const keys = Object.keys(v).sort();
    for (const key of keys) {
      if (!first) buffer += ',';
      first = false;
      buffer += JSON.stringify(key);
      buffer += ':';
      serialize(v[key]);
    }
    buffer += '}';
  }
}

export default canonicalize;
