import React from 'react';

const wrapper =
  typeof (React as any).startTransition === 'undefined'
    ? (fn: any) => fn()
    : (React as any).startTransition;

export const [startTransition, isTransition] = (() => {
  let isTranstionFlag = false;
  return [startTransition, isTransition] as const;

  function startTransition(fn: (...args: any[]) => void) {
    try {
      isTranstionFlag = true;
      wrapper(fn);
    } finally {
      isTranstionFlag = false;
    }
  }
  function isTransition() {
    return isTranstionFlag;
  }
})();
