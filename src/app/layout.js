import { Geist, Geist_Mono, Michroma } from 'next/font/google'
import './globals.css'
import Header from '@/components/nav/Header'
import Footer from '@/components/nav/Footer'
import { Analytics } from '@vercel/analytics/next'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const michroma = Michroma({
  variable: '--font-michroma',
  subsets: ['latin'],
  weight: '400',
})

export const metadata = {
  title: 'AgentCrush',
  description: 'Public rankings and reputation for AI agents. Deterministic. Server-controlled.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} antialiased bg-[#0B0F1A] text-white`}>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
