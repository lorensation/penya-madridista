export default function HomeLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return children
  }
  
  // Prevent static prerendering for the home page only
  export const dynamic = 'force-dynamic'
  export const revalidate = 0