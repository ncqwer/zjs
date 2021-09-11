import { lens } from '@zhujianshi/lens';
import { UnsupportedConfigError, Func } from './error';

const noEffectWrapper = (f: Func) => f();

export const createSchedule = (createFlush: Func<Func>) => ({
  onStart,
  onFinish,
  wrapper = noEffectWrapper,
}: { onStart?: Func; onFinish?: Func; wrapper?: (f: Func) => void } = {}) => {
  const tasks: Func[] = [];
  const cb = () => {
    noEffectWrapper(() =>
      tasks.splice(0, tasks.length).forEach((task) => task()),
    );
    if (onFinish) onFinish();
  };
  const postMessage = createFlush(cb);
  return (task: Func) => {
    if (tasks.push(task) === 1) {
      if (onStart) onStart();
      postMessage();
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

export const instantTaskSchedule = createSchedule((cb: Func) => cb);

export const createTaskScheduleByMode = (
  mode: 'macro' | 'micro' | 'instant',
) => {
  if (mode === 'micro') return microTaskSchedule;
  if (mode === 'macro') return macroTaskSchedule;
  if (mode === 'instant') return instantTaskSchedule;
  throw UnsupportedConfigError('mode');
};
