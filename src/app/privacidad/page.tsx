export const metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad de Disfrutonas.",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-12">
      <h1 className="text-3xl font-bold text-[#111]">
        Política de privacidad
      </h1>

      <div className="mt-8 space-y-7 text-[15px] leading-7 text-[#555]">
        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Responsable del tratamiento
          </h2>
          <p>
            Disfrutonas es responsable del tratamiento de los datos personales
            facilitados por los usuarios a través de este sitio web.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Datos que podemos recopilar
          </h2>
          <p>
            Podemos recopilar datos facilitados voluntariamente por el usuario,
            como nombre, dirección de correo electrónico y el contenido de los
            mensajes enviados mediante nuestros canales de contacto.
          </p>
          <p className="mt-3">
            También podemos obtener datos técnicos y estadísticos derivados del
            uso del sitio web, como páginas visitadas, dispositivo, navegador,
            dirección IP aproximada y datos de navegación, siempre conforme a
            la normativa aplicable.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Finalidad del tratamiento
          </h2>
          <p>
            Los datos podrán utilizarse para responder consultas, gestionar
            comunicaciones, mejorar el funcionamiento de Disfrutonas, obtener
            estadísticas de uso y garantizar la seguridad del sitio web.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Base jurídica
          </h2>
          <p>
            El tratamiento de los datos se realizará sobre la base del
            consentimiento del usuario, la ejecución de medidas solicitadas por
            el propio usuario y, cuando corresponda, el interés legítimo en
            mantener y mejorar el funcionamiento y la seguridad del sitio web.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Conservación de los datos
          </h2>
          <p>
            Los datos personales se conservarán únicamente durante el tiempo
            necesario para cumplir la finalidad para la que fueron recogidos y,
            posteriormente, durante los plazos exigidos por la normativa
            aplicable.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Servicios de terceros
          </h2>
          <p>
            Disfrutonas puede utilizar servicios de terceros para alojamiento,
            analítica, infraestructura y otras funciones necesarias para el
            funcionamiento de la plataforma.
          </p>
          <p className="mt-3">
            En particular, el sitio puede utilizar Google Analytics para
            obtener estadísticas sobre el uso de la web cuando el usuario haya
            otorgado el consentimiento necesario.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Derechos de los usuarios
          </h2>
          <p>
            Los usuarios pueden ejercer, cuando proceda, sus derechos de acceso,
            rectificación, supresión, oposición, limitación y portabilidad de
            sus datos, así como retirar el consentimiento otorgado.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Contacto
          </h2>
          <p>
            Para cualquier cuestión relacionada con privacidad o protección de
            datos puedes contactar con nosotros a través de la página de
            contacto.
          </p>
        </section>
      </div>
    </main>
  );
}