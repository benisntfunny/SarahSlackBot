/** @format */

export function hashKey() {
  return (+new Date() + Math.random() * 100).toString(32);
}
export function createRandomFileName(name: string, fileType: string) {
  return `${Math.round(Math.random() * 10000000)}-${name}.${fileType}`;
}
