type UnknownObject = Record<string, unknown>;

const isPlainObject = (val: unknown): val is UnknownObject =>
  typeof val === "object" && val !== null && !Array.isArray(val);

export const flattenObject = (
  obj: UnknownObject,
  parentKey = ""
): UnknownObject =>
  Object.entries(obj).reduce<UnknownObject>((acc, [key, value]) => {
    const newKey = parentKey ? `${parentKey}-${key}` : key;

    return isPlainObject(value)
      ? { ...acc, ...flattenObject(value, newKey) }
      : { ...acc, [newKey]: value };
  }, {});
