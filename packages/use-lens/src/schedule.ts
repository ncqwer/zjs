import { lens, Func } from '@zhujianshi/lens';

export const createSchedule = (createFlush: Func<Func>) => ({
  onStart,
  onFinish,
}: { onStart?: Func; onFinish?: Func } = {}) => {
  const tasks: Func[] = [];
  const cb = () => {
    tasks.splice(0, tasks.length).forEach((task) => task());
    if (onFinish) onFinish();
  };
  const postMessage = createFlush(cb);
  return (task: Func) => {
    if (tasks.push(task) === 1) {
      postMessage();
      if (onStart) onStart();
    }
  };
};

export const macroTaskSchedule = createSchedule((cb: Func) => {
  if (typeof MessageChannel !== 'undefined') {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = cb;
    return () => port2.postMessage(null);
  }
  return () => setTimeout(cb);
});

export const microTaskSchedule = createSchedule((cb: Func) => () =>
  Promise.resolve().then(cb),
);
