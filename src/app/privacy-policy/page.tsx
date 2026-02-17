import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidad | Peña Lorenzo Sanz",
  description: "Política de Privacidad de la Peña Madridista Lorenzo Sanz. Información sobre cómo recopilamos, utilizamos y protegemos sus datos personales.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8">Política de Privacidad</h1>
      
      <div className="prose max-w-none">
        <p className="text-sm text-gray-500 mb-6">Última actualización: 16 de febrero de 2026</p>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
          <p>
            En Peña Madridista Lorenzo Sanz Siempre Presente (en adelante, &quot;nosotros&quot;, &quot;nuestra&quot;, &quot;nuestro&quot;, o &quot;la Peña&quot;), 
            respetamos su privacidad y nos comprometemos a proteger sus datos personales. Esta política de 
            privacidad le informará sobre cómo cuidamos sus datos personales cuando visita nuestro sitio web 
            (independientemente de dónde lo visite) y le informará sobre sus derechos de privacidad y cómo 
            la ley lo protege.
          </p>
          <p>
            Esta política de privacidad se proporciona en un formato por capas para que pueda hacer clic en 
            las áreas específicas establecidas a continuación.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Información importante y quiénes somos</h2>
          <p>
            <strong>Propósito de esta política de privacidad</strong>
          </p>
          <p>
            El propósito de esta política de privacidad es proporcionarle información sobre cómo la Peña Madridista 
            Lorenzo Sanz Siempre Presente recopila y procesa sus datos personales a través de su uso de este sitio web, incluyendo 
            cualquier dato que pueda proporcionar a través de este sitio web cuando se registra como usuario, 
            se suscribe a nuestra newsletter, adquiere una membresía, realiza compras en nuestra tienda o utiliza nuestros servicios.
          </p>
          <p>
            Este sitio web no está destinado a niños y no recopilamos datos relacionados con niños 
            conscientemente, salvo como parte de una membresía familiar cuando los datos son proporcionados 
            por un adulto responsable.
          </p>
          <p>
            Es importante que lea esta política de privacidad junto con cualquier otro aviso de privacidad 
            que podamos proporcionar en ocasiones específicas cuando estemos recopilando o procesando datos 
            personales sobre usted para que esté completamente consciente de cómo y por qué estamos utilizando 
            sus datos.
          </p>
          
          <p className="mt-4">
            <strong>Responsable del tratamiento</strong>
          </p>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-4">
            <ul className="space-y-2">
              <li><strong>Denominación social:</strong> PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE</li>
              <li><strong>CIF:</strong> G22674352</li>
              <li><strong>Naturaleza jurídica:</strong> Asociación sin ánimo de lucro</li>
              <li><strong>Domicilio social:</strong> [INSERTAR DIRECCIÓN COMPLETA]</li>
              <li><strong>Correo electrónico:</strong> info@lorenzosanz.com</li>
            </ul>
          </div>
          <p>
            La Peña Madridista Lorenzo Sanz Siempre Presente es el responsable del tratamiento de sus datos personales conforme al Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
          </p>
          <p className="mt-4">
            Hemos designado un responsable de protección de datos (DPO) que es responsable de supervisar 
            las preguntas relacionadas con esta política de privacidad. Si tiene alguna pregunta sobre esta 
            política de privacidad, incluida cualquier solicitud para ejercer sus derechos legales, contacte con 
            el DPO utilizando los detalles proporcionados a continuación.
          </p>
          
          <p className="mt-4">
            <strong>Información de contacto</strong>
          </p>
          <p>
            Nuestros datos completos son:
          </p>
          <p>
            Peña Madridista Lorenzo Sanz Siempre Presente<br />
            Email: info@lorenzosanz.com<br />
            Dirección postal: [INSERTAR DIRECCIÓN COMPLETA]
          </p>
          
          <p className="mt-4">
            Tiene derecho a presentar una reclamación en cualquier momento ante la Agencia Española de 
            Protección de Datos (AEPD), la autoridad de supervisión española para cuestiones de protección 
            de datos (www.aepd.es). Sin embargo, agradeceríamos la oportunidad de abordar sus inquietudes 
            antes de que se acerque a la AEPD, así que por favor contáctenos en primera instancia.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Los datos que recopilamos sobre usted</h2>
          <p>
            Los datos personales, o información personal, significa cualquier información sobre un individuo 
            a partir de la cual esa persona puede ser identificada. No incluye datos donde la identidad ha sido 
            eliminada (datos anónimos).
          </p>
          <p>
            Podemos recopilar, usar, almacenar y transferir diferentes tipos de datos personales sobre usted 
            que hemos agrupado de la siguiente manera:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>
              <strong>Datos de identidad</strong> como nombre, apellidos, nombre de usuario o identificador 
              similar, fecha de nacimiento, DNI/NIE/Pasaporte.
            </li>
            <li>
              <strong>Datos de contacto</strong> como dirección postal, dirección de correo electrónico y 
              números de teléfono.
            </li>
            <li>
              <strong>Datos financieros</strong> como detalles de tarjetas de pago. Nota importante: Los datos de su tarjeta de crédito o débito son procesados directamente por nuestro proveedor de servicios de pago, <strong>Redsys Servicios de Procesamiento, S.L.</strong> (en adelante, &quot;RedSys&quot;), a través de su pasarela de pago segura, y nunca son almacenados en nuestros servidores. RedSys es un proveedor certificado PCI-DSS Nivel 1, regulado por el Banco de España.
            </li>
            <li>
              <strong>Datos de transacciones</strong> como detalles sobre los pagos de y hacia usted (importes, fechas, conceptos), historial de membresías y compras realizadas en nuestra tienda.
            </li>
            <li>
              <strong>Datos técnicos</strong> como dirección IP, datos de inicio de sesión, tipo y versión de 
              navegador, configuración de zona horaria y ubicación, tipos y versiones de plugins del navegador, 
              sistema operativo y plataforma, y otra tecnología en los dispositivos que utiliza para acceder a este sitio web.
            </li>
            <li>
              <strong>Datos de perfil</strong> como su nombre de usuario y contraseña, su número de socio del Real Madrid o 
              número de Carnet Madridista (si aplicable), sus preferencias, comentarios y respuestas a encuestas.
            </li>
            <li>
              <strong>Datos de uso</strong> como información sobre cómo utiliza nuestro sitio web y servicios.
            </li>
            <li>
              <strong>Datos de marketing y comunicaciones</strong> como sus preferencias para recibir marketing 
              de nuestra parte y de nuestros terceros y sus preferencias de comunicación.
            </li>
          </ul>
          
          <p>
            También recopilamos, utilizamos y compartimos <strong>Datos Agregados</strong> como datos estadísticos o 
            demográficos para cualquier propósito. Los Datos Agregados pueden derivarse de sus datos personales pero 
            no se consideran datos personales según la ley, ya que estos datos no revelan directa o indirectamente 
            su identidad. Por ejemplo, podemos agregar sus Datos de Uso para calcular el porcentaje de usuarios que 
            acceden a una función específica del sitio web. Sin embargo, si combinamos o conectamos los Datos Agregados 
            con sus datos personales de manera que puedan identificarlo directa o indirectamente, tratamos los datos 
            combinados como datos personales que serán utilizados de acuerdo con esta política de privacidad.
          </p>
          
          <p className="mt-4">
            <strong>Categorías especiales de datos personales</strong>
          </p>
          <p>
            No recopilamos ninguna Categoría Especial de Datos Personales sobre usted (esto incluye detalles sobre 
            su raza o etnia, creencias religiosas o filosóficas, vida sexual, orientación sexual, opiniones políticas, 
            afiliación sindical, información sobre su salud y datos genéticos y biométricos). Tampoco recopilamos 
            ninguna información sobre condenas penales y delitos.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Cómo se recopilan sus datos personales</h2>
          <p>
            Utilizamos diferentes métodos para recopilar datos de y sobre usted, incluyendo:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>
              <strong>Interacciones directas.</strong> Puede proporcionarnos sus datos de identidad, contacto 
              y financieros al completar formularios o al corresponderse con nosotros por correo postal, teléfono, 
              correo electrónico o de otra manera. Esto incluye datos personales que proporciona cuando:
              <ul className="list-disc pl-6 my-2 space-y-1">
                <li>se registra para una cuenta en nuestro sitio web;</li>
                <li>se suscribe a una membresía;</li>
                <li>se suscribe a nuestras publicaciones o newsletters;</li>
                <li>solicita que se le envíe información;</li>
                <li>participa en un concurso, promoción o encuesta; o</li>
                <li>nos proporciona algún feedback o se pone en contacto con nosotros.</li>
              </ul>
            </li>
            <li>
              <strong>Tecnologías automatizadas o interacciones.</strong> A medida que interactúa con nuestro sitio web, 
              podemos recopilar automáticamente Datos Técnicos sobre su equipo, acciones de navegación y patrones. 
              Recopilamos estos datos personales mediante cookies, registros del servidor y otras tecnologías similares.
            </li>
            <li>
              <strong>Terceros o fuentes públicamente disponibles.</strong> Podemos recibir datos personales sobre usted de 
              varios terceros como se establece a continuación:
              <ul className="list-disc pl-6 my-2 space-y-1">
                <li>Datos Técnicos de proveedores de análisis como Google Analytics;</li>
                <li>Datos de Contacto, Financieros y de Transacciones de proveedores de servicios de pago como <strong>Redsys Servicios de Procesamiento, S.L.</strong> (pasarela de pago autorizada y regulada por el Banco de España);</li>
                <li>Datos de Identidad y Contacto de fuentes públicamente disponibles.</li>
              </ul>
            </li>
          </ul>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 my-4">
            <h4 className="font-semibold mb-2">Información sobre RedSys como encargado del tratamiento</h4>
            <p>Redsys Servicios de Procesamiento, S.L. actúa como encargado del tratamiento de los datos de pago en nuestro nombre. RedSys procesa los datos de su tarjeta de forma segura conforme a los estándares PCI-DSS a través de su pasarela de pago con autenticación 3D Secure (EMV 3DS), y no comparte sus datos financieros con nosotros más allá de la información necesaria para confirmar la transacción (últimos 4 dígitos de la tarjeta, tipo de tarjeta, estado de la transacción).</p>
            <p className="mt-2">Para más información sobre cómo RedSys trata sus datos, consulte la <a href="https://www.redsys.es/en/data-protection.html" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Política de Protección de Datos de RedSys</a>.</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Cómo utilizamos sus datos personales</h2>
          <p>
            Solo utilizaremos sus datos personales cuando la ley nos lo permita. Más comúnmente, utilizaremos sus 
            datos personales en las siguientes circunstancias:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Cuando necesitemos ejecutar el contrato que estamos a punto de celebrar o hemos celebrado con usted.</li>
            <li>Cuando sea necesario para nuestros intereses legítimos (o los de un tercero) y sus intereses 
            y derechos fundamentales no anulen esos intereses.</li>
            <li>Cuando necesitemos cumplir con una obligación legal o regulatoria.</li>
          </ul>
          
          <p>
            Generalmente, no nos basamos en el consentimiento como base legal para procesar sus datos personales 
            excepto en relación con el envío de comunicaciones de marketing directo de terceros a través de correo 
            electrónico o mensajes de texto. Tiene derecho a retirar su consentimiento para el marketing en cualquier 
            momento contactándonos en info@lorenzosanz.com.
          </p>
          
          <p className="mt-4">
            <strong>Propósitos para los que utilizaremos sus datos personales</strong>
          </p>
          <p>
            Hemos establecido a continuación, en formato de tabla, una descripción de todas las formas en que 
            planeamos utilizar sus datos personales y en qué bases legales nos basamos para hacerlo. También 
            hemos identificado cuáles son nuestros intereses legítimos cuando corresponde.
          </p>
          
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b border-r text-left">Propósito/Actividad</th>
                  <th className="py-2 px-4 border-b border-r text-left">Tipo de datos</th>
                  <th className="py-2 px-4 border-b text-left">Base legal para el procesamiento</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-4 border-b border-r">Registrarlo como nuevo usuario</td>
                  <td className="py-2 px-4 border-b border-r">
                    (a) Identidad<br />
                    (b) Contacto
                  </td>
                  <td className="py-2 px-4 border-b">
                    Ejecución de un contrato con usted
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b border-r">
                    Procesar y entregar su membresía incluyendo:<br />
                    (a) Gestionar pagos, tarifas y cargos<br />
                    (b) Cobrar y recuperar dinero que se nos debe
                  </td>
                  <td className="py-2 px-4 border-b border-r">
                    (a) Identidad<br />
                    (b) Contacto<br />
                    (c) Financieros<br />
                    (d) Transacciones<br />
                    (e) Marketing y Comunicaciones
                  </td>
                  <td className="py-2 px-4 border-b">
                    (a) Ejecución de un contrato con usted<br />
                    (b) Necesario para nuestros intereses legítimos (recuperar deudas que se nos deben)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b border-r">
                    Gestionar nuestra relación con usted lo que incluirá:<br />
                    (a) Notificarle sobre cambios en nuestros términos o política de privacidad<br />
                    (b) Pedirle que deje una reseña o complete una encuesta
                  </td>
                  <td className="py-2 px-4 border-b border-r">
                    (a) Identidad<br />
                    (b) Contacto<br />
                    (c) Perfil<br />
                    (d) Marketing y Comunicaciones
                  </td>
                  <td className="py-2 px-4 border-b">
                    (a) Ejecución de un contrato con usted<br />
                    (b) Necesario para cumplir con una obligación legal<br />
                    (c) Necesario para nuestros intereses legítimos (mantener nuestros registros actualizados y estudiar cómo los clientes usan nuestros servicios)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b border-r">
                    Permitirle participar en sorteos, concursos o completar una encuesta
                  </td>
                  <td className="py-2 px-4 border-b border-r">
                    (a) Identidad<br />
                    (b) Contacto<br />
                    (c) Perfil<br />
                    (d) Uso<br />
                    (e) Marketing y Comunicaciones
                  </td>
                  <td className="py-2 px-4 border-b">
                    (a) Ejecución de un contrato con usted<br />
                    (b) Necesario para nuestros intereses legítimos (estudiar cómo los clientes usan nuestros servicios, desarrollarlos y hacer crecer nuestro negocio)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b border-r">
                    Administrar y proteger nuestro negocio y este sitio web (incluyendo resolución de problemas, análisis de datos, pruebas, mantenimiento del sistema, soporte, reporte y alojamiento de datos)
                  </td>
                  <td className="py-2 px-4 border-b border-r">
                    (a) Identidad<br />
                    (b) Contacto<br />
                    (c) Técnicos
                  </td>
                  <td className="py-2 px-4 border-b">
                    (a) Necesario para nuestros intereses legítimos (para dirigir nuestro negocio, provisión de administración y servicios de TI, seguridad de la red, prevenir fraude y en el contexto de una reorganización empresarial o ejercicio de reestructuración del grupo)<br />
                    (b) Necesario para cumplir con una obligación legal
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p className="mt-6">
            <strong>Marketing</strong>
          </p>
          <p>
            Nos esforzamos por proporcionarle opciones con respecto a ciertos usos de datos personales, 
            particularmente en torno al marketing y la publicidad.
          </p>
          
          <p className="mt-4">
            <strong>Ofertas promocionales nuestras</strong>
          </p>
          <p>
            Podemos utilizar sus datos de Identidad, Contacto, Técnicos, Uso y Perfil para formarnos una opinión sobre 
            lo que creemos que puede querer o necesitar, o lo que puede ser de interés para usted. Así es como decidimos 
            qué productos, servicios y ofertas pueden ser relevantes para usted (lo llamamos marketing).
          </p>
          <p>
            Recibirá comunicaciones de marketing de nosotros si nos ha solicitado información o ha adquirido 
            una membresía con nosotros y no ha optado por no recibir ese marketing.
          </p>
          
          <p className="mt-4">
            <strong>Marketing de terceros</strong>
          </p>
          <p>
            Obtendremos su consentimiento expreso antes de compartir sus datos personales con cualquier tercero 
            para fines de marketing.
          </p>
          
          <p className="mt-4">
            <strong>Optar por no recibir</strong>
          </p>
          <p>
            Puede solicitarnos en cualquier momento que dejemos de enviarle mensajes de marketing poniéndose en 
            contacto con nosotros en cualquier momento.
          </p>
          <p>
            Cuando opte por no recibir estos mensajes de marketing, esto no se aplicará a los datos personales que 
            nos proporcione como resultado de la compra de una membresía u otros servicios.
          </p>
          
          <p className="mt-4">
            <strong>Cookies</strong>
          </p>
          <p>
            Puede configurar su navegador para rechazar todas o algunas cookies del navegador, o para alertarlo cuando 
            los sitios web configuran o acceden a cookies. Si desactiva o rechaza las cookies, tenga en cuenta que 
            algunas partes de este sitio web pueden volverse inaccesibles o no funcionar correctamente. Para más 
            información sobre las cookies que utilizamos, consulte nuestra <a href="/cookies" className="text-primary hover:underline">política de cookies</a>.
          </p>
          
          <p className="mt-4">
            <strong>Cambio de propósito</strong>
          </p>
          <p>
            Solo utilizaremos sus datos personales para los fines para los que los recopilamos, a menos que 
            consideremos razonablemente que necesitamos usarlos por otra razón y esa razón es compatible con el 
            propósito original.
          </p>
          <p>
            Si necesitamos utilizar sus datos personales para un propósito no relacionado, se lo notificaremos y 
            le explicaremos la base legal que nos permite hacerlo.
          </p>
          <p>
            Tenga en cuenta que podemos procesar sus datos personales sin su conocimiento o consentimiento, en 
            cumplimiento de las reglas anteriores, cuando sea requerido o permitido por la ley.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Divulgaciones de sus datos personales</h2>
          <p>
            Es posible que tengamos que compartir sus datos personales con las partes que se indican a continuación 
            para los fines establecidos en la tabla del punto 5 anterior:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>
              <strong>Redsys Servicios de Procesamiento, S.L.</strong> (España) como encargado del tratamiento para el procesamiento de pagos de membresías y compras a través de su pasarela de pago segura. RedSys está autorizado y regulado por el Banco de España y cumple con PCI-DSS Nivel 1.
            </li>
            <li>
              Proveedores de servicios que actúan como procesadores que proporcionan servicios de TI, alojamiento web y administración de sistemas (Vercel, Supabase).
            </li>
            <li>
              Proveedores de servicios de correo electrónico para el envío de comunicaciones transaccionales y de marketing (Mailgun).
            </li>
            <li>
              Asesores profesionales que actúan como procesadores o controladores conjuntos, incluidos abogados, 
              banqueros, auditores y aseguradoras que brindan servicios de consultoría, bancarios, legales, 
              de seguros y contables.
            </li>
            <li>
              Autoridades fiscales (Agencia Tributaria), autoridades reguladoras y otras autoridades que actúan como procesadores o 
              controladores conjuntos, que requieren la presentación de informes de actividades de procesamiento 
              en determinadas circunstancias.
            </li>
            <li>
              Terceros a quienes podemos elegir vender, transferir o fusionar partes de nuestro negocio o 
              nuestros activos. Alternativamente, podemos buscar adquirir otros negocios o fusionarnos con ellos. 
              Si ocurre un cambio en nuestro negocio, los nuevos propietarios pueden usar sus datos personales de 
              la misma manera que se establece en esta política de privacidad.
            </li>
          </ul>
          
          <p>
            Requerimos que todos los terceros respeten la seguridad de sus datos personales y los traten de 
            acuerdo con la ley. No permitimos que nuestros proveedores de servicios terceros utilicen sus datos 
            personales para sus propios fines y solo les permitimos procesar sus datos personales para fines 
            específicos y de acuerdo con nuestras instrucciones.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Transferencias internacionales</h2>
          <p>
            Compartimos sus datos personales dentro de nuestra organización. Esto implicará la transferencia de 
            sus datos fuera del Espacio Económico Europeo (EEE) solo si fuera estrictamente necesario.
          </p>
          
          <p>
            Muchos de nuestros proveedores de servicios externos se encuentran fuera del Espacio Económico Europeo 
            (EEE), por lo que su procesamiento de sus datos personales implicará una transferencia de datos fuera del EEE.
          </p>
          
          <p>
            Siempre que transferimos sus datos personales fuera del EEE, nos aseguramos de que se les brinde un 
            grado de protección similar garantizando que se implemente al menos una de las siguientes salvaguardas:
          </p>
          
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>
              Solo transferiremos sus datos personales a países que hayan sido considerados por la Comisión Europea 
              como que proporcionan un nivel adecuado de protección para los datos personales.
            </li>
            <li>
              Cuando usamos ciertos proveedores de servicios, podemos usar contratos específicos aprobados por la 
              Comisión Europea que brindan a los datos personales la misma protección que tienen en Europa.
            </li>
            <li>
              Cuando utilizamos proveedores con sede en EE. UU., podemos transferirles datos si son parte del 
              Marco de Protección de la Privacidad UE-EE. UU., que les exige proporcionar una protección similar 
              a los datos personales compartidos entre Europa y EE. UU.
            </li>
          </ul>
          
          <p>
            Por favor, contáctenos si desea más información sobre el mecanismo específico que utilizamos al 
            transferir sus datos personales fuera del EEE.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Seguridad de datos</h2>
          <p>
            Hemos implementado medidas de seguridad apropiadas para evitar que sus datos personales se pierdan 
            accidentalmente, se utilicen o accedan de forma no autorizada, se alteren o divulguen. Además, 
            limitamos el acceso a sus datos personales a aquellos empleados, agentes, contratistas y otros 
            terceros que tienen una necesidad comercial de conocerlos. Solo procesarán sus datos personales 
            según nuestras instrucciones y están sujetos a un deber de confidencialidad.
          </p>
          
          <p>
            Hemos implementado procedimientos para abordar cualquier sospecha de violación de datos personales 
            y le notificaremos a usted y a cualquier regulador aplicable sobre una violación cuando estemos 
            legalmente obligados a hacerlo.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Retención de datos</h2>
          <p>
            Solo conservaremos sus datos personales durante el tiempo que sea necesario para cumplir con los 
            fines para los que los recopilamos, incluyendo para satisfacer cualquier requisito legal, contable 
            o de informes.
          </p>
          
          <p>
            Para determinar el período de retención apropiado para los datos personales, consideramos la cantidad, 
            naturaleza y sensibilidad de los datos personales, el riesgo potencial de daño por uso o divulgación 
            no autorizados de sus datos personales, los fines para los que procesamos sus datos personales y si 
            podemos lograr esos fines a través de otros medios, y los requisitos legales aplicables.
          </p>
          
          <p>
            Por ley, debemos conservar información básica sobre nuestros clientes (incluidos datos de contacto, 
            identidad, financieros y transaccionales) durante seis años después de que dejen de ser clientes para 
            fines fiscales.
          </p>
          
          <p>
            En algunas circunstancias, puede solicitarnos que eliminemos sus datos: consulte sus derechos legales 
            a continuación para obtener más información.
          </p>
          
          <p>
            En algunas circunstancias, podemos anonimizar sus datos personales (para que ya no puedan asociarse 
            con usted) con fines de investigación o estadísticos, en cuyo caso podemos utilizar esta información 
            indefinidamente sin previo aviso.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Sus derechos legales</h2>
          <p>
            Bajo ciertas circunstancias, tiene derechos bajo las leyes de protección de datos en relación con 
            sus datos personales. Tiene derecho a:
          </p>
          
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>
              <strong>Solicitar acceso</strong> a sus datos personales (comúnmente conocido como &quot;solicitud de 
              acceso de sujeto de datos&quot;). Esto le permite recibir una copia de los datos personales que tenemos 
              sobre usted y verificar que los estamos procesando legalmente.
            </li>
            <li>
              <strong>Solicitar la corrección</strong> de los datos personales que tenemos sobre usted. Esto le 
              permite corregir cualquier dato incompleto o inexacto que tengamos sobre usted, aunque es posible 
              que necesitemos verificar la precisión de los nuevos datos que nos proporcione.
            </li>
            <li>
              <strong>Solicitar la eliminación</strong> de sus datos personales. Esto le permite solicitarnos que 
              eliminemos o removamos datos personales donde no hay una buena razón para que continuemos procesándolos. 
              También tiene derecho a solicitarnos que eliminemos o removamos sus datos personales donde ha ejercido 
              con éxito su derecho a objetar el procesamiento (ver a continuación), donde podemos haber procesado 
              su información ilegalmente o donde estamos obligados a borrar sus datos personales en cumplimiento 
              de la ley local. Tenga en cuenta, sin embargo, que no siempre podremos cumplir con su solicitud de 
              eliminación por razones legales específicas que se le notificarán, si corresponde, al momento de su solicitud.
            </li>
            <li>
              <strong>Objetar al procesamiento</strong> de sus datos personales donde nos basamos en un interés 
              legítimo (o los de un tercero) y hay algo en su situación particular que hace que desee objetar el 
              procesamiento por este motivo, ya que siente que impacta en sus derechos y libertades fundamentales. 
              También tiene derecho a objetar donde procesamos sus datos personales para fines de marketing directo. 
              En algunos casos, podemos demostrar que tenemos motivos legítimos convincentes para procesar su 
              información que anulan sus derechos y libertades.
            </li>
            <li>
              <strong>Solicitar la restricción del procesamiento</strong> de sus datos personales. Esto le permite 
              solicitarnos que suspendamos el procesamiento de sus datos personales en los siguientes escenarios:
              <ul className="list-disc pl-6 my-2">
                <li>Si desea que establezcamos la precisión de los datos.</li>
                <li>Donde nuestro uso de los datos es ilegal pero no desea que los eliminemos.</li>
                <li>Donde necesita que mantengamos los datos incluso si ya no los requerimos, ya que los 
                necesita para establecer, ejercer o defender reclamaciones legales.</li>
                <li>Ha objetado nuestro uso de sus datos, pero debemos verificar si tenemos motivos 
                legítimos predominantes para usarlos.</li>
              </ul>
            </li>
            <li>
              <strong>Solicitar la transferencia</strong> de sus datos personales a usted o a un tercero. Le 
              proporcionaremos a usted, o a un tercero que haya elegido, sus datos personales en un formato 
              estructurado, de uso común y legible por máquina. Tenga en cuenta que este derecho solo se aplica 
              a la información automatizada que inicialmente nos dio su consentimiento para usar o donde usamos 
              la información para ejecutar un contrato con usted.
            </li>
            <li>
              <strong>Retirar el consentimiento en cualquier momento</strong> donde confiamos en el consentimiento 
              para procesar sus datos personales. Sin embargo, esto no afectará la legalidad de cualquier 
              procesamiento realizado antes de retirar su consentimiento. Si retira su consentimiento, es posible 
              que no podamos proporcionarle ciertos productos o servicios. Le asesoraremos si este es el caso en 
              el momento en que retire su consentimiento.
            </li>
          </ul>
          
          <p>
            Si desea ejercer cualquiera de los derechos establecidos anteriormente, contáctenos.
          </p>
          
          <p className="mt-4">
            <strong>Sin cuota generalmente requerida</strong>
          </p>
          <p>
            No tendrá que pagar una tarifa para acceder a sus datos personales (o para ejercer cualquiera de los 
            otros derechos). Sin embargo, podemos cobrar una tarifa razonable si su solicitud es claramente 
            infundada, repetitiva o excesiva. Alternativamente, podemos negarnos a cumplir con su solicitud en 
            estas circunstancias.
          </p>
          
          <p className="mt-4">
            <strong>Lo que podemos necesitar de usted</strong>
          </p>
          <p>
            Es posible que necesitemos solicitar información específica de usted para ayudarnos a confirmar su 
            identidad y garantizar su derecho a acceder a sus datos personales (o a ejercer cualquiera de sus 
            otros derechos). Esta es una medida de seguridad para garantizar que los datos personales no se 
            revelen a ninguna persona que no tenga derecho a recibirlos. También podemos contactarlo para 
            solicitar más información en relación con su solicitud para acelerar nuestra respuesta.
          </p>
          
          <p className="mt-4">
            <strong>Límite de tiempo para responder</strong>
          </p>
          <p>
            Intentamos responder a todas las solicitudes legítimas dentro de un mes. Ocasionalmente, puede tomarnos 
            más de un mes si su solicitud es particularmente compleja o si ha realizado varias solicitudes. En este 
            caso, le notificaremos y lo mantendremos actualizado.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">11. Glosario</h2>
          <p>
            <strong>BASE LEGAL</strong>
          </p>
          <p>
            <strong>Interés legítimo</strong> significa el interés de nuestro negocio en la conducción y gestión de 
            nuestro negocio para permitirnos brindarle el mejor servicio/producto y la mejor y más segura experiencia. 
            Nos aseguramos de considerar y equilibrar cualquier impacto potencial sobre usted (tanto positivo como 
            negativo) y sus derechos antes de procesar sus datos personales para nuestros intereses legítimos. No 
            utilizamos sus datos personales para actividades donde nuestros intereses se ven anulados por el impacto 
            en usted (a menos que tengamos su consentimiento o la ley lo exija o lo permita). Puede obtener más 
            información sobre cómo evaluamos nuestros intereses legítimos frente a cualquier impacto potencial en 
            usted con respecto a actividades específicas poniéndose en contacto con nosotros.
          </p>
          <p>
            <strong>Ejecución de contrato</strong> significa procesar sus datos donde es necesario para la ejecución 
            de un contrato en el que usted es parte o para tomar medidas a su solicitud antes de celebrar dicho contrato.
          </p>
          <p>
            <strong>Cumplir con una obligación legal o regulatoria</strong> significa procesar sus datos personales 
            donde es necesario para el cumplimiento de una obligación legal o regulatoria a la que estamos sujetos.
          </p>
          
          <p className="mt-4">
            <strong>TERCEROS</strong>
          </p>
          <p>
            <strong>Terceros internos</strong>
          </p>
          <p>
            Otras entidades que actúan como controladores conjuntos o procesadores y que brindan servicios de TI 
            y administración de sistemas y realizan informes de liderazgo.
          </p>
          
          <p className="mt-4">
            <strong>Terceros externos</strong>
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>
              Proveedores de servicios que actúan como procesadores que proporcionan servicios de TI y administración de sistemas.
            </li>
            <li>
              Asesores profesionales que actúan como procesadores o controladores conjuntos, incluidos abogados, 
              banqueros, auditores y aseguradoras que brindan servicios de consultoría, bancarios, legales, 
              de seguros y contables.
            </li>
            <li>
              Autoridades fiscales, autoridades reguladoras y otras autoridades que actúan como procesadores o 
              controladores conjuntos que requieren la presentación de informes de actividades de procesamiento en determinadas circunstancias.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}