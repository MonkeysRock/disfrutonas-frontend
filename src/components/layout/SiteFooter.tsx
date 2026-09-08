import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[#eaeaea] bg-white">
      <div className="mx-auto max-w-[1180px] px-4 py-10 md:px-5">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-xl font-extrabold text-[#111]">
              Disfrutonas
            </div>

            <p className="mt-3 max-w-[420px] text-sm leading-6 text-[#666]">
              Descubre conciertos, festivales, eventos y planes en España.
              Encuentra qué hacer, dónde y cuándo.
            </p>
          </div>

          <div>
            <div className="mb-3 text-sm font-bold uppercase tracking-wide text-[#777]">
              Información
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <Link
                href="/aviso-legal"
                className="text-[#444] no-underline hover:text-[#111]"
              >
                Aviso legal
              </Link>

              <Link
                href="/privacidad"
                className="text-[#444] no-underline hover:text-[#111]"
              >
                Política de privacidad
              </Link>

              <Link
                href="/cookies"
                className="text-[#444] no-underline hover:text-[#111]"
              >
                Política de cookies
              </Link>
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-bold uppercase tracking-wide text-[#777]">
              Disfrutonas
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <Link
                href="/contacto"
                className="text-[#444] no-underline hover:text-[#111]"
              >
                Contacto
              </Link>

              <Link
                href="/eventos"
                className="text-[#444] no-underline hover:text-[#111]"
              >
                Explorar eventos
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[#eee] pt-6 text-sm text-[#777]">
          © {year} Disfrutonas. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}