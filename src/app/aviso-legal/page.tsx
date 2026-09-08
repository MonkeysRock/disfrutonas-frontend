export const metadata = {
  title: "Aviso legal",
  description: "Aviso legal de Disfrutonas.",
};

export default function AvisoLegalPage() {
  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-12">
      <h1 className="text-3xl font-bold text-[#111]">Aviso legal</h1>

      <div className="mt-8 space-y-7 text-[15px] leading-7 text-[#555]">
        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Información general
          </h2>
          <p>
            Disfrutonas es una plataforma online destinada a facilitar el
            descubrimiento de eventos, conciertos, festivales y otros planes
            de ocio.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Contenido de terceros
          </h2>
          <p>
            Parte de la información publicada en Disfrutonas procede de
            fuentes externas y organizadores de eventos. Aunque tratamos de
            mantener la información actualizada, los horarios, fechas,
            precios, ubicaciones y disponibilidad pueden cambiar.
          </p>
          <p className="mt-3">
            Recomendamos comprobar siempre la información definitiva en la
            página del organizador o proveedor antes de realizar una compra o
            desplazamiento.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Enlaces y afiliación
          </h2>
          <p>
            Disfrutonas puede incluir enlaces a páginas de terceros. Algunos
            de estos enlaces pueden ser enlaces de afiliación, lo que significa
            que Disfrutonas podría recibir una comisión si el usuario realiza
            una compra a través de ellos, sin que ello suponga un coste
            adicional para el usuario.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Propiedad intelectual
          </h2>
          <p>
            Los contenidos propios, diseño, estructura, textos y elementos
            originales de Disfrutonas están protegidos por la normativa
            aplicable sobre propiedad intelectual e industrial.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Responsabilidad
          </h2>
          <p>
            Disfrutonas no organiza los eventos publicados salvo que se indique
            expresamente lo contrario y no se responsabiliza de cancelaciones,
            modificaciones, cambios de precio o cualquier otra circunstancia
            relacionada con eventos o servicios ofrecidos por terceros.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Contacto
          </h2>
          <p>
            Para cualquier consulta relacionada con este sitio web puedes
            contactar con nosotros a través de la página de contacto.
          </p>
        </section>
      </div>
    </main>
  );
}