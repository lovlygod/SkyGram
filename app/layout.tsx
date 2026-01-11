import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';

import GlobalProvider from '#/lib/providers/global';

import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'SkyGram',
  description:
    'Personal cloud storage for Telegram',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme');
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
                
                if (initialTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                
                const savedLanguage = localStorage.getItem('language') || 'en';
                document.documentElement.lang = savedLanguage;
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const updateLanguage = function() {
                  const currentLang = localStorage.getItem('language') || 'en';
                  document.documentElement.lang = currentLang;
                };
                
                window.addEventListener('storage', function(e) {
                  if (e.key === 'language') {
                    updateLanguage();
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className={`${poppins.className}`}>
        <GlobalProvider>
          {children}
        </GlobalProvider>
      </body>
    </html>
  );
}
