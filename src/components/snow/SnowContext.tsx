import { createContext, useContext } from "react";
import { useLocalStorage } from "usehooks-ts";
import { SnowTypes } from "./types";
import React from "react";

const SnowVisibilityContext = createContext<SnowTypes | undefined>(undefined);

export const SnowVisibilityProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isSnowVisible, setSnowVisible] = useLocalStorage<boolean>(
    "snow",
    true,
  );

  const toggleSnowVisibility = () => setSnowVisible((prev) => !prev);

  return (
    <SnowVisibilityContext.Provider
      value={{ isSnowVisible, toggleSnowVisibility }}
    >
      {children}
    </SnowVisibilityContext.Provider>
  );
};

export const useSnowVisibility = () => {
  const context = useContext(SnowVisibilityContext);
  if (context === undefined) {
    throw new Error(
      "useSnowVisibility must be used within a SnowVisibilityProvider",
    );
  }
  return context;
};
