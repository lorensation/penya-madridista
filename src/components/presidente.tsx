import Image from "next/image"

export default function Presidente() {
  return (
    <div className="bg-gray-50 py-16 my-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Main title and intro - always at the top */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Nuestro Presidente</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
              Lorenzo Sanz Durán, al frente de nuestra peña, continúa el legado de su padre manteniendo vivos los valores del madridismo y su espíritu ganador.
            </p>
          </div>

          {/* First section - Image 1 left, First half of text right */}
          <div className="flex flex-col md:grid md:grid-cols-2 gap-12 items-center mb-16">
            {/* Image 1 (mobile: 1st position, desktop: left) */}
            <div className="relative h-[450px] w-full rounded-lg overflow-hidden shadow-xl order-1 md:order-1 mb-8 md:mb-0">
              <Image 
                src="/lorenzosanzduran-blancoynegro.jpg" 
                alt="Lorenzo Sanz Durán" 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-top" 
              />
            </div>
            
            {/* First half of text (mobile: 2nd position, desktop: right) */}
            <div className="space-y-6 order-2 md:order-2">
              <h3 className="text-2xl font-bold text-primary">Lorenzo Sanz Durán</h3>
              <p className="text-gray-700 italic font-medium">
              `&quot;`El Real Madrid no es solo un club, es un sentimiento que nos une y nos define como madridistas`&quot;`
              </p>
              <p className="text-gray-600">
                Nacido el 16 de junio de 1971 en Madrid, Lorenzo Sanz Durán es un exjugador y dirigente de baloncesto español. 
                Hijo del expresidente del Real Madrid Lorenzo Sanz, y hermano de los futbolistas Paco y Fernando Sanz, 
                Lorenzo ha mantenido siempre una fuerte vinculación con el mundo del deporte y el madridismo.
              </p>
              <p className="text-gray-600">
                Como jugador, se formó en la cantera del Real Madrid Junior y en la NCAA con los Lafayette Leopards entre 1991 y 1993, 
                para luego desarrollar su carrera en equipos como el Club Baloncesto Las Rozas, Canoe y el Real Madrid, 
                con quien conquistó la Recopa de Europa en la temporada 1996-97.
              </p>
            </div>
          </div>

          {/* Second section - Second half of text left, Image 2 right */}
          <div className="flex flex-col md:grid md:grid-cols-2 gap-12 items-center">
            {/* Image 2 (mobile: 3rd position, desktop: right) */}
            <div className="relative h-[450px] w-full rounded-lg overflow-hidden shadow-xl order-3 md:order-4 mb-8 md:mb-0">
              <Image 
                src="/lorenzosanzduran-layout.jpg" 
                alt="Lorenzo Sanz Durán en actividades" 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover" 
              />
            </div>
            
            {/* Second half of text (mobile: 4th position, desktop: left) */}
            <div className="space-y-6 order-4 md:order-3">
              <p className="text-gray-600">
                Tras retirarse como jugador en 1999, Lorenzo asumió la dirección técnica del Real Madrid de baloncesto, 
                logrando ganar la Liga ACB en el año 2000 en una memorable final contra el FC Barcelona en el Palau Blaugrana.
                A pesar de la breve duración de su gestión, su paso por los despachos fue exitoso y dejó huella en el club.
              </p>
              <p className="text-gray-600">
                Actualmente, además de presidir nuestra Peña Madridista, Lorenzo colabora como comentarista en Real Madrid Televisión 
                y comparte su pasión por el madridismo, manteniendo vivo el legado de su padre.
              </p>
              <p className="text-gray-600">
                Su liderazgo en nuestra peña ha sido fundamental para el crecimiento y la organización de eventos que han fortalecido
                los lazos entre los socios y el sentimiento madridista que nos une.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}