export const DOT_TOKEN = "___$dot$___";

export const escapeKey = (key) => String(key).replaceAll(".", DOT_TOKEN);
export const unescapeKey = (key) => String(key).replaceAll(DOT_TOKEN, ".");
