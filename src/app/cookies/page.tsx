export const metadata = {
  title: "Política de cookies",
  description: "Política de cookies de Disfrutonas.",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-12">
      <h1 className="text-3xl font-bold text-[#111]">
        Política de cookies
      </h1>

      <div className="mt-8 space-y-7 text-[15px] leading-7 text-[#555]">
        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            ¿Qué son las cookies?
          </h2>
          <p>
            Las cookies son pequeños archivos que se almacenan en el dispositivo
            del usuario cuando visita una página web. Sirven para recordar
            información sobre la navegación y permitir determinadas funciones
            del sitio.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Cookies utilizadas en Disfrutonas
          </h2>
          <p>
            Disfrutonas puede utilizar cookies técnicas necesarias para el
            funcionamiento del sitio y, cuando el usuario lo autorice, cookies
            analíticas para conocer cómo se utiliza la plataforma y mejorar su
            funcionamiento.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Google Analytics
          </h2>
          <p>
            Disfrutonas utiliza Google Analytics, un servicio de análisis web
            proporcionado por Google, para obtener estadísticas agregadas sobre
            el uso del sitio, como páginas visitadas, duración de las sesiones,
            dispositivo o procedencia aproximada del tráfico.
          </p>
          <p className="mt-3">
            Estas cookies analíticas solo deben activarse cuando el usuario haya
            otorgado su consentimiento.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Consentimiento
          </h2>
          <p>
            Al acceder por primera vez a Disfrutonas, el usuario puede aceptar o
            rechazar el uso de cookies no necesarias. La elección puede
            conservarse para evitar solicitar el consentimiento en cada visita.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Cómo modificar o eliminar cookies
          </h2>
          <p>
            El usuario puede eliminar o bloquear las cookies desde la
            configuración de su navegador. También podrá modificar sus
            preferencias de cookies en Disfrutonas cuando esté disponible el
            correspondiente panel de configuración.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-[#222]">
            Actualizaciones de esta política
          </h2>
          <p>
            Esta política puede actualizarse cuando cambien los servicios
            utilizados por Disfrutonas o la normativa aplicable.
          </p>
        </section>
      </div>
    </main>
  );
}