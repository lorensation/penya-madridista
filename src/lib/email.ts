import nodemailer from "nodemailer"

// Create a transporter using environment variables
export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    secure: Boolean(process.env.EMAIL_SERVER_SECURE === "true"),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  })
}

// Send email helper function
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const transporter = createTransporter()
    
    const info = await transporter.sendMail({
      from: `Peña Lorenzo Sanz <${process.env.EMAIL_FROM || "noreply@lorenzosanz.com"}>`,
      to,
      subject,
      text,
      html,
    })
    
    console.log(`Email sent: ${info.messageId}`)
    return { success: true }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error }
  }
}

// Generate welcome email HTML template
export function generateWelcomeEmailTemplate(recipientName?: string) {
  const name = recipientName || "Madridista"
  
  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>¡Bienvenido a la Newsletter de la Peña Lorenzo Sanz!</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        font-family: 'Arial', sans-serif;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
      }
      .header {
        background-color: #07025A; /* Real Madrid blue */
        padding: 20px;
        text-align: center;
      }
      .logo {
        max-width: 200px;
        height: auto;
      }
      .content {
        padding: 30px;
        color: #333333;
        font-size: 16px;
        line-height: 1.5;
      }
      .footer {
        background-color: #f4f4f4;
        padding: 20px;
        text-align: center;
        color: #666666;
        font-size: 12px;
      }
      .social-icons img {
        width: 24px;
        height: 24px;
        margin: 0 5px;
      }
      .button {
        background-color: #07025A;
        color: #ffffff;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        display: inline-block;
        margin: 20px 0;
      }
      h1 {
        color: #07025A;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://www.lorenzosanz.com/Logo-Penya-LS-resized.jpg" alt="Peña Lorenzo Sanz" class="logo" />
      </div>
      
      <div class="content">
        <h1>¡Bienvenido a nuestra Newsletter!</h1>
        <p>Hola ${name},</p>
        <p>Gracias por suscribirte a la newsletter de la <strong>Peña Lorenzo Sanz Siempre Presente</strong>. A partir de ahora, recibirás información sobre:</p>
        
        <ul>
          <li>Eventos y actividades exclusivas de la peña</li>
          <li>Noticias sobre el Real Madrid</li>
          <li>Ofertas especiales para socios</li>
          <li>Información sobre el legado de Lorenzo Sanz</li>
        </ul>
        
        <p>Te mantendremos informado sobre todas las novedades relacionadas con nuestra peña y el Real Madrid.</p>
        
        <p style="text-align: center;">
          <a href="https://www.lorenzosanz.com" class="button">Visita nuestra web</a>
        </p>
        
        <p>¡Hala Madrid!</p>
        <p>El equipo de la Peña Lorenzo Sanz</p>
      </div>
      
      <div class="footer">
        <p>Peña Lorenzo Sanz Siempre Presente</p>
        <div class="social-icons">
          <a href="https://www.facebook.com"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" /></a>
          <a href="https://www.twitter.com"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" /></a>
          <a href="https://www.instagram.com"><img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" alt="Instagram" /></a>
        </div>
        <p>© ${new Date().getFullYear()} Peña Lorenzo Sanz. Todos los derechos reservados.</p>
        <p>
          <a href="https://www.lorenzosanz.com/unsubscribe" style="color: #999; text-decoration: underline;">Cancelar suscripción</a>
        </p>
      </div>
    </div>
  </body>
</html>
  `
}