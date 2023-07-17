/** @format */

// This function generates a hash key by combining the current timestamp and a random number, then converting it to a base 32 string.
export function hashKey() {
  // Get the current timestamp and add a random number (between 0 and 100)
  // Then, convert the result to a base 32 string and return it
  return (+new Date() + Math.random() * 100).toString(32);
}

// This function creates a random file name by combining a random number, the given name, and file type.
export function createRandomFileName(name: string, fileType: string) {
  // Generate a random number (between 0 and 10000000) and round it to an integer
  // Then, concatenate it with the given name and file type, separated by dashes and a dot respectively
  return `${Math.round(Math.random() * 10000000)}-${name}.${fileType}`;
}
export function addToArrayAndLimitSize(
  array: any,
  item: any,
  maxSize: number = 10
) {
  array.unshift(item);
  if (array.length > maxSize) {
    array.length = maxSize;
  }
}
