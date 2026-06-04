type MergeableObject = Record<string, unknown>;

type mergeObjectType = <T extends MergeableObject>(
  originalObject: T,
  addObject: MergeableObject
) => T;

export const mergeObject: mergeObjectType = <T extends MergeableObject>(
  originalObject: T,
  addObject: MergeableObject
): T =>
  Object.entries(addObject).reduce(
    (result, [key, value]) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        return {
          ...result,
          [key]: mergeObject(
            (result[key] as MergeableObject) ?? {},
            value as MergeableObject
          )
        };
      }
      return { ...result, [key]: value };
    },
    { ...originalObject }
  ) as T;
