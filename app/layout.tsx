/* eslint-disable @next/next/no-head-element */
import type { Metadata } from 'next';
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
    weight: ['400', '700'],
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

// Site-wide defaults; app/page.tsx overrides for the landing page.
export const metadata: Metadata = {
  metadataBase: (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_ROOT_DOMAIN || "https://relay.tools");
    } catch {
      return new URL("https://relay.tools");
    }
  })(),
  title: {
    default: "relay.tools",
    template: "%s · relay.tools",
  },
  description:
    "Hosted nostr relays paid in sats, the Relay Tools Android app, and Newlay, an open-source relay engine.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    siteName: "relay.tools",
    type: "website",
    images: [{ url: "/landing/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

//export default function RootLayout({ children, }: { children: React.ReactNode; }) {
export default async function RootLayout({ children, }: React.PropsWithChildren) {

  // Get theme based on the cookie "theme".
  const themeCookieStore = await cookies()
  const themeCookie = themeCookieStore.get('theme')

  // If the cookie "theme" does not exist, set theme to the first index of Themes.
  const currentTheme = themeCookie ? themeCookie.value : Themes[0]

  const headersList = await headers()
  const rewritten = headersList.get('middleware-rewritten')
  const path = headersList.get('next-url')

  return (
    <html lang="en" data-theme={currentTheme} className={`${robotoMono.variable} ${robotoCondensed.variable} ${roboto.variable} font-roboto leading-normal ${currentTheme === 'dark' ? 'dark' : ''}`}>
      <head></head>
      <body>
        <div className="mx-auto lg:max-w-7xl max-w-screen font-roboto">
          <AuthContext>

            {rewritten == null && !path?.includes('/posts') &&
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
