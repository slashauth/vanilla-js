// eslint-disable-next-line @typescript-eslint/no-explicit-any
const singlePromiseMap: Record<string, Promise<any>> = {};

export const singlePromise = <T>(
  cb: () => Promise<T>,
  key: string
): Promise<T> => {
  let promise = singlePromiseMap[key];
  if (!promise) {
    promise = cb().finally(() => {
      delete singlePromiseMap[key];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      promise = null;
    });
    singlePromiseMap[key] = promise;
  }
  return promise;
};

export const retryPromise = async (
  cb: () => Promise<boolean>,
  maxNumberOfRetries = 3
) => {
  for (let i = 0; i < maxNumberOfRetries; i++) {
    if (await cb()) {
      return true;
    }
  }

  return false;
};
