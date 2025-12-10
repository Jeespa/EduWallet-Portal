import { createContext, useContext, useState } from "react";
import type { JSX } from 'react';
import '../styles/MessagesProviderStyle.css'

/**
 * Enum defining the types of messages that can be displayed.
 * @author Diego Da Giau
 */
export enum MessageType {
    Error = 'error',
}

/**
 * Interface defining the shape of the MessagesContext.
 * Provides method to display messages to the user.
 * @author Diego Da Giau
 */
interface MessagesProviderProps {
    /** Function to display a message of specified type */
    showMessage(msg: string, type: MessageType): void,
}

/**
 * Context that provides messaging functionality throughout the application.
 * Default values are used before the provider is initialized.
 * @author Diego Da Giau
 */
const MessagesContext = createContext<MessagesProviderProps>({
    showMessage: () => { },
});

/**
 * MessagesProvider component that provides messaging context to its children.
 * Handles displaying, timing, and dismissal of application messages.
 * @author Diego Da Giau
 * @param {Object} props - The props object.
 * @param {React.ReactNode} props.children - The child components that will have access to the messaging context.
 * @returns {JSX.Element} The MessagesContext provider with the messaging state and functions.
 */
export default function MessagesProvider({ children }: { children: React.ReactNode }): JSX.Element {
    // State for controlling message visibility
    const [visible, setVisible] = useState(true);
    // State for the current message text
    const [currentMessage, setCurrentMessage] = useState('');
    // State for the current message type (affects styling)
    const [messageType, setMessageType] = useState<MessageType | undefined>();
    // State for tracking the timeout that auto-hides messages
    const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Hides the currently displayed message and clears any active timeout.
     * @author Diego Da Giau
     */
    const hideMessage = () => {
        setVisible(false);
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
    }

    /**
     * Displays a message of the specified type and sets a timeout to hide it.
     * @author Diego Da Giau
     * @param {string} msg - The message text to display
     * @param {MessageType} type - The type of message affecting its styling
     */
    const showMessage = (msg: string, type: MessageType) => {
        setCurrentMessage(msg);
        setMessageType(type);
        setVisible(true);
        const id = setTimeout(() => {
            setVisible(false)
        }, 4000);
        setTimeoutId(id);
    }

    // Provide messaging context to children
    return (
        <MessagesContext.Provider value={{ showMessage }}>
            {visible && currentMessage &&
                <div id="message" className={messageType ? messageType.toString() : ''}>
                    <span>{currentMessage}</span>
                    <button onClick={hideMessage}>x</button>
                </div>
            }
            {children}
        </MessagesContext.Provider>
    );
}

/**
 * Custom hook to access the messaging context.
 * Provides a convenient way to display messages from any component.
 * @author Diego Da Giau
 * @returns {MessagesProviderProps} The messaging context value
 */
export const useMessages = (): MessagesProviderProps => {
    return useContext(MessagesContext);
}
