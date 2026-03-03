"use client";

import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mailto = `mailto:contact@imobintel.ro?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(`Nume: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-[800px] px-5 py-16 md:py-24">
      <div className="text-center mb-12">
        <h1 className="text-[32px] md:text-[44px] font-bold tracking-tight text-gray-950">
          Contacteaza-ne
        </h1>
        <p className="mt-3 text-[16px] text-gray-500 max-w-[480px] mx-auto">
          Ai intrebari despre platforma sau vrei un plan Enterprise personalizat? Suntem aici sa ajutam.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
        {/* Info */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 mb-1">Email</h3>
            <a href="mailto:contact@imobintel.ro" className="text-[14px] text-blue-600 hover:underline">
              contact@imobintel.ro
            </a>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 mb-1">Timp de raspuns</h3>
            <p className="text-[14px] text-gray-500">De obicei in mai putin de 24 de ore in zilele lucratoare.</p>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 mb-1">Enterprise</h3>
            <p className="text-[14px] text-gray-500">
              Planuri personalizate pentru agentii imobiliare si investitori. Cautari nelimitate, suport dedicat, integrari API.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-[13px] font-medium text-gray-700 mb-1">OnlyTips SRL</p>
            <p className="text-[12px] text-gray-500">CUI: 43414871</p>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-3">
          {sent ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold text-gray-900">Mesaj pregatit</h3>
              <p className="mt-1 text-[13px] text-gray-500">Se deschide clientul de email. Daca nu s-a deschis, trimite direct la contact@imobintel.ro</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Nume</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder="Ion Popescu"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder="ion@email.ro"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Subiect</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Plan Enterprise / Intrebare / Feedback"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Mesaj</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  placeholder="Descrie cum te putem ajuta..."
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-gray-900 px-6 py-3 text-[14px] font-semibold text-white hover:bg-gray-800 active:scale-[0.97] transition-all"
              >
                Trimite mesajul
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
