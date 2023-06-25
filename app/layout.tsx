/* eslint-disable @next/next/no-head-element */
import '/styles/globals.css';
import AuthContext from './AuthContext';
import ShowSession from './mysession';

//export default function RootLayout({ children, }: { children: React.ReactNode; }) {
export default function RootLayout({ children, }: React.PropsWithChildren) {
  return (
    <html>
      <head></head>
      <body className='min-h-screen bg-base-100'>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bg-base-100">
          <AuthContext>
            <ShowSession />
            {children}
          </AuthContext>
        </div>
      </body>
    </html >
  );
}
