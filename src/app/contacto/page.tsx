import ContactForm from "@/components/contact/ContactForm";
export const metadata = {
  title: "Contacto",
  description: "Contacta con Disfrutonas.",
};

export default function ContactoPage() {
  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-12">
      <h1 className="text-3xl font-bold text-[#111]">Contacto</h1>

      <div className="mt-8 space-y-8 text-[15px] leading-7 text-[#555]">
        <div className="space-y-4">
          <p>
            ¿Tienes alguna pregunta, has detectado información incorrecta sobre
            un evento o quieres ponerte en contacto con Disfrutonas?
          </p>

          <p>
            También puedes escribirnos para cuestiones relacionadas con
            colaboraciones, organizadores de eventos, privacidad o cualquier
            otra consulta relacionada con la plataforma.
          </p>
        </div>

        <div className="rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-bold text-[#222]">
            Envíanos un mensaje
          </h2>

          <p className="mt-2 text-sm text-[#777]">
            Completa el formulario y te responderemos lo antes posible.
          </p>

          <ContactForm />
        </div>

        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-6">
          <div className="font-bold text-[#222]">
            También puedes escribirnos directamente
          </div>

          <a
            href="mailto:seoingibraltar@gmail.com"
            className="mt-2 inline-block font-medium text-[#111] underline underline-offset-4"
          >
            seoingibraltar@gmail.com
          </a>
        </div>

        <p className="text-sm text-[#777]">
          Intentaremos responder a las consultas lo antes posible.
        </p>
      </div>
    </main>
  );
}