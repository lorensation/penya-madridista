import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">Sobre Nosotros</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Conoce más sobre la Peña Lorenzo Sanz, nuestra historia y nuestra misión de honrar el legado de un
              presidente que marcó una época dorada en el Real Madrid.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div className="relative h-96 rounded-lg overflow-hidden shadow-xl">
              <Image src="/copa-fernandosanz-a-hombros.jpg" alt="Lorenzo Sanz" fill className="object-cover" />
            </div>
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-primary">Nuestra Historia</h2>
              <p className="text-gray-600">
                La Peña Lorenzo Sanz fue fundada en 2021 por un grupo de madridistas apasionados que querían honrar la
                memoria y el legado de Lorenzo Sanz, presidente del Real Madrid entre 1995 y 2000.
              </p>
              <p className="text-gray-600">
                Durante su presidencia, el Real Madrid volvió a la cima del fútbol europeo, ganando la Séptima y la
                Octava Copa de Europa después de 32 años de sequía en la máxima competición continental.
              </p>
              <p className="text-gray-600">
                Tras su fallecimiento en marzo de 2020, decidimos crear esta peña para mantener vivo su recuerdo y
                transmitir a las nuevas generaciones de madridistas la importancia de su figura en la historia reciente
                del club.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6 text-center">Nuestra Misión</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">Honrar su Legado</h3>
                <p className="text-gray-600">
                  Mantener viva la memoria de Lorenzo Sanz y su contribución al Real Madrid a través de eventos, charlas
                  y actividades.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Image
                    src="/logo-rm-icon.png"
                    alt="Logo Real Madrid"
                    width={90}
                    height={90}
                    className="object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">Unir Madridistas</h3>
                <p className="text-gray-600">
                  Crear una comunidad de aficionados que comparten la pasión por el Real Madrid y los valores que
                  representa.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Image
                    src="/valores-icon.png"
                    alt="Valores"
                    width={90}
                    height={90}
                    className="object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">Promover Valores</h3>
                <p className="text-gray-600">
                  Fomentar los valores del madridismo: respeto, deportividad, excelencia y compromiso con la victoria.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div className="space-y-6 order-2 md:order-1">
              <h2 className="text-2xl md:text-3xl font-bold text-primary">Actividades y Eventos</h2>
              <p className="text-gray-600">
                En la Peña Lorenzo Sanz organizamos diversas actividades y eventos a lo largo del año para nuestros
                socios:
              </p>
              <ul className="space-y-2 text-gray-600 list-disc pl-5">
                <li>
                  Viajes organizados a partidos del Real Madrid, tanto en el Santiago Bernabéu como a desplazamientos.
                </li>
                <li>Encuentros con exjugadores y figuras relevantes del madridismo.</li>
                <li>Charlas y coloquios sobre la historia del club y la era de Lorenzo Sanz.</li>
                <li>Torneos deportivos entre socios y otras peñas madridistas.</li>
                <li>Cenas y eventos sociales para fortalecer los lazos entre los miembros.</li>
              </ul>
            </div>
            <div className="relative h-96 rounded-lg overflow-hidden shadow-xl order-1 md:order-2">
              <Image
                src="/padre-hijo-rueda-prensa.jpg"
                alt="Eventos de la Peña"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Únete a Nuestra Comunidad</h2>
            <p className="text-lg mb-6 max-w-3xl mx-auto">
              Forma parte de la Peña Lorenzo Sanz y comparte tu pasión por el Real Madrid con otros aficionados que,
              como tú, valoran el legado de uno de los presidentes más importantes de la historia reciente del club.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/membership">
                <Button className="text-black bg-white hover:bg-black hover:text-secondary text-lg px-8 py-6 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-bold">
                  Hazte Socio
                </Button>
              </Link>
              <Link href="/membership">
                <Button className="text-black bg-white hover:bg-black hover:text-secondary text-lg px-8 py-6 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-bold">
                  Contáctanos
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

