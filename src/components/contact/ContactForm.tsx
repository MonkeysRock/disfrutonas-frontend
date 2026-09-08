"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("No se pudo enviar el mensaje");
      }

      form.reset();
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-semibold text-[#333]"
        >
          Nombre
        </label>

        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Tu nombre"
          className="w-full rounded-xl border border-[#dcdcdc] bg-white px-4 py-3 text-[#222] outline-none transition focus:border-[#999]"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-[#333]"
        >
          Correo electrónico
        </label>

        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="tu@email.com"
          className="w-full rounded-xl border border-[#dcdcdc] bg-white px-4 py-3 text-[#222] outline-none transition focus:border-[#999]"
        />
      </div>

      <div>
        <label
          htmlFor="subject"
          className="mb-2 block text-sm font-semibold text-[#333]"
        >
          Asunto
        </label>

        <input
          id="subject"
          name="subject"
          type="text"
          required
          placeholder="¿Sobre qué quieres escribirnos?"
          className="w-full rounded-xl border border-[#dcdcdc] bg-white px-4 py-3 text-[#222] outline-none transition focus:border-[#999]"
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-2 block text-sm font-semibold text-[#333]"
        >
          Mensaje
        </label>

        <textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder="Escribe aquí tu mensaje..."
          className="w-full resize-y rounded-xl border border-[#dcdcdc] bg-white px-4 py-3 text-[#222] outline-none transition focus:border-[#999]"
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-xl bg-[#111] px-6 py-3 font-semibold text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "Enviando..." : "Enviar mensaje"}
      </button>

      {status === "success" && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Mensaje enviado correctamente. Te responderemos lo antes posible.
        </p>
      )}

      {status === "error" && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo enviar el mensaje. Inténtalo de nuevo o escríbenos
          directamente por correo.
        </p>
      )}
    </form>
  );
}