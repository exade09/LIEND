/** Minimal root layout. This deployment serves API route handlers only. */
export const metadata = { title: "LONS API" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
