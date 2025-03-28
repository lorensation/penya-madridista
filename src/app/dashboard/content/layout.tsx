export default function ContentLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    )
  }
  
  export const dynamic = 'force-dynamic'
  export const revalidate = 0