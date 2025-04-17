import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Preguntas Frecuentes | Peña Lorenzo Sanz",
  description: "Respuestas a las preguntas más frecuentes sobre la Peña Madridista Lorenzo Sanz, membresías, eventos y más.",
}

export default function FAQPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8">Preguntas Frecuentes</h1>
      
      <div className="grid gap-8 max-w-4xl mx-auto">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Sobre la Peña</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Qué es la Peña Madridista Lorenzo Sanz Siempre Presente?</h3>
              <div className="text-gray-700">
                <p>
                  La Peña Madridista Lorenzo Sanz Siempre Presente es una asociación de aficionados del Real Madrid creada en honor a Don Lorenzo Sanz, expresidente del club entre 1995 y 2000, 
                  período en el que el equipo ganó 2 Copas de Europa (1998 y 2000). Nuestro objetivo es unir a los madridistas que admiran el legado de Lorenzo Sanz y 
                  compartir la pasión por el Real Madrid.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿La Peña está reconocida oficialmente por el Real Madrid?</h3>
              <div className="text-gray-700">
                <p>
                  Sí, somos una peña oficialmente reconocida por el Real Madrid C.F. y formamos parte de su programa oficial de peñas madridistas. 
                  Esto nos permite acceder a ciertos beneficios y colaboraciones con el club, aunque funcionamos de manera independiente en nuestra gestión diaria.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Dónde está ubicada la sede de la Peña?</h3>
              <div className="text-gray-700">
                <p>
                  Nuestra sede principal está ubicada en Madrid, aunque contamos con miembros de diferentes partes de España e incluso del extranjero. 
                  La dirección exacta de nuestra sede se proporciona a los socios una vez completada su inscripción.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Quiénes forman la junta directiva?</h3>
              <div className="text-gray-700">
                <p>
                  La junta directiva está formada por socios comprometidos con la peña, incluyendo a miembros de la familia Sanz, que mantienen vivo el legado de Don Lorenzo. 
                  Puedes conocer a los miembros de la junta directiva en la sección &quot;Sobre Nosotros&quot; de nuestra web.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Membresía y Suscripciones</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Cómo puedo hacerme socio de la Peña?</h3>
              <div className="text-gray-700">
                <p>
                  Para hacerte socio, simplemente debes registrarte en nuestra web y seleccionar el tipo de membresía que prefieras (Joven, Adulto o Familiar). 
                  Después de completar el formulario y realizar el pago correspondiente, recibirás un correo electrónico de confirmación con tu carnet digital 
                  y toda la información necesaria para acceder a los beneficios de socio.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Qué tipos de membresía ofrecéis?</h3>
              <div className="text-gray-700">
                <p>Ofrecemos tres tipos de membresía:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>Membresía Joven (Menores de 25 años)</strong>: Con cuota reducida, ideal para estudiantes y jóvenes aficionados.</li>
                  <li><strong>Membresía Adulto (Mayores de 25 años)</strong>: Nuestra membresía estándar con todos los beneficios.</li>
                  <li><strong>Membresía Familiar</strong>: Incluye a un adulto y un menor de la misma familia, con beneficios para ambos.</li>
                </ul>
                <p className="mt-2">
                  Cada tipo de membresía está disponible en modalidad mensual o anual, con descuentos en la suscripción anual.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Cuánto cuesta la membresía?</h3>
              <div className="text-gray-700">
                <p>Los precios actuales de nuestras membresías son:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>Membresía Joven</strong>: 5€/mes o 50€/año</li>
                  <li><strong>Membresía Adulto</strong>: 10€/mes o 100€/año</li>
                  <li><strong>Membresía Familiar</strong>: 15€/mes o 150€/año</li>
                </ul>
                <p className="mt-2">
                  Al elegir la opción anual te beneficias de un descuento equivalente a dos meses gratis.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Qué beneficios incluye la membresía?</h3>
              <div className="text-gray-700">
                <p>Como socio de la Peña, disfrutarás de múltiples beneficios:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Carnet oficial de socio de la Peña Lorenzo Sanz</li>
                  <li>Acceso a eventos exclusivos organizados por la peña</li>
                  <li>Posibilidad de participar en sorteos de entradas para partidos</li>
                  <li>Descuentos en viajes organizados para ver partidos</li>
                  <li>Acceso al contenido exclusivo de nuestra web</li>
                  <li>Participación en las reuniones y asambleas de la peña</li>
                  <li>Merchandising exclusivo de la peña</li>
                  <li>Boletín mensual con noticias y actividades</li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Cómo puedo cancelar mi suscripción?</h3>
              <div className="text-gray-700">
                <p>
                  Puedes cancelar tu suscripción en cualquier momento a través de tu área personal en la web o contactando directamente con nosotros.
                  La cancelación será efectiva al final del período de facturación actual, por lo que podrás seguir disfrutando de los beneficios
                  hasta ese momento.
                </p>
                <p className="mt-2">
                  No ofrecemos reembolsos por períodos parciales o no utilizados de membresía.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Es seguro el pago de la membresía?</h3>
              <div className="text-gray-700">
                <p>
                  Sí, todos los pagos se procesan a través de Stripe, uno de los procesadores de pago más seguros y reconocidos del mundo. 
                  No almacenamos tus datos de tarjeta en nuestros servidores, garantizando así la máxima seguridad en todas las transacciones.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Eventos y Actividades</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Qué tipo de eventos organiza la Peña?</h3>
              <div className="text-gray-700">
                <p>Organizamos diversos eventos a lo largo del año, como:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Visionado de partidos en grupo</li>
                  <li>Viajes organizados para asistir a partidos del Real Madrid</li>
                  <li>Charlas y coloquios con ex-jugadores y personalidades madridistas</li>
                  <li>Cenas y comidas de confraternización</li>
                  <li>Torneos deportivos entre socios</li>
                  <li>Actividades benéficas en nombre de la peña</li>
                  <li>Celebraciones especiales de títulos y aniversarios</li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Cómo puedo participar en los eventos?</h3>
              <div className="text-gray-700">
                <p>
                  Los eventos se anuncian en nuestra web, redes sociales y a través del boletín para socios. Como miembro, 
                  tendrás acceso prioritario para inscribirte en los eventos con plazas limitadas. Para participar, simplemente debes 
                  reservar tu plaza a través de la sección de eventos de nuestra web o contactando directamente con nosotros.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Organizáis viajes para ver partidos fuera de Madrid?</h3>
              <div className="text-gray-700">
                <p>
                  Sí, organizamos viajes tanto para partidos nacionales como internacionales del Real Madrid. Estos viajes suelen incluir 
                  transporte, alojamiento y entradas al partido, aunque las condiciones específicas varían según el destino. Los socios tienen 
                  prioridad y descuentos especiales en estos viajes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Entradas y Partidos</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿La Peña facilita entradas para los partidos?</h3>
              <div className="text-gray-700">
                <p>
                  Como peña oficial del Real Madrid, tenemos acceso a un cupo limitado de entradas para algunos partidos. Estas entradas 
                  se distribuyen entre los socios mediante un sistema equitativo que tiene en cuenta la antigüedad y participación en la peña. 
                  También organizamos sorteos de entradas entre los socios para partidos especiales.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Es necesario ser socio del Real Madrid para unirse a la Peña?</h3>
              <div className="text-gray-700">
                <p>
                  No, no es necesario ser socio del Real Madrid para formar parte de nuestra peña. Cualquier aficionado madridista puede unirse, 
                  independientemente de si es socio, abonado o tiene el carnet Madridista. Sin embargo, tener alguna de estas condiciones puede 
                  ofrecer beneficios adicionales en algunos eventos específicos.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Contacto y Soporte</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Cómo puedo contactar con la Peña?</h3>
              <div className="text-gray-700">
                <p>
                  Puedes contactarnos a través de los siguientes canales:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Email: <a href="mailto:info@plorenzosanz.com" className="text-primary hover:underline">info@lorenzosanz.com</a></li>
                  <li>Formulario de contacto en nuestra web</li>
                  <li>Redes sociales oficiales de la peña</li>
                  <li>Teléfono: +34 679 240 500 (en horario de atención)</li>
                  <li>Presencialmente en nuestra sede (con cita previa)</li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Cómo puedo reportar un problema con mi cuenta o suscripción?</h3>
              <div className="text-gray-700">
                <p>
                  Si tienes algún problema con tu cuenta o suscripción, por favor envía un email a <a href="mailto:info@lorenzosanz.com" className="text-primary hover:underline">info@lorenzosanz.com</a> con 
                  todos los detalles posibles. Nuestro equipo de soporte te responderá en un plazo máximo de 48 horas. Para problemas urgentes relacionados con pagos, 
                  puedes usar el formulario de contacto especial en la sección de &quot;Ayuda&quot; de nuestra web.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6 text-primary">Otras Preguntas</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Puedo colaborar con la Peña de alguna manera?</h3>
              <div className="text-gray-700">
                <p>
                  ¡Por supuesto! Siempre estamos abiertos a colaboraciones que beneficien a la peña y a sus socios. Si tienes ideas, proyectos o quieres 
                  ofrecer tus servicios/habilidades para la peña, ponte en contacto con nosotros explicando tu propuesta. También puedes postularte como 
                  voluntario para ayudar en la organización de eventos.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿Cómo puedo mantenerse informado sobre las novedades de la Peña?</h3>
              <div className="text-gray-700">
                <p>
                  Hay varias formas de mantenerse al día con nuestras actividades:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Suscribiéndote a nuestra newsletter (disponible incluso si no eres socio)</li>
                  <li>Siguiéndonos en redes sociales</li>
                  <li>Visitando regularmente nuestra web</li>
                  <li>Como socio, recibirás automáticamente nuestro boletín mensual con todas las novedades</li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium mb-2">¿La Peña tiene alguna relación con la familia de Lorenzo Sanz?</h3>
              <div className="text-gray-700">
                <p>
                  Sí, nuestra peña cuenta con el apoyo y reconocimiento de la familia Sanz. De hecho, algunos miembros de la familia participan activamente 
                  en la peña y en ocasiones especiales asisten a nuestros eventos. Mantenemos un estrecho vínculo con ellos para honrar adecuadamente el 
                  legado de Don Lorenzo Sanz.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <div className="mt-10 border-t border-gray-100 pt-8">
          <p className="text-gray-600 text-center">
            ¿No encuentras respuesta a tu pregunta? No dudes en <a href="/contact" className="text-primary hover:underline">contactar con nosotros</a>.
          </p>
        </div>
      </div>
    </div>
  )
}