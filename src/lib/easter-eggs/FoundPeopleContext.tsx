import React, { createContext, useCallback, useContext, useMemo } from "react";

const STORAGE_KEY = "found_people_v1";

export const TARGET_PEOPLE = [
  "Khayotbek Mamajonov",
  "Artem Bulgakov",
  "Ruslan Belkov",
] as const;

type TargetName = (typeof TARGET_PEOPLE)[number];

type FoundPeopleContextValue = {
  found: Set<string>;
  markFound: (name: TargetName) => void;
  isFound: (name: TargetName) => boolean;
};

const FoundPeopleContext = createContext<FoundPeopleContextValue | undefined>(
  undefined,
);

export function FoundPeopleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [foundArray, setFoundArray] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed))
        return parsed.filter((x) => typeof x === "string");
      return [];
    } catch {
      return [];
    }
  });

  const found = useMemo(() => new Set(foundArray), [foundArray]);

  const persist = useCallback((arr: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  }, []);

  const markFound = useCallback(
    (name: TargetName) => {
      if (found.has(name)) return;
      const next = [...found, name];
      setFoundArray(next);
      persist(next);
    },
    [found, persist],
  );

  const isFound = useCallback((name: TargetName) => found.has(name), [found]);

  const value = useMemo(
    () => ({ found, markFound, isFound }),
    [found, markFound, isFound],
  );

  return (
    <FoundPeopleContext.Provider value={value}>
      {children}
    </FoundPeopleContext.Provider>
  );
}

export function useFoundPeople() {
  const ctx = useContext(FoundPeopleContext);
  if (!ctx)
    throw new Error("useFoundPeople must be used within FoundPeopleProvider");
  return ctx;
}
