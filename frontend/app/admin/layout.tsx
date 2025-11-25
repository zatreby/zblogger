import '../globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';

export const metadata = {
  title: 'Zlogg Admin',
  description: 'Admin panel for Zlogg blog platform',
}

export default function AdminLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AdminAuthProvider>
            {children}
            <Toaster position="bottom-right" />
          </AdminAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}