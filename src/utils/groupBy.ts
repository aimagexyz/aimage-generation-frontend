// NOTE: Object.groupBy()の仕様に参照して実装
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy
export const groupBy = <K extends PropertyKey, T>(
  items: readonly T[],
  callbackFn: (element: T, index?: number) => K,
): Record<K, T[]> =>
  items.reduce(
    (acc, item, index) => {
      const key = callbackFn(item, index);
      (acc[key] || (acc[key] = [])).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
