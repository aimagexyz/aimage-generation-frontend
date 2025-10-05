export function sortDataByOrder<T extends { id: string }>(dataList: T[], dataOrder: string[]): T[] {
  // 创建一个映射来存储每个 id 的顺序
  const orderMap = new Map<string, number>();
  dataOrder.forEach((id, index) => orderMap.set(id, index));

  // 对 dataList 按照 orderMap 的顺序排序
  return dataList.sort((a, b) => {
    const orderA = orderMap.get(a.id) ?? Infinity; // 如果 id 不在 orderMap 中，则放在末尾
    const orderB = orderMap.get(b.id) ?? Infinity;
    return orderA - orderB;
  });
}
