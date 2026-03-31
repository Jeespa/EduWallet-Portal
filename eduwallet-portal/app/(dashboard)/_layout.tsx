import { Redirect, Slot } from "expo-router";
import { usePortalAuth } from "../context/PortalAuthContext";
import { PortalShell } from "../components/PortalShell";

export default function DashboardLayout() {
  const { isAuthenticated } = usePortalAuth();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <PortalShell>
      <Slot />
    </PortalShell>
  );
}