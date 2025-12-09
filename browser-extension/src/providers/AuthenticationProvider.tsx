import { createContext, useContext, useState } from "react";
import type { JSX } from "react";
import { Credentials, StudentModel } from "../models/student";
import { logIn } from "../lib/gatewayAdapter"
import { useNavigate } from "react-router-dom";
import { MessageType, useMessages } from "./MessagesProvider";

/**
 * Interface defining the shape of the AuthenticationContext.
 * Provides access to authenticated student data and login method.
 * @author Diego Da Giau
 */
interface AuthenticationProviderProps {
    /** Currently authenticated student model */
    student: StudentModel,
    /** Function to authenticate a student with credentials */
    login(credentials: Credentials): Promise<void>,
}

/**
 * Context that provides authentication data throughout the application.
 * Default values are used before the provider is initialized.
 * @author Diego Da Giau
 */
const AuthContext = createContext<AuthenticationProviderProps>({
    student: StudentModel.createEmpty(),
    login: () => Promise.resolve()
});

/**
 * AuthenticationProvider component that provides authentication context to its children.
 * @author Diego Da Giau
 * @param {Object} props - The props object.
 * @param {React.ReactNode} props.children - The child components that will have access to the authentication context.
 * @returns {JSX.Element} The AuthContext provider with the authentication state and functions.
 */
export default function AuthenticationProvider({ children }: { children: React.ReactNode }): JSX.Element {
    // State for storing the authenticated student
    const [student, setStudent] = useState<StudentModel>(StudentModel.createEmpty());

    // Navigation hook for redirecting after login
    const navigate = useNavigate();

    // Get the messages functionality at the component level
    const showMessage = useMessages().showMessage;

    /**
     * Authenticates a student using the provided credentials.
     * Updates the student state and redirects to wallet page on success.
     * @author Diego Da Giau
     * @param {Credentials} credentials - The student's login credentials
     * @returns {Promise<void>} A promise that resolves when authentication completes
     */
    const login = async (credentials: Credentials): Promise<void> => {
        try {
            // Attempt to authenticate with provided credentials
            const studentTemp = await logIn(credentials);

            // Update authenticated student state
            setStudent(studentTemp);

            // Redirect to wallet page on successful login
            navigate("/wallet");
        } catch (err: any) {
            showMessage(err.message, MessageType.Error);
        }
    };

    // Provide authentication context to children
    return (
        <AuthContext.Provider value={{ student, login }}>
            {children}
        </AuthContext.Provider>
    )
}

/**
 * Custom hook to access the authentication context.
 * Provides a convenient way to consume authentication data and methods.
 * @author Diego Da Giau
 * @returns {AuthenticationProviderProps} The authentication context value
 */
export const useAuth = (): AuthenticationProviderProps => {
    return useContext(AuthContext)
}
