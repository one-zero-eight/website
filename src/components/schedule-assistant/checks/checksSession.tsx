import type {
  SchemaCheckParameters,
  SchemaIssue,
} from "@/api/schedule-assistant/types.ts";
import {
  ALL_ISSUE_TYPES_FILTER,
  DEFAULT_CHECK_PARAMETERS,
  type IssueTypeFilter,
} from "@/components/schedule-assistant/checks/checksModel.ts";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ChecksSessionStore = {
  checkParameters: SchemaCheckParameters;
  setCheckParameters: (value: SchemaCheckParameters) => void;
  issues: SchemaIssue[];
  hasRun: boolean;
  selectedIssueType: IssueTypeFilter;
  setSelectedIssueType: (value: IssueTypeFilter) => void;
  saveCheckResults: (issues: SchemaIssue[]) => void;
  clearCheckResults: () => void;
};

const ChecksSessionContext = createContext<ChecksSessionStore | null>(null);

export function ChecksSessionProvider({ children }: { children: ReactNode }) {
  const [checkParameters, setCheckParameters] = useState(
    DEFAULT_CHECK_PARAMETERS,
  );
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState<IssueTypeFilter>(
    ALL_ISSUE_TYPES_FILTER,
  );

  const saveCheckResults = useCallback((nextIssues: SchemaIssue[]) => {
    setIssues(nextIssues);
    setHasRun(true);
  }, []);

  const clearCheckResults = useCallback(() => {
    setIssues([]);
    setHasRun(false);
    setSelectedIssueType(ALL_ISSUE_TYPES_FILTER);
  }, []);

  const value = useMemo(
    () => ({
      checkParameters,
      setCheckParameters,
      issues,
      hasRun,
      selectedIssueType,
      setSelectedIssueType,
      saveCheckResults,
      clearCheckResults,
    }),
    [
      checkParameters,
      issues,
      hasRun,
      selectedIssueType,
      saveCheckResults,
      clearCheckResults,
    ],
  );

  return (
    <ChecksSessionContext.Provider value={value}>
      {children}
    </ChecksSessionContext.Provider>
  );
}

export function useChecksSession() {
  const context = useContext(ChecksSessionContext);
  if (!context) {
    throw new Error(
      "useChecksSession must be used inside ChecksSessionProvider",
    );
  }
  return context;
}
