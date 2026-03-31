import React, { createContext, useContext, useMemo, useState } from "react";
import type { Organization, PortalUser } from "../types/auth";

type PortalAuthContextValue = {
  token: string | null;
  user: PortalUser | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  signIn: (
    token: string,
    user: PortalUser,
    organization: Organization
  ) => void;
  signOut: () => void;
};

const PortalAuthContext = createContext<PortalAuthContextValue | undefined>(
  undefined
);

export function PortalAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const signIn = (
    newToken: string,
    newUser: PortalUser,
    newOrganization: Organization
  ) => {
    setToken(newToken);
    setUser(newUser);
    setOrganization(newOrganization);
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      organization,
      isAuthenticated: !!token && !!user && !!organization,
      signIn,
      signOut,
    }),
    [token, user, organization]
  );

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error("usePortalAuth must be used within a PortalAuthProvider");
  }
  return context;
}