export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

// Prevent static prerendering
export const dynamic = 'force-dynamic'
export const revalidate = 0