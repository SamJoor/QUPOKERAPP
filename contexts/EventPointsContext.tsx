import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";

type EventPointsContextValue = {
  eventPoints: number;
  addEventPoints: (points: number) => void;
};

const EventPointsContext = createContext<EventPointsContextValue | null>(null);

export function EventPointsProvider({ children }: PropsWithChildren) {
  const [eventPoints, setEventPoints] = useState(0);

  const addEventPoints = useCallback((points: number) => {
    if (!Number.isFinite(points) || points <= 0) return;
    setEventPoints((current) => current + Math.round(points));
  }, []);

  const value = useMemo(() => ({ eventPoints, addEventPoints }), [addEventPoints, eventPoints]);

  return <EventPointsContext.Provider value={value}>{children}</EventPointsContext.Provider>;
}

export function useEventPoints() {
  const context = useContext(EventPointsContext);
  if (!context) throw new Error("useEventPoints must be used within EventPointsProvider.");
  return context;
}
