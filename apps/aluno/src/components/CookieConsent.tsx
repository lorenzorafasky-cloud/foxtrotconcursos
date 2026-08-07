"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, Settings2, X } from "lucide-react";

const CONSENT_KEY = "foxtrot.cookie-consent.v2026-08-07";

type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  acceptedAt: string;
};

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setVisible(!window.localStorage.getItem(CONSENT_KEY));
  }, []);

  function save(next: Omit<ConsentState, "necessary" | "acceptedAt">) {
    const payload: ConsentState = {
      necessary: true,
      analytics: next.analytics,
      marketing: next.marketing,
      acceptedAt: new Date().toISOString()
    };
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-4 py-4 shadow-2xl backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Cookie className="h-4 w-4 text-foxtrot-400" />
            Preferencias de cookies
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
            Usamos cookies necessarios para login e seguranca. Cookies de metricas e marketing so devem ser ativados com seu consentimento.
            Consulte a <Link className="font-semibold text-foxtrot-300 hover:text-foxtrot-200" href="/cookies">politica de cookies</Link>.
          </p>
          {customizing ? (
            <div className="mt-3 grid gap-2 text-sm text-zinc-200 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2">
                <input checked readOnly type="checkbox" />
                Necessarios
              </label>
              <label className="flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2">
                <input checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} type="checkbox" />
                Metricas
              </label>
              <label className="flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2">
                <input checked={marketing} onChange={(event) => setMarketing(event.target.checked)} type="checkbox" />
                Marketing
              </label>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" onClick={() => setCustomizing((value) => !value)} type="button">
            <Settings2 className="h-4 w-4" />
            Gerenciar
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" onClick={() => save({ analytics: false, marketing: false })} type="button">
            <X className="h-4 w-4" />
            Rejeitar
          </button>
          <button className="inline-flex h-10 items-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" onClick={() => save({ analytics: true, marketing: true })} type="button">
            Aceitar
          </button>
          {customizing ? (
            <button className="inline-flex h-10 items-center rounded-md bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 hover:bg-white" onClick={() => save({ analytics, marketing })} type="button">
              Salvar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
