/* eslint-disable @next/next/no-head-element */
import '../styles/globals.css';
import AuthContext from './AuthContext';
import ShowSession from './mysession';
import ThemeProvider from "./components/themeProvider";
import { cookies } from 'next/headers'
import Themes from '../lib/themes'
import { headers } from 'next/headers'

//export default function RootLayout({ children, }: { children: React.ReactNode; }) {
export default function RootLayout({ children, }: React.PropsWithChildren) {

  // Get theme based on the cookie "theme".
  const themeCookie = cookies().get('theme')
  // If the cookie "theme" does not exist, set theme to the first index of Themes.
  const currentTheme = themeCookie ? themeCookie.value : Themes[0]

  const headersList = headers()
  const rewritten = headersList.get('middleware-rewritten')

  if(rewritten) {
    return(
    <html data-theme={currentTheme}>
      <head></head>
      <body>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bg-base-100">
          <div className="items-right text-right">
            <ThemeProvider />
          </div>
            {children}
        </div>
      </body>
    </html >
    )
  } else {
  return (
    <html data-theme={currentTheme}>
      <head></head>
      <body>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bg-base-100">
          <div className="items-right text-right">
            <ThemeProvider />
          </div>
          <AuthContext>
            <ShowSession />
            {children}
          </AuthContext>
        </div>
      </body>
    </html >
  );
  }
}
