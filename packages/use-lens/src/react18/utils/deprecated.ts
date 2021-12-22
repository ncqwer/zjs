export const deprecated = (() => {
  const set = new Set<string>();

  return (apiName: string, warn?: string) => {
    if (!set.has(apiName)) {
      set.add(apiName);
      console.warn(`[use-lesn]:'${apiName}' was deprecated!${warn}`);
    }
  };
})();
