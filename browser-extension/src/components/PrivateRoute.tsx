import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../providers/AuthenticationProvider";
import type { JSX } from "react";

/**
 * PrivateRoute component restricts access to routes based on student authentication.
 * If the student is not authenticated, it redirects to the login page.
 * Otherwise, it renders the child routes.
 * @author Diego Da Giau
 * @returns {JSX.Element} The rendered private route component.
 */
export default function PrivateRoute(): JSX.Element {
  const student = useAuth();

  // Check if the student is authenticated
  if (student.student.id === "") {
    // If not authenticated, redirect to the login page
    return <Navigate to="/login" />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
}
