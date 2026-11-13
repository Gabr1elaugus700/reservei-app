"use client";

import { useEffect, useRef } from "react";
import {
  formatCurrency,
  formatSchedule,
  formatShortSchedule,
  formatVisitors,
} from "@/lib/booking-display";
import type { PublicBookingSummary } from "@/lib/booking-check";
import type { BookingDraft } from "@/lib/public-booking-client";
import "./booking-flow.css";

type PendingAction = "update" | "create" | null;

export type DuplicateBookingSheetProps = {
  sameSlot: boolean;
  existing: PublicBookingSummary;
  draft: BookingDraft;
  pendingAction: PendingAction;
  onUpdate: () => void;
  onCreateAnother: () => void;
  onCancel: () => void;
};

export function DuplicateBookingSheet({
  sameSlot,
  existing,
  draft,
  pendingAction,
  onUpdate,
  onCreateAnother,
  onCancel,
}: DuplicateBookingSheetProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const busyRef = useRef(pendingAction !== null);
  const busy = pendingAction !== null;

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    primaryRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) onCancelRef.current();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const existingWhen = formatSchedule(existing.date, existing.time);
  const draftWhen = formatSchedule(draft.isoDate, draft.time);
  const existingVisitors = formatVisitors(existing.adults, existing.children);
  const draftVisitors = formatVisitors(draft.adults, draft.children);
  const visitorsChanged = existingVisitors !== draftVisitors;
  const priceChanged = existing.totalPrice !== draft.totalPrice;
  const existingPrice = formatCurrency(existing.totalPrice);
  const draftPrice = formatCurrency(draft.totalPrice);

  return (
    <div
      className="booking-sheet-overlay"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="booking-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-booking-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="booking-sheet-handle" aria-hidden="true" />
        <div className="booking-sheet-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4.5M12 16.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path
              d="M10.3 4.8L2.6 18a2 2 0 0 0 1.73 3h15.34A2 2 0 0 0 21.4 18L13.7 4.8a2 2 0 0 0-3.4 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 id="duplicate-booking-title" className="booking-sheet-title">
          {sameSlot
            ? "Você já tem um agendamento neste horário"
            : "Você já tem um agendamento"}
        </h2>
        <p className="booking-sheet-lead">
          {sameSlot
            ? "Parece que você está tentando recadastrar por cima. Deseja atualizar o agendamento existente?"
            : "Quer mover o agendamento existente para o novo horário, ou manter os dois?"}
        </p>

        <div className="booking-sheet-compare">
          <div className="booking-sheet-box is-old">
            <div className="k">Agendamento existente</div>
            <div className="v">{existingWhen}</div>
            <div className="meta">Mostramos só data e horário.</div>
          </div>
          <div className="booking-sheet-box is-new">
            {sameSlot ? (
              <>
                <div className="k">O que você está enviando agora</div>
                <div className="v">
                  {visitorsChanged ? (
                    <span className="booking-sheet-change">
                      <s>{existingVisitors}</s>
                      <span>{draftVisitors}</span>
                    </span>
                  ) : (
                    draftVisitors
                  )}
                </div>
                <div className="meta">
                  Valor:{" "}
                  {priceChanged ? (
                    <>
                      <s>{existingPrice}</s> → {draftPrice}
                    </>
                  ) : (
                    draftPrice
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="k">Novo horário escolhido</div>
                <div className="v">{draftWhen}</div>
              </>
            )}
          </div>
        </div>

        <div className="booking-sheet-actions">
          <button
            ref={primaryRef}
            type="button"
            className="booking-sheet-button booking-sheet-primary"
            onClick={onUpdate}
            disabled={busy}
          >
            {pendingAction === "update"
              ? "Salvando..."
              : sameSlot
                ? "Atualizar meu agendamento"
                : `Mover meu agendamento para ${formatShortSchedule(draft.isoDate, draft.time)}`}
          </button>
          <button
            type="button"
            className="booking-sheet-button booking-sheet-secondary"
            onClick={onCreateAnother}
            disabled={busy}
          >
            {pendingAction === "create" ? (
              "Salvando..."
            ) : sameSlot ? (
              "Fazer outro agendamento"
            ) : (
              <>
                <span>Fazer novo agendamento</span>
                <small>Manter os dois</small>
              </>
            )}
          </button>
          <button
            type="button"
            className="booking-sheet-button booking-sheet-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </button>
        </div>
        <p className="booking-sheet-privacy">
          Se este número não é seu, toque em Cancelar e confira o WhatsApp informado.
        </p>
      </div>
    </div>
  );
}
