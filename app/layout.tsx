/* eslint-disable @next/next/no-head-element */
import '../styles/globals.css';
import AuthContext from './AuthContext';
import ShowSession from './mysession';
import ThemeProvider from "./components/themeProvider";
import { cookies } from 'next/headers'
import Themes from '../lib/themes'
import { headers } from 'next/headers'
import { Roboto } from 'next/font/google'

const roboto = Roboto({
    weight: '400',
    subsets: ['latin'],
    display: 'swap',
})

//export default function RootLayout({ children, }: { children: React.ReactNode; }) {
export default function RootLayout({ children, }: React.PropsWithChildren) {

  // Get theme based on the cookie "theme".
  const themeCookie = cookies().get('theme')
  // If the cookie "theme" does not exist, set theme to the first index of Themes.
  const currentTheme = themeCookie ? themeCookie.value : Themes[0]

  const headersList = headers()
  const rewritten = headersList.get('middleware-rewritten')

  return (
    <html data-theme={currentTheme} className={roboto.className}>
      <head></head>
      <body>
        <div className="bg-base-100 mx-auto max-w-7xl">
          <AuthContext>
            <div className="flex justify-between">
            <ShowSession />
            <ThemeProvider />
            </div>
            {children}
          </AuthContext>
        </div>
      </body>
    </html >
  );
}
