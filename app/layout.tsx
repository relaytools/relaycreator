/* eslint-disable @next/next/no-head-element */
import './globals.css';
import AuthContext from './AuthContext';
import ShowSession from './mysession'

//export default function RootLayout({ children, }: { children: React.ReactNode; }) {
export default function RootLayout({ children, }: React.PropsWithChildren) {
  return (
    <html>
      <head></head>
      <body>
        <div>
          <AuthContext>
            <ShowSession />
            {children}
          </AuthContext>
        </div>
      </body>
    </html >
  );
}
