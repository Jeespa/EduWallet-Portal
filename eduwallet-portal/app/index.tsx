import { Redirect } from "expo-router";
import { usePortalAuth } from "../src/context/PortalAuthContext";

export default function IndexPage() {
  const { isAuthenticated } = usePortalAuth();

  if (isAuthenticated) {
    return <Redirect href="/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}