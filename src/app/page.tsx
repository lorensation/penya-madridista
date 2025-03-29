import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import NewsletterForm from "@/components/newsletter-form"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-secondary py-20 text-white">
        <div className="container mx-auto px-4 py-12 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">Peña Lorenzo Sanz</h1>
              <p className="text-xl md:text-2xl">
                Honrando el legado de un presidente que marcó una época dorada en el Real Madrid
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link href="/membership" className="sm:w-auto">
                  <Button className="bg-accent text-black hover:bg-black hover:text-secondary text-lg px-8 py-6 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-bold">
                    Hazte Socio
                  </Button>
                </Link>
                <Link href="/about" className="sm:w-auto">
                  <Button
                    variant="outline"
                    className="border-white text-black hover:bg-black hover:text-secondary text-lg px-8 py-6 w-full sm:w-auto transition-colors duration-300"
                  >
                    Conoce Más
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative h-80 md:h-96 rounded-lg overflow-hidden shadow-xl">
              <Image
                src="/lorenzosanz-copa.jpg"
                alt="Lorenzo Sanz"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Beneficios de ser Socio</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Únete a nuestra peña y disfruta de experiencias exclusivas relacionadas con el Real Madrid y el legado de
              Lorenzo Sanz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              </div>
              <h3 className="text-xl font-bold text-primary text-center mb-3">Eventos Exclusivos</h3>
              <p className="text-gray-600 text-center">
                Acceso a eventos exclusivos, reuniones con exjugadores y visitas especiales al estadio.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6 mx-auto">
                <Image
                  src="/money.svg"
                  alt="Logo Dinero"
                  width={90}
                  height={90}
                  className="object-contain"
                />
              </div>
              <h3 className="text-xl font-bold text-primary text-center mb-3">Descuentos Especiales</h3>
              <p className="text-gray-600 text-center">
                Descuentos en merchandising oficial, entradas y viajes organizados para ver al equipo.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-6 mx-auto">
                <Image
                  src="/logo-rm-icon.png"
                  alt="Logo Real Madrid"
                  width={90}
                  height={90}
                  className="object-contain"
                />
              </div>
              <h3 className="text-xl font-bold text-primary text-center mb-3">Comunidad Madridista</h3>
              <p className="text-gray-600 text-center">
                Forma parte de una comunidad de aficionados que comparten la pasión por el Real Madrid.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/membership">
              <Button className="text-white bg-black hover:bg-white hover:text-primary text-lg px-8 py-6 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-bold">
                Únete ahora
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Full-width Banner Section */}
      <section 
        className="relative w-full h-96 md:h-[400px] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: 'url(/septima-banner.jpg)',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-transparent bg-opacity-40"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg">Un Legado de Victorias</h2>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg">
            Bajo la presidencia de Lorenzo Sanz, el Real Madrid volvió a conquistar Europa
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Lo Que Dicen Nuestros Socios</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Descubre las experiencias de quienes ya forman parte de nuestra peña madridista.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full mr-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={"h-full w-full text-gray-400"}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold">Carlos Rodríguez</h4>
                  <p className="text-sm text-gray-500">Socio desde 2020</p>
                </div>
              </div>
              <p className="text-gray-600">
                &ldquo;Ser parte de la Peña Lorenzo Sanz ha sido una experiencia increíble. Los eventos exclusivos y la
                camaradería entre los socios hacen que valga la pena cada euro de la membresía.&rdquo;
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full mr-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={"h-full w-full text-gray-400"}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold">Ana Martínez</h4>
                  <p className="text-sm text-gray-500">Socia desde 2021</p>
                </div>
              </div>
              <p className="text-gray-600">
                &ldquo;Los descuentos en entradas y la posibilidad de conocer a exjugadores del Madrid han hecho que mi
                experiencia como madridista sea aún más especial. Totalmente recomendado.&rdquo;
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full mr-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={"h-full w-full text-gray-400"}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold">Miguel Fernández</h4>
                  <p className="text-sm text-gray-500">Socio desde 2019</p>
                </div>
              </div>
              <p className="text-gray-600">
                &ldquo;La peña organiza los mejores viajes para ver al Madrid. He podido asistir a partidos de Champions que
                nunca habría podido organizar por mi cuenta. Una familia madridista de verdad.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Mantente Informado</h2>
            <p className="text-lg mb-8">
              Suscríbete a nuestro boletín para recibir las últimas noticias, eventos y ofertas exclusivas.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}