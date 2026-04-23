/**
 * Predefined acquisition/onboarding campaign template.
 * Used from the admin email campaigns page to create a ready-to-send draft.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lorenzosanz.com"

export interface AcquisitionCampaignTemplate {
  subject: string
  previewText: string
  htmlBody: string
  textBody: string
  segment: "newsletter_only"
}

export function getAcquisitionCampaignTemplate(): AcquisitionCampaignTemplate {
  return {
    subject: "Únete a la Peña Lorenzo Sanz y vive nuestros eventos",
    previewText: "Regístrate en la web y descubre eventos, ventajas y actividad madridista.",
    segment: "newsletter_only",
    htmlBody: `
      <h1>Forma parte de la Peña Lorenzo Sanz Siempre Presente</h1>
      <p>Hola,</p>
      <p>
        Queremos invitarte a dar el siguiente paso y registrarte en la web de la
        <strong>Peña Lorenzo Sanz Siempre Presente</strong> para estar más cerca de nuestra comunidad.
      </p>
      <p>
        Al registrarte podrás conocer mejor la actividad de la peña, seguir nuestras novedades y acceder con más facilidad
        a información sobre eventos, encuentros y acciones especiales relacionadas con el madridismo y el legado de Lorenzo Sanz.
      </p>
      <div style="background-color:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;">
        <h2 style="margin-top:0;">¿Qué encontrarás en nuestra web?</h2>
        <ul style="padding-left:20px;margin-bottom:0;">
          <li>Información sobre próximos eventos y actividades de la peña</li>
          <li>Noticias y contenidos relacionados con nuestra comunidad</li>
          <li>Acceso al registro y a futuras ventajas para socios y simpatizantes</li>
        </ul>
      </div>
      <p style="text-align:center;">
        <a href="${BASE_URL}/register" class="button">Registrarme en la web</a>
      </p>
      <p>
        Si todavía no conoces todo lo que hacemos, también puedes visitar nuestra web y descubrir la historia, los valores
        y la actividad de la peña.
      </p>
      <p style="text-align:center;">
        <a href="${BASE_URL}" style="color:#07025A;font-weight:bold;text-decoration:underline;">Visitar la web de la peña</a>
      </p>
      <p>
        Recibes este correo porque aceptaste recibir comunicaciones e información de la Peña Lorenzo Sanz Siempre Presente.
      </p>
      <p>¡Hala Madrid!</p>
      <p>El equipo de la Peña Lorenzo Sanz</p>
    `,
    textBody: `Forma parte de la Peña Lorenzo Sanz Siempre Presente.

Regístrate en nuestra web para conocer mejor la actividad de la peña, consultar información sobre eventos y estar al día de nuestras novedades.

Registro: ${BASE_URL}/register
Web: ${BASE_URL}

Recibes este correo porque aceptaste recibir comunicaciones e información de la Peña Lorenzo Sanz Siempre Presente.

¡Hala Madrid!
El equipo de la Peña Lorenzo Sanz`,
  }
}
