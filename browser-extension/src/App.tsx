import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

import { Routes, Route } from "react-router-dom";
import type { JSX } from "react";
import LoginPage from "./pages/LoginPageComponent";
import Homepage from "./pages/HomePageComponent";
import StudentPage from "./pages/StudentPageComponent";
import CoursePage from "./pages/CoursePageComponent";
import AuthenticationProvider from "./providers/AuthenticationProvider";
import PrivateRoute from "./components/PrivateRoute";
import UniversitiesProvider from "./providers/UniversitiesProvider";
import PermissionsPage from "./pages/PermissionsPageComponent";
import Layout from "./components/LayoutComponent";
import PermissionsProvider from "./providers/PermissionsProvider";
import MessagesProvider from "./providers/MessagesProvider";

/**
 * The main application component that sets up routing and authentication.
 * @returns {JSX.Element} The rendered component.
 * @remarks
 * This component uses the `AuthenticationProvider` to wrap the routes and ensure that
 * authentication is handled. The routes include:
 * - `/login` for the login page
 * - `/wallet` for the homepage, which displays the list of universities
 * - `/student` for the student page
 * - `/wallet/:code` for the course page
 * - `/permissions` for the permissions page
 */
function App(): JSX.Element {
  return (
    <MessagesProvider>
      <AuthenticationProvider>
        <UniversitiesProvider>
          <PermissionsProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route path="/wallet" element={<Homepage />} />
                  <Route path="/student" element={<StudentPage />} />
                  <Route path="/wallet/:code" element={<CoursePage />} />
                  <Route path="/permissions" element={<PermissionsPage />} />
                </Route>
              </Route>
            </Routes>
          </PermissionsProvider>
        </UniversitiesProvider>
      </AuthenticationProvider>
    </MessagesProvider>
  );
}

export default App;
