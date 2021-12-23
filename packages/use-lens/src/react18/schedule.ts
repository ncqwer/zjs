type Func<Ret = any, Parameter extends any[] = any[]> = (
  ...args: Parameter
) => Ret;

const createSchedule = (createFlush: Func<Func>) => {
  let currentTask: Func | null = null;
  const cb = () => {
    const f = currentTask;
    currentTask = null;
    f!();
  };
  const postMessage = createFlush(cb);
  return (task: Func) => {
    if (!currentTask) {
      currentTask = task;
      postMessage();
    }
  };
};

export const getMacroTaskSchedule = (f: Func) =>
  createSchedule((cb: Func) => {
    const callback = () => {
      f();
      cb();
    };
    // if (typeof MessageChannel !== 'undefined') {
    //   const { port1, port2 } = new MessageChannel();
    //   port1.onmessage = callback;
    //   return () => port2.postMessage(null);
    // }
    return () => setTimeout(callback);
  });

export const getMicroTaskSchedule = (f: Func) =>
  createSchedule(
    (cb: Func) => () =>
      Promise.resolve().then(() => {
        f();
        cb();
      }),
  );

const noEffect = () => {};

export const [getScheduler, microBundled, macroBundled] = (function () {
  let scheduler: Func = createSchedule((cb) => () => cb());
  return [() => scheduler, microBundled, macroBundled] as const;

  function microBundled(f1: Func, f2: Func = noEffect) {
    const preScheduler = scheduler;
    scheduler = getMicroTaskSchedule(f2);
    try {
      f1();
    } finally {
      scheduler = preScheduler;
    }
  }
  function macroBundled(f1: Func, f2: Func = noEffect) {
    const preScheduler = scheduler;
    scheduler = getMacroTaskSchedule(f2);
    try {
      f1();
    } finally {
      scheduler = preScheduler;
    }
  }
})();
