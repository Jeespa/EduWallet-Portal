// app/context/StudentContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import type { CredentialsResponse } from "../types";

/**
 * Shape of the global student state that is shared across screens.
 *
 * - id:               Student identifier (login id)
 * - sca:              Student smart contract account address
 * - sessionToken:     Temporary gateway session token returned by login
 * - sessionExpiresAt: Optional expiry timestamp for the gateway session
 * - data:             Full login payload from the gateway
 * - setStudent:       Helper called on successful login
 * - clearStudent:     Helper called on logout
 */
type StudentContextValue = {
  id: string | null;
  sca: string | null;
  sessionToken: string | null;
  sessionExpiresAt: string | null;
  data: CredentialsResponse | null;
  setStudent: (id: string, sca: string, data: CredentialsResponse) => void;
  clearStudent: () => void;
};

/**
 * React context holding the current student session.
 * It is initialised as undefined and forced through the custom hook below.
 */
const StudentContext = createContext<StudentContextValue | undefined>(undefined);

/**
 * Provider component that wraps the app and keeps the student session in state.
 * Used in app/_layout.tsx so that all screens can access the same data.
 */
export function StudentProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const [sca, setSca] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [data, setData] = useState<CredentialsResponse | null>(null);

  /**
   * Store a new authenticated student session.
   */
  const setStudent = (newId: string, newSca: string, newData: CredentialsResponse) => {
    setId(newId);
    setSca(newSca);
    setSessionToken(newData.sessionToken ?? null);
    setSessionExpiresAt(newData.sessionExpiresAt ?? null);
    setData(newData);
  };

  /**
   * Clear the current session, used on logout.
   */
  const clearStudent = () => {
    setId(null);
    setSca(null);
    setSessionToken(null);
    setSessionExpiresAt(null);
    setData(null);
  };

  return (
    <StudentContext.Provider
      value={{
        id,
        sca,
        sessionToken,
        sessionExpiresAt,
        data,
        setStudent,
        clearStudent,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

/**
 * Convenience hook to access the student context.
 * Throws a descriptive error if used outside of StudentProvider.
 */
export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) {
    throw new Error("useStudent must be used within a StudentProvider");
  }
  return ctx;
}
