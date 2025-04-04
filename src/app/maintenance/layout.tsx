export default function MaintenanceLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <html lang="es">
        <head>
          <title>Sitio en Mantenimiento</title>
          <meta name="description" content="Nuestro sitio está actualmente en mantenimiento. Volveremos pronto." />
        </head>
        <body>{children}</body>
      </html>
    )
  }