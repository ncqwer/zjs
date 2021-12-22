import React from 'react';

export const useDerivedValue = <T>(value: T, onNewValue: (v: T) => void) => {
  const [{ inst }, forceUpdate] = React.useState(() => ({
    inst: {
      value,
      isInitial: true,
    },
  }));

  React.useMemo(() => {
    if (!inst.isInitial) onNewValue(value);
    inst.isInitial = false;
    inst.value = value;
  }, [inst, value]);
  const onChange = React.useCallback(
    (nVal: React.SetStateAction<T>) => {
      let newState: T = nVal as any;
      if (typeof nVal === 'function') {
        newState = (nVal as any)(inst.value);
      }
      if (nVal === inst.value) return;
      inst.value = newState;
      forceUpdate({ inst });
    },
    [inst],
  );
  React.useDebugValue(inst.value);
  return [inst.value, onChange] as const;
};
