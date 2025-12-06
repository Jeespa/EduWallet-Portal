import React, { createContext, useContext, useState, ReactNode } from "react";
import type { CredentialsResponse } from "../types";

type StudentContextValue = {
  id: string | null;
  sca: string | null;
  data: CredentialsResponse | null;
  setStudent: (id: string, sca: string, data: CredentialsResponse) => void;
  clearStudent: () => void;
};

const StudentContext = createContext<StudentContextValue | undefined>(
  undefined
);

export function StudentProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const [sca, setSca] = useState<string | null>(null);
  const [data, setData] = useState<CredentialsResponse | null>(null);

  const setStudent = (newId: string, newSca: string, newData: CredentialsResponse) => {
    setId(newId);
    setSca(newSca);
    setData(newData);
  };

  const clearStudent = () => {
    setId(null);
    setSca(null);
    setData(null);
  };

  return (
    <StudentContext.Provider value={{ id, sca, data, setStudent, clearStudent }}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) {
    throw new Error("useStudent must be used within a StudentProvider");
  }
  return ctx;
}
