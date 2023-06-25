//SwitchTheme.tsx
import { useTheme } from 'next-themes'

import React, { useEffect } from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import { useLocalStorage } from "usehooks-ts";
const SwitchTheme = () => {
  //we store the theme in localStorage to preserve the state on next visit with an initial theme of dark.
  const [theme, setTheme] = useLocalStorage("theme", "dark");

  //toggles the theme
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  //modify data-theme attribute on document.body when theme changes
  useEffect(() => {
    const body = document.body;
    body.setAttribute("data-theme", theme);
  }, [theme]);


  return (
    <button className="" onClick={toggleTheme}>
      {theme === "dark" ? (
        <><FiMoon className="w-5 h-5" /> Night</>
      ) : (
        <><FiSun className="w-5 h-5" /> Day</>
      )}
    </button>
  );
};

export default SwitchTheme;

