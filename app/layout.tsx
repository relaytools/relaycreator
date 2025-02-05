/* eslint-disable @next/next/no-head-element */
import '../styles/globals.css';
import AuthContext from './AuthContext';
import ShowSession from './mysession';
import ThemeProvider from "./components/themeProvider";
import { cookies } from 'next/headers'
import Themes from '../lib/themes'
import { headers } from 'next/headers'
import { Roboto, Roboto_Mono, Roboto_Condensed, Open_Sans } from 'next/font/google'
import { useSelectedLayoutSegments } from 'next/navigation'


const roboto = Roboto({
    weight: '400',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto',
})

const robotoCondensed = Roboto_Condensed({
    weight: '400',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto-condensed',
})

const robotoMono = Roboto_Mono({
    weight: '400',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto-mono',
})

//export default function RootLayout({ children, }: { children: React.ReactNode; }) {
export default function RootLayout({ children, }: React.PropsWithChildren) {

  // Get theme based on the cookie "theme".
  const themeCookie = cookies().get('theme')
  // If the cookie "theme" does not exist, set theme to the first index of Themes.
  const currentTheme = themeCookie ? themeCookie.value : Themes[0]

  const headersList = headers()
  const rewritten = headersList.get('middleware-rewritten')
  const path = headersList.get('next-url')
  console.log("path: ", path)

  return (
    <html data-theme={currentTheme} className={`${robotoMono.variable} ${robotoCondensed.variable} ${roboto.variable} font-roboto leading-normal`}>
      <head></head>
      <body>
        <div className="bg-base-100 mx-auto lg:max-w-7xl max-w-screen font-roboto">
          <AuthContext>

            {rewritten == null &&
            <div className="flex justify-between font-roboto">
                <ShowSession theme={currentTheme}/>
                <ThemeProvider />
            </div>
            }

            {children}
          </AuthContext>
        </div>
      </body>
    </html >
  );
}
