/**
 * UUID 类型
 * 用于标识唯一资源的 UUID 字符串
 */
export type UUID = string & { readonly _uuid: unique symbol };

/**
 * 将字符串转换为 UUID 类型
 * @param value 可能是 UUID 的字符串
 * @returns UUID 或 undefined
 */
export function toUUID(value: string | undefined | null): UUID | undefined {
  if (!value) {
    return undefined;
  }

  // UUID v4 的正则表达式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(value) ? (value as UUID) : undefined;
}
