"use client"
import Head from 'next/head'
import { Inter } from '@next/font/google'
import Login from './login'
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import ShowSession from './mysession';
import { SessionProvider } from 'next-auth/react';

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <>
      <Head>
        <title>login to nostr1.com</title>
        <meta name="description" content="nostr1" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <Login />
      </div>
    </>
  )
}
