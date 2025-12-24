import { createContext, useContext, useState } from 'react'

const LayoutContext = createContext(null)

export const useLayout = () => {
    const context = useContext(LayoutContext)
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider')
    }
    return context
}

export function LayoutProvider({ children }) {
    const [headerContent, setHeaderContent] = useState(null)
    const [hideStandardNav, setHideStandardNav] = useState(false)

    return (
        <LayoutContext.Provider value={{ headerContent, setHeaderContent, hideStandardNav, setHideStandardNav }}>
            {children}
        </LayoutContext.Provider>
    )
}
