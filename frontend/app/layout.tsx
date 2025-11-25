import './globals.css';
import { ThemeProvider } from './contexts/ThemeContext';

export const metadata = {
  title: 'Zlogg',
  description: 'A simple blog platform',
}

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
