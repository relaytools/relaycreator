'use client'

import { useState, useEffect } from 'react'
import { FiMoon, FiSun } from "react-icons/fi";

export default function ThemeSwitcher({
    theme,
    list,
}: {
    theme: string
    list: string[]
}) {
    const [currentTheme, setTheme] = useState(theme)
    const [isLoading, setLoading] = useState(true)

    useEffect(() => {
        // Set the cookie "theme" with an expiry date of 400 days (Maximum expiry date for Chromium browsers).
        document.cookie =
            `theme=${currentTheme};expires=` +
            new Date(new Date().getTime() + 400 * 24 * 60 * 60 * 1000).toUTCString()
        
        // Set the data-theme attribute for <html>
        document.documentElement.setAttribute('data-theme', currentTheme)
        
        // Also toggle the 'dark' class for Tailwind CSS dark mode
        if (currentTheme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        
        setLoading(false)
    }, [currentTheme])

    function toggleTheme() {
        setLoading(true)
        const currentIndex = list.indexOf(currentTheme)
        if (currentIndex === list.length - 1) return setTheme(list[0])
        else if (currentIndex >= 0 && currentIndex < list.length)
            return setTheme(list[currentIndex + 1])
        else return setTheme(list[0])
    }

    return (
        <button
            onClick={toggleTheme}
            className=""
            disabled={isLoading}
        >
            {isLoading ? (
                <span className="loading loading-spinner text-primary w-4 h-4" />
            ) : (
                currentTheme == "dark" ? (<FiMoon />) : (<FiSun />)
            )}
        </button>
    )
}