import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    const { error } = await resend.emails.send({
      from: "Disfrutonas <onboarding@resend.dev>",
      to: "seoingibraltar@gmail.com",
      replyTo: email,
      subject: `Disfrutonas: ${subject}`,
      text: `
Nombre: ${name}
Email: ${email}

Mensaje:
${message}
      `,
    });

    if (error) {
      console.error("Resend error:", error);

      return NextResponse.json(
        { error: "No se pudo enviar el mensaje." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Contact form error:", error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}