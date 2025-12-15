import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos y Condiciones | Peña Lorenzo Sanz",
  description: "Términos y condiciones de uso de la Peña Madridista Lorenzo Sanz. Conozca nuestras normas de uso, suscripción y participación.",
}

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8">Términos y Condiciones</h1>
      
      <div className="prose max-w-none">
        <p className="text-sm text-gray-500 mb-6">Última actualización: 15 de diciembre de 2025</p>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
          <p>
            Estos términos y condiciones (junto con los documentos a los que se hace referencia en ellos) le informan sobre las reglas para usar nuestro sitio web 
            lorenzosanz.com (nuestro &quot;sitio&quot;) y para convertirse en socio de la Peña Madridista Lorenzo Sanz (&quot;la Peña&quot;, &quot;nosotros&quot;, &quot;nos&quot; o &quot;nuestro&quot;).
          </p>
          <p>
            Al usar nuestro sitio o convertirse en socio, confirma que acepta estos términos y condiciones y que acuerda cumplirlos. Si no está de acuerdo con estos términos, 
            debe abstenerse de usar nuestro sitio y de solicitar la membresía a la Peña.
          </p>
          <p>
            Le recomendamos que imprima una copia de estos términos para futuras referencias.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Información sobre nosotros</h2>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-4">
            <ul className="space-y-2">
              <li><strong>Denominación social:</strong> PEÑA MADRIDISTA LORENZO SANZ SIEMPRE PRESENTE</li>
              <li><strong>CIF:</strong> G22674352</li>
              <li><strong>Naturaleza jurídica:</strong> Asociación sin ánimo de lucro</li>
              <li><strong>Domicilio social:</strong> C/ Martín Pescador, Nº 9, 28023 Madrid</li>
              <li><strong>Correo electrónico:</strong> info@lorenzosanz.com</li>
            </ul>
          </div>
          <p>
            La Peña Madridista Lorenzo Sanz Siempre Presente es una asociación sin ánimo de lucro, legalmente constituida y registrada en España al amparo de la Ley Orgánica 1/2002, de 22 de marzo, reguladora del Derecho de Asociación. Está dedicada a unir a aficionados 
            del Real Madrid C.F. en memoria de Don Lorenzo Sanz, expresidente del club.
          </p>
          <p>
            Nuestro objetivo es fomentar el espíritu madridista, organizar eventos relacionados con el Real Madrid, facilitar la asistencia a partidos y 
            crear una comunidad de aficionados comprometidos con los valores del club.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Modificaciones a estos términos</h2>
          <p>
            Podemos revisar estos términos de uso en cualquier momento modificando esta página. Por favor, consulte esta página periódicamente para 
            verificar los cambios que hayamos realizado, ya que son vinculantes para usted.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Modificaciones a nuestro sitio</h2>
          <p>
            Podemos actualizar nuestro sitio periódicamente y cambiar el contenido en cualquier momento. Si es necesario, podemos suspender el acceso 
            a nuestro sitio o cerrarlo indefinidamente. Cualquier contenido en nuestro sitio puede estar desactualizado en un momento dado, y no estamos 
            obligados a actualizarlo.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Acceso a nuestro sitio</h2>
          <p>
            Nuestro sitio está disponible de forma gratuita. No garantizamos que nuestro sitio, o cualquier contenido en él, esté siempre disponible o sea ininterrumpido.
            El acceso a nuestro sitio es permitido de forma temporal. Podemos suspender, retirar, discontinuar o cambiar todo o cualquier parte de nuestro sitio sin previo aviso.
            No seremos responsables ante usted si por cualquier motivo nuestro sitio no está disponible en cualquier momento o por cualquier período.
          </p>
          <p>
            Usted es responsable de tomar todas las disposiciones necesarias para tener acceso a nuestro sitio. También es responsable de asegurarse de que todas 
            las personas que acceden a nuestro sitio a través de su conexión a internet conozcan estos términos de uso y otros términos y condiciones aplicables, y que los cumplan.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Su cuenta y contraseña</h2>
          <p>
            Si elige, o se le proporciona, un nombre de usuario, contraseña u otra información como parte de nuestros procedimientos de seguridad, debe tratar dicha información como confidencial. 
            No debe revelarla a ningún tercero.
          </p>
          <p>
            Tenemos el derecho de desactivar cualquier nombre de usuario o contraseña, ya sea elegido por usted o asignado por nosotros, en cualquier momento, si en nuestra opinión razonable 
            no ha cumplido con cualquiera de las disposiciones de estos términos de uso.
          </p>
          <p>
            Si sabe o sospecha que alguien más conoce su nombre de usuario o contraseña, debe notificarnos inmediatamente a <a href="mailto:info@lorenzosanz.com" className="text-primary hover:underline">info@lorenzosanz.com</a>
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Membresía y suscripciones</h2>
          <p>
            La Peña ofrece distintos tipos de membresía que pueden incluir cuotas anuales o mensuales. Al adquirir una membresía, usted acepta los siguientes términos:
          </p>
          
          <h3 className="text-xl font-medium mt-4 mb-2">7.1 Naturaleza del servicio</h3>
          <p>
            La membresía de la Peña constituye un servicio de contenido digital y acceso a beneficios exclusivos. Al contratar una membresía, usted adquiere:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Acceso a contenido exclusivo en el sitio web.</li>
            <li>Carnet digital de socio.</li>
            <li>Participación en eventos, sorteos y actividades de la peña.</li>
            <li>Descuentos y prioridad en viajes organizados.</li>
            <li>Boletín informativo y comunicaciones exclusivas.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-4 mb-2">7.2 Duración y renovación</h3>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Las membresías mensuales se renuevan automáticamente cada mes hasta que se cancelen.</li>
            <li>Las membresías anuales se renuevan automáticamente al final del período anual hasta que se cancelen.</li>
            <li>Debe cancelar su membresía al menos 7 días antes de la fecha de renovación para evitar cargos.</li>
            <li>La renovación se realizará al precio vigente en el momento de la renovación, que le será comunicado con al menos 30 días de antelación en caso de modificación.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-4 mb-2">7.3 Precios y pagos</h3>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Los precios de las membresías están claramente indicados en nuestro sitio en el momento de la compra, con todos los impuestos incluidos.</li>
            <li>Todos los pagos se procesan a través de <strong>Stripe Payments Europe, Ltd.</strong>, proveedor de servicios de pago autorizado y regulado por el Banco Central de Irlanda.</li>
            <li>Los datos de su tarjeta son tratados directamente por Stripe conforme a los estándares PCI-DSS. La Peña no almacena datos de tarjetas en sus servidores.</li>
            <li>Al realizar el pago, usted autoriza a Stripe a procesar el cargo y acepta los términos de servicio de Stripe.</li>
            <li>Nos reservamos el derecho de cambiar los precios de las membresías con un preaviso de al menos 30 días antes de la próxima renovación.</li>
            <li>Si no podemos cobrar su pago por cualquier motivo, su membresía puede ser suspendida o cancelada.</li>
            <li>Recibirá un recibo electrónico por cada pago realizado, enviado a su dirección de correo electrónico.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-4 mb-2">7.4 Derecho de desistimiento y reembolsos</h3>
          <p>
            Conforme al artículo 103.m) del Real Decreto Legislativo 1/2007, de 16 de noviembre, por el que se aprueba el texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios (TRLGDCU):
          </p>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 my-4">
            <p className="font-medium">
              El derecho de desistimiento no será aplicable a los contratos de suministro de contenido digital que no se preste en un soporte material cuando la ejecución haya comenzado con el previo consentimiento expreso del consumidor y usuario con el conocimiento por su parte de que en consecuencia pierde su derecho de desistimiento.
            </p>
          </div>
          <p>Al contratar su membresía y acceder al contenido digital exclusivo, usted:</p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Consiente expresamente que la ejecución del contrato comience de inmediato.</li>
            <li>Reconoce que, al comenzar la ejecución, pierde el derecho de desistimiento.</li>
            <li>Acepta que no procederán reembolsos por períodos parciales o no utilizados de membresía.</li>
          </ul>
          <p>
            No obstante lo anterior, podrá solicitar el reembolso en los siguientes casos excepcionales:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Error técnico demostrable que impida el acceso al servicio durante más de 7 días consecutivos, siempre que lo comunique a info@lorenzosanz.com.</li>
            <li>Doble cargo indebido (se reembolsará el importe duplicado).</li>
            <li>Incumplimiento grave por parte de la Peña de las prestaciones contratadas.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-4 mb-2">7.5 Cancelación</h3>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Puede cancelar su membresía en cualquier momento a través de su cuenta en nuestro sitio (Área de Socio &gt; Membresía &gt; Cancelar) o contactándonos en info@lorenzosanz.com.</li>
            <li>La cancelación será efectiva al final del período de facturación actual. Podrá seguir disfrutando de los beneficios hasta dicha fecha.</li>
            <li>Recibirá confirmación por correo electrónico de la cancelación.</li>
            <li>Nos reservamos el derecho de cancelar su membresía en cualquier momento si viola estos términos y condiciones, sin derecho a reembolso.</li>
          </ul>
          
          <h3 className="text-xl font-medium mt-4 mb-2">7.6 Beneficios de membresía</h3>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Los beneficios específicos de cada tipo de membresía se detallan en nuestro sitio.</li>
            <li>Nos reservamos el derecho de modificar los beneficios de las membresías con un preaviso razonable de al menos 30 días.</li>
            <li>Algunos beneficios pueden estar sujetos a disponibilidad y pueden tener términos adicionales específicos.</li>
            <li>La membresía de la Peña no implica membresía o afiliación oficial con el Real Madrid C.F.</li>
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Propiedad intelectual</h2>
          <p>
            Somos los propietarios o licenciatarios de todos los derechos de propiedad intelectual en nuestro sitio y en el material publicado en él. Esas obras están 
            protegidas por leyes y tratados de derechos de autor en todo el mundo. Todos los derechos están reservados.
          </p>
          <p>
            Puede imprimir una copia y descargar extractos de cualquier página de nuestro sitio para su referencia personal y puede llamar la atención de otros dentro de su 
            organización sobre el contenido publicado en nuestro sitio.
          </p>
          <p>
            No debe modificar las copias en papel o digitales de ningún material que haya impreso o descargado de ninguna manera, y no debe usar ninguna ilustración, fotografía, 
            secuencia de video o audio, o cualquier gráfico por separado del texto que lo acompaña.
          </p>
          <p>
            Nuestro estatus (y el de cualquier contribuyente identificado) como autores del contenido en nuestro sitio debe ser siempre reconocido.
          </p>
          <p>
            No debe usar ninguna parte del contenido de nuestro sitio para fines comerciales sin obtener una licencia para hacerlo de nosotros o de nuestros licenciantes.
          </p>
          <p>
            Si imprime, copia o descarga cualquier parte de nuestro sitio en violación de estos términos de uso, su derecho a usar nuestro sitio cesará inmediatamente y 
            deberá, a nuestra elección, devolver o destruir cualquier copia de los materiales que haya realizado.
          </p>
          <p>
            Real Madrid C.F., su escudo, logotipos y marcas comerciales relacionadas son propiedad exclusiva de Real Madrid C.F. y se utilizan con permiso o bajo licencia. 
            La Peña Lorenzo Sanz no es una entidad oficial de Real Madrid C.F.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Limitación de nuestra responsabilidad</h2>
          <p>
            Nada en estos términos de uso excluye o limita nuestra responsabilidad por muerte o lesiones personales derivadas de nuestra negligencia, o nuestro fraude o 
            tergiversación fraudulenta, o cualquier otra responsabilidad que no pueda ser excluida o limitada por la ley española.
          </p>
          <p>
            En la medida permitida por la ley, excluimos todas las condiciones, garantías, representaciones u otros términos que puedan aplicarse a nuestro sitio o cualquier 
            contenido en él, ya sea expreso o implícito.
          </p>
          <p>
            No seremos responsables ante ningún usuario por ninguna pérdida o daño, ya sea en contrato, agravio (incluyendo negligencia), incumplimiento de deber 
            legal o de otro tipo, incluso si es previsible, que surja bajo o en conexión con:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>El uso de, o incapacidad de usar, nuestro sitio; o</li>
            <li>El uso o confianza en cualquier contenido mostrado en nuestro sitio.</li>
          </ul>
          <p>
            Si usted es un usuario comercial, tenga en cuenta en particular que no seremos responsables por:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Pérdida de beneficios, ventas, negocios o ingresos;</li>
            <li>Interrupción del negocio;</li>
            <li>Pérdida de ahorros anticipados;</li>
            <li>Pérdida de oportunidades de negocio, buena voluntad o reputación; o</li>
            <li>Cualquier pérdida o daño indirecto o consecuente.</li>
          </ul>
          <p>
            Si usted es un usuario consumidor, tenga en cuenta que solo proporcionamos nuestro sitio para uso doméstico y privado. Usted acepta no utilizar nuestro sitio 
            para ningún propósito comercial o empresarial, y no tenemos ninguna responsabilidad ante usted por cualquier pérdida de beneficio, pérdida de negocio, 
            interrupción del negocio o pérdida de oportunidad de negocio.
          </p>
          <p>
            No seremos responsables de ninguna pérdida o daño causado por un virus, ataque de denegación de servicio distribuido u otro material tecnológicamente dañino 
            que pueda infectar su equipo informático, programas informáticos, datos u otro material patentado debido a su uso de nuestro sitio o a su descarga de cualquier 
            contenido en él, o en cualquier sitio web vinculado a él.
          </p>
          <p>
            No asumimos ninguna responsabilidad por el contenido de los sitios web vinculados en nuestro sitio. Tales enlaces no deben interpretarse como un respaldo 
            por nuestra parte a esos sitios web vinculados. No seremos responsables de ninguna pérdida o daño que pueda surgir de su uso de ellos.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Subida de contenido a nuestro sitio</h2>
          <p>
            Siempre que utilice una función que le permita subir contenido a nuestro sitio, o ponerse en contacto con otros usuarios de nuestro sitio, debe cumplir con los 
            estándares de contenido establecidos a continuación.
          </p>
          <p>
            Garantiza que tal contribución cumple con esos estándares, y será responsable ante nosotros y nos indemnizará por cualquier incumplimiento de esa garantía.
          </p>
          <p>
            Cualquier contenido que suba a nuestro sitio se considerará no confidencial y no patentado. Usted conserva todos sus derechos de propiedad sobre su contenido, 
            pero nos otorga una licencia limitada para usar, almacenar y copiar ese contenido y para distribuirlo y ponerlo a disposición de terceros.
          </p>
          <p>
            También tenemos el derecho de divulgar su identidad a cualquier tercero que reclame que cualquier contenido publicado o subido por usted a nuestro sitio 
            constituye una violación de sus derechos de propiedad intelectual, o de su derecho a la privacidad.
          </p>
          <p>
            No seremos responsables, ni asumiremos responsabilidad ante ningún tercero, por el contenido o la exactitud de cualquier contenido publicado por usted o 
            cualquier otro usuario de nuestro sitio.
          </p>
          <p>
            Tenemos el derecho de eliminar cualquier publicación que realice en nuestro sitio si, en nuestra opinión, su publicación no cumple con los estándares de contenido.
          </p>
          <p>
            Las opiniones expresadas por otros usuarios en nuestro sitio no representan nuestras opiniones o valores.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Estándares de contenido</h2>
          <p>
            Estos estándares de contenido se aplican a cualquier y todo el material que contribuya a nuestro sitio (contribuciones), y a cualquier espacio interactivo asociado.
          </p>
          <p>
            Las contribuciones deben:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Ser precisas (cuando establecen hechos).</li>
            <li>Ser genuinamente sostenidas (cuando establecen opiniones).</li>
            <li>Cumplir con la ley aplicable en España y en cualquier país desde el que se realicen.</li>
          </ul>
          <p>
            Las contribuciones no deben:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Contener cualquier material que sea difamatorio de cualquier persona.</li>
            <li>Contener cualquier material que sea obsceno, ofensivo, odioso o inflamatorio.</li>
            <li>Promover material sexualmente explícito.</li>
            <li>Promover violencia.</li>
            <li>Promover discriminación basada en raza, sexo, religión, nacionalidad, discapacidad, orientación sexual o edad.</li>
            <li>Infringir cualquier derecho de autor, derecho de base de datos o marca comercial de cualquier otra persona.</li>
            <li>Ser probable que engañe a cualquier persona.</li>
            <li>Estar hecho en incumplimiento de cualquier obligación legal debida a un tercero, como una obligación contractual o un deber de confianza.</li>
            <li>Promover cualquier actividad ilegal.</li>
            <li>Estar amenazando, abusar o invadir la privacidad de otra persona.</li>
            <li>Ser probable que acose, moleste, avergüence, alarme o moleste a cualquier otra persona.</li>
            <li>Ser utilizado para suplantar a cualquier persona, o para tergiversar su identidad o afiliación con cualquier persona.</li>
            <li>Dar la impresión de que emanan de nosotros, si ese no es el caso.</li>
            <li>Defender, promover o asistir cualquier acto ilegal como (solo a modo de ejemplo) infracción de copyright o uso indebido de computadoras.</li>
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Suspensión y terminación</h2>
          <p>
            Determinaremos, a nuestra discreción, si ha habido una violación de estos términos de uso a través de su uso de nuestro sitio. Cuando ocurra una violación 
            de estos términos de uso, podemos tomar las acciones que consideremos apropiadas.
          </p>
          <p>
            El incumplimiento de estos términos de uso constituye un incumplimiento material de los términos de uso sobre los cuales se le permite utilizar nuestro sitio, 
            y puede resultar en nuestra toma de todas o cualquiera de las siguientes acciones:
          </p>
          <ul className="list-disc pl-6 my-4 space-y-2">
            <li>Retiro inmediato, temporal o permanente de su derecho a utilizar nuestro sitio.</li>
            <li>Eliminación inmediata, temporal o permanente de cualquier publicación o material subido por usted a nuestro sitio.</li>
            <li>Emisión de una advertencia para usted.</li>
            <li>Procedimientos legales contra usted para el reembolso de todos los costos sobre la base de una indemnización (incluidos, entre otros, costos administrativos y legales razonables) resultantes del incumplimiento.</li>
            <li>Acciones legales adicionales contra usted.</li>
            <li>Divulgación de tal información a las autoridades encargadas de hacer cumplir la ley según consideremos razonablemente necesario.</li>
          </ul>
          <p>
            Excluimos la responsabilidad por las acciones tomadas en respuesta a violaciones de estos términos de uso. Las respuestas descritas en estos términos de uso 
            no se limitan, y podemos tomar cualquier otra acción que consideremos razonablemente apropiada.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Ley aplicable y jurisdicción</h2>
          <p>
            Estos términos de uso, su tema y su formación, se rigen por la legislación española.
          </p>
          <p className="mt-4">
            Para la resolución de cualquier controversia derivada de estos términos, las partes se someten a los Juzgados y Tribunales del domicilio del usuario, siempre que este tenga la condición de consumidor conforme al Real Decreto Legislativo 1/2007. En caso contrario, las partes se someten a los Juzgados y Tribunales de Madrid capital, con renuncia expresa a cualquier otro fuero que pudiera corresponderles.
          </p>
          <p className="mt-4">
            Asimismo, le informamos de la existencia de la plataforma de resolución de litigios en línea de la Unión Europea, accesible en: <a href="https://ec.europa.eu/consumers/odr" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Marcas comerciales</h2>
          <p>
            &quot;Real Madrid&quot; y el escudo del Real Madrid son marcas registradas del Real Madrid Club de Fútbol. La Peña Lorenzo Sanz no está afiliada oficialmente con el 
            Real Madrid C.F. a menos que se indique explícitamente lo contrario.
          </p>
          <p>
            El nombre &quot;Peña Lorenzo Sanz Siempre Presente&quot; y nuestro logotipo son marcas comerciales de nuestra peña.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">15. Contacto</h2>
          <p>
            Para contactar con nosotros, por favor envíe un correo electrónico a <a href="mailto:info@lorenzosanz.com" className="text-primary hover:underline">info@lorenzosanz.com</a>.
          </p>
          <p>
            Gracias por visitar nuestro sitio.
          </p>
        </div>
      </div>
    </div>
  )
}