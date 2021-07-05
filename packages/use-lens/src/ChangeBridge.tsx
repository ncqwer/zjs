import React from 'react';

type ForceUpdate = () => void;

export const ChangeBridgeContext = React.createContext<ForceUpdate | undefined>(
  undefined,
);

const defaultFallback = <div>state syncing...</div>;

export const ChangeBridge: React.FC<{
  fallback?: JSX.Element;
  controlled?: boolean;
}> = ({ fallback = defaultFallback, children, controlled = false }) => {
  const [, forceUpdate] = React.useReducer((c) => c + 1, 0) as [
    never,
    () => void,
  ];
  const parentForceUpdate = React.useContext(ChangeBridgeContext);
  return (
    <React.Suspense fallback={fallback}>
      <ChangeBridgeContext.Provider
        value={React.useCallback(() => {
          const hasParent = controlled && parentForceUpdate;
          if (hasParent) {
            return parentForceUpdate && parentForceUpdate();
          }
          forceUpdate();
        }, [controlled, forceUpdate, parentForceUpdate])}
      >
        {children}
      </ChangeBridgeContext.Provider>
    </React.Suspense>
  );
};
