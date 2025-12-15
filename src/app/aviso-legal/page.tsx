import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Aviso Legal | Peña Lorenzo Sanz",
  description: "Aviso legal e identificación del titular de la Peña Madridista Lorenzo Sanz Siempre Presente.",
}

export default function AvisoLegalPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8">Aviso Legal</h1>
      
      <div className="prose max-w-none">
        <p className="text-sm text-gray-500 mb-6">Última actualización: 15 de diciembre de 2025</p>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Identificación del Titular</h2>
          <p>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa a los usuarios de los siguientes datos identificativos del titular de este sitio web:</p>
          
          <div className="bg-gray-50 p-6 rounded-lg mt-4 border border-gray-200">
            <ul className="space-y-2">
              <li><strong>Denominación social:</strong> PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE</li>
              <li><strong>CIF:</strong> G22674352</li>
              <li><strong>Naturaleza jurídica:</strong> Asociación sin ánimo de lucro, constituida al amparo de la Ley Orgánica 1/2002, de 22 de marzo, reguladora del Derecho de Asociación</li>
              <li><strong>Domicilio social:</strong> C/ Martín Pescador, Nº 9, 28023 Madrid</li>
              <li><strong>Correo electrónico:</strong> info@lorenzosanz.com</li>
              <li><strong>Sitio web:</strong> www.lorenzosanz.com</li>
            </ul>
          </div>
          
          <p className="mt-4">La asociación se encuentra debidamente inscrita en el Registro Nacional de Asociaciones del Ministerio del Interior de España.</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Objeto y Actividad</h2>
          <p>PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE es una asociación de aficionados del Real Madrid Club de Fútbol, creada con el propósito de:</p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Honrar y preservar el legado de Don Lorenzo Sanz Mancebo, expresidente del Real Madrid C.F.</li>
            <li>Fomentar el espíritu madridista y los valores deportivos.</li>
            <li>Organizar actividades, eventos y viajes relacionados con el Real Madrid C.F.</li>
            <li>Facilitar la participación de los socios en eventos deportivos.</li>
            <li>Crear una comunidad de aficionados comprometidos.</li>
          </ul>
          <p>La asociación no tiene ánimo de lucro. Los ingresos obtenidos mediante cuotas de membresía, donaciones o ventas se destinan íntegramente a la consecución de los fines sociales y al mantenimiento de las actividades de la peña.</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Objeto del Sitio Web</h2>
          <p>El presente sitio web tiene como finalidad:</p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Proporcionar información sobre la asociación, sus actividades y eventos.</li>
            <li>Permitir el registro de usuarios y la gestión de membresías.</li>
            <li>Facilitar la contratación de servicios de membresía mediante pago electrónico.</li>
            <li>Ofrecer contenido exclusivo a los socios.</li>
            <li>Comercializar productos y merchandising relacionado con la peña.</li>
            <li>Facilitar la comunicación entre la asociación y sus miembros.</li>
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Condiciones Generales de Uso</h2>
          <p>El acceso y uso de este sitio web atribuye la condición de usuario e implica la aceptación plena y sin reservas de todas las disposiciones incluidas en este Aviso Legal, así como en la Política de Privacidad y los Términos y Condiciones.</p>
          
          <p className="mt-4">El usuario se compromete a:</p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Hacer un uso adecuado y lícito del sitio web y de sus contenidos, de conformidad con la legislación aplicable, la moral, las buenas costumbres y el orden público.</li>
            <li>No realizar actividades ilícitas o contrarias a la buena fe.</li>
            <li>No difundir contenidos o propaganda de carácter racista, xenófobo, pornográfico, de apología del terrorismo o que atenten contra los derechos humanos.</li>
            <li>No provocar daños en los sistemas físicos y lógicos del sitio web, de sus proveedores o de terceros.</li>
            <li>No introducir o difundir virus informáticos o cualesquiera otros sistemas que puedan causar daños.</li>
            <li>No intentar acceder y, en su caso, utilizar las cuentas de correo electrónico de otros usuarios.</li>
          </ul>
          
          <p>La asociación se reserva el derecho a denegar o retirar el acceso al sitio web y/o los servicios ofrecidos sin necesidad de preaviso, a instancia propia o de un tercero, a aquellos usuarios que incumplan las presentes condiciones.</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Propiedad Intelectual e Industrial</h2>
          <p>Todos los contenidos del sitio web, incluyendo a título enunciativo pero no limitativo: textos, fotografías, gráficos, imágenes, iconos, tecnología, software, enlaces y demás contenidos audiovisuales o sonoros, así como su diseño gráfico y códigos fuente, son propiedad intelectual de PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE o de terceros que han autorizado su uso, sin que puedan entenderse cedidos al usuario ninguno de los derechos de explotación reconocidos por la normativa vigente en materia de propiedad intelectual.</p>
          
          <p className="mt-4">Las marcas, nombres comerciales y signos distintivos son propiedad de PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE o de terceros, sin que pueda entenderse que el acceso al sitio web atribuya ningún derecho sobre los mismos.</p>
          
          <p className="mt-4">Queda expresamente prohibida la reproducción, distribución, comunicación pública y transformación de los contenidos del sitio web sin la autorización expresa del titular, salvo para uso personal y privado.</p>
          
          <p className="mt-4">Real Madrid C.F., su escudo, logotipos y marcas comerciales relacionadas son propiedad exclusiva de Real Madrid Club de Fútbol. PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE no es una entidad oficial de Real Madrid C.F., aunque puede ostentar la condición de peña oficial reconocida por el club.</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Pagos y Transacciones Electrónicas</h2>
          <p>El sitio web ofrece la posibilidad de contratar membresías y adquirir productos mediante pago electrónico. Todos los pagos se procesan a través de <strong>Stripe Payments Europe, Ltd.</strong>, proveedor de servicios de pago autorizado y regulado por el Banco Central de Irlanda.</p>
          
          <p className="mt-4">La asociación no almacena datos de tarjetas de crédito o débito en sus servidores. Dichos datos son tratados directamente por Stripe conforme a los estándares de seguridad PCI-DSS (Payment Card Industry Data Security Standard).</p>
          
          <p className="mt-4">Al realizar un pago, el usuario acepta los términos de servicio de Stripe y autoriza el cargo correspondiente. Para más información sobre el tratamiento de datos de pago, consulte nuestra <a href="/privacy-policy" className="text-primary hover:underline">Política de Privacidad</a> y los <a href="/terms-and-conditions" className="text-primary hover:underline">Términos y Condiciones</a>.</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Exclusión de Garantías y Responsabilidad</h2>
          <p>PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier naturaleza que pudieran ocasionar, a título enunciativo: errores u omisiones en los contenidos, falta de disponibilidad del sitio web, o la transmisión de virus o programas maliciosos en los contenidos, a pesar de haber adoptado todas las medidas tecnológicas necesarias para evitarlo.</p>
          
          <p className="mt-4">El sitio web puede contener enlaces a sitios web de terceros. La asociación no asume ninguna responsabilidad sobre el contenido, información o servicios que pudieran aparecer en dichos sitios, los cuales tienen finalidad meramente informativa.</p>
          
          <p className="mt-4">La asociación no garantiza la disponibilidad continua e ininterrumpida del sitio web, pudiendo suspender el acceso temporalmente por razones técnicas, de mantenimiento o actualización.</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Protección de Datos Personales</h2>
          <p>El tratamiento de los datos personales de los usuarios se realiza conforme a lo establecido en el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).</p>
          
          <p className="mt-4">Para información detallada sobre el tratamiento de sus datos personales, bases legales, finalidades, derechos y destinatarios, consulte nuestra <a href="/privacy-policy" className="text-primary hover:underline">Política de Privacidad</a>.</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Legislación Aplicable y Jurisdicción</h2>
          <p>Las relaciones entre PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE y el usuario se regirán por la legislación española vigente.</p>
          
          <p className="mt-4">Para la resolución de cualquier controversia que pudiera surgir, las partes se someten a los Juzgados y Tribunales del domicilio del usuario, siempre que este tenga la condición de consumidor conforme al Real Decreto Legislativo 1/2007. En caso contrario, las partes se someten a los Juzgados y Tribunales de Madrid capital, con renuncia expresa a cualquier otro fuero que pudiera corresponderles.</p>
          
          <p className="mt-4">Asimismo, informamos de la existencia de la plataforma de resolución de litigios en línea de la Unión Europea, accesible en: <a href="https://ec.europa.eu/consumers/odr" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a></p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Modificaciones</h2>
          <p>PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE se reserva el derecho de modificar, en cualquier momento y sin previo aviso, la presentación y configuración del sitio web, así como el presente Aviso Legal. Por ello, recomendamos al usuario que lea atentamente el mismo cada vez que acceda al sitio web.</p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">11. Contacto</h2>
          <p>Para cualquier consulta o aclaración sobre este Aviso Legal, puede ponerse en contacto con nosotros a través de:</p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li><strong>Correo electrónico:</strong> <a href="mailto:info@lorenzosanz.com" className="text-primary hover:underline">info@lorenzosanz.com</a></li>
            <li><strong>Dirección postal:</strong> [INSERTAR DIRECCIÓN COMPLETA]</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
