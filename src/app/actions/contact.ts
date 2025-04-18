"use server"

import { sendEmail } from "@/lib/email"

type ContactFormData = {
  name: string
  email: string
  subject: string
  message: string
}

export async function submitContactForm(data: ContactFormData) {
  try {
    // Validate form data
    if (!data.name || !data.email || !data.message) {
      return {
        success: false,
        error: "Por favor, rellene todos los campos requeridos."
      }
    }

    // Create HTML content for notification email (to ourselves)
    const notificationHtml = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Nuevo mensaje de contacto</title>
    <style>
      body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; }
      .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background-color: #07025A; padding: 20px; text-align: center; color: white; }
      .content { padding: 30px; color: #333333; font-size: 16px; line-height: 1.5; }
      .field { margin-bottom: 15px; }
      .field-name { font-weight: bold; color: #07025A; }
      .field-value { margin-top: 5px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #07025A; }
      .footer { background-color: #f4f4f4; padding: 20px; text-align: center; color: #666666; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Nuevo mensaje de contacto - Peña Lorenzo Sanz</h2>
      </div>
      <div class="content">
        <p>Se ha recibido un nuevo mensaje de contacto a través del formulario de la web:</p>
        
        <div class="field">
          <div class="field-name">Nombre:</div>
          <div class="field-value">${data.name}</div>
        </div>
        
        <div class="field">
          <div class="field-name">Email:</div>
          <div class="field-value">${data.email}</div>
        </div>
        
        <div class="field">
          <div class="field-name">Asunto:</div>
          <div class="field-value">${data.subject || "No especificado"}</div>
        </div>
        
        <div class="field">
          <div class="field-name">Mensaje:</div>
          <div class="field-value">${data.message.replace(/\n/g, '<br/>')}</div>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Peña Lorenzo Sanz. Todos los derechos reservados.</p>
      </div>
    </div>
  </body>
</html>
    `

    // Create HTML content for confirmation email (to user)
    const confirmationHtml = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Hemos recibido tu mensaje</title>
    <style>
      body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; }
      .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background-color: #07025A; padding: 20px; text-align: center; }
      .logo { max-width: 200px; height: auto; }
      .content { padding: 30px; color: #333333; font-size: 16px; line-height: 1.5; }
      .footer { background-color: #f4f4f4; padding: 20px; text-align: center; color: #666666; font-size: 12px; }
      .button { background-color: #07025A; color: #ffffff; padding: 12px 24px; text-decoration: none; 
                border-radius: 4px; font-weight: bold; display: inline-block; margin: 20px 0; }
      h1 { color: #07025A; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://www.lorenzosanz.com/Logo-Penya-LS-resized.jpg" alt="Peña Lorenzo Sanz" class="logo" />
      </div>
      <div class="content">
        <h1>Hemos recibido tu mensaje</h1>
        <p>Hola ${data.name},</p>
        <p>Gracias por ponerte en contacto con la <strong>Peña Lorenzo Sanz Siempre Presente</strong>.</p>
        <p>Hemos recibido tu mensaje con el asunto "${data.subject || 'No especificado'}" y te responderemos lo antes posible.</p>
        <p>Si tienes alguna pregunta adicional, no dudes en contactarnos respondiendo a este correo.</p>
        <p style="text-align: center;">
          <a href="https://www.lorenzosanz.com" class="button">Visita nuestra web</a>
        </p>
        <p>¡Hala Madrid!</p>
        <p>El equipo de la Peña Lorenzo Sanz</p>
      </div>
      <div class="footer">
        <p>Peña Lorenzo Sanz Siempre Presente</p>
        <p>© ${new Date().getFullYear()} Peña Lorenzo Sanz. Todos los derechos reservados.</p>
      </div>
    </div>
  </body>
</html>
    `

    // Send notification email to ourselves
    const notificationResult = await sendEmail({
      to: process.env.CONTACT_EMAIL || "info@lorenzosanz.com",
      subject: `Nuevo mensaje de contacto: ${data.subject || "No especificado"}`,
      html: notificationHtml
    })

    if (!notificationResult.success) {
      console.error("Error sending notification email:", notificationResult.error)
      return { 
        success: false, 
        error: "Hubo un problema al enviar el mensaje. Por favor, inténtalo de nuevo."
      }
    }

    // Send confirmation email to user
    const confirmationResult = await sendEmail({
      to: data.email,
      subject: "Hemos recibido tu mensaje - Peña Lorenzo Sanz",
      html: confirmationHtml
    })

    if (!confirmationResult.success) {
      console.error("Error sending confirmation email:", confirmationResult.error)
      // We don't return an error here because the main notification was sent
    }

    return { success: true }
  } catch (error) {
    console.error("Error in contact form submission:", error)
    return {
      success: false,
      error: "Hubo un problema al procesar tu solicitud. Por favor, inténtalo de nuevo."
    }
  }
}