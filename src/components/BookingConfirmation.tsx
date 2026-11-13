"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  formatCurrency,
  formatLongDate,
  formatSchedule,
  formatVisitors,
} from "@/lib/booking-display";
import { formatPhone } from "@/lib/phone";
import "./booking-flow.css";

const MOBILE_CONFIRMATION_QUERY = "(max-width: 767px)";

export function isMobileConfirmationViewport(): boolean {
  return window.matchMedia(MOBILE_CONFIRMATION_QUERY).matches;
}

export type BookingConfirmationProps = {
  mode?: "created" | "updated";
  responsibleName: string;
  whatsapp: string;
  isoDate: string;
  time: string;
  adults: number;
  childCount: number;
  totalPrice: number;
  previous?: {
    isoDate: string;
    time: string;
    adults: number;
    childCount: number;
    totalPrice: number;
  };
  onClose: () => void;
};

function ChangedValue({
  previous,
  next,
  changed,
}: {
  previous: string;
  next: string;
  changed: boolean;
}) {
  if (!changed) return <>{next}</>;

  return (
    <span className="booking-confirm-stack">
      <s>{previous}</s>
      <span>{next}</span>
    </span>
  );
}

function UpdatedSummary({
  isoDate,
  time,
  adults,
  childCount,
  totalPrice,
  previous,
}: {
  isoDate: string;
  time: string;
  adults: number;
  childCount: number;
  totalPrice: number;
  previous: {
    isoDate: string;
    time: string;
    adults: number;
    childCount: number;
    totalPrice: number;
  };
}) {
  const scheduleChanged = previous.isoDate !== isoDate || previous.time !== time;
  const visitorsChanged = previous.adults !== adults || previous.childCount !== childCount;
  const priceChanged = previous.totalPrice !== totalPrice;

  return (
    <div className="booking-confirm-summary">
      <div className={`booking-confirm-row${scheduleChanged ? " is-changed" : ""}`}>
        <span className="k">Data e horário</span>
        <span className="v">
          <ChangedValue
            changed={scheduleChanged}
            previous={formatSchedule(previous.isoDate, previous.time)}
            next={formatSchedule(isoDate, time)}
          />
        </span>
      </div>
      <div className={`booking-confirm-row${visitorsChanged ? " is-changed" : ""}`}>
        <span className="k">Visitantes</span>
        <span className="v">
          <ChangedValue
            changed={visitorsChanged}
            previous={formatVisitors(previous.adults, previous.childCount)}
            next={formatVisitors(adults, childCount)}
          />
        </span>
      </div>
      <div className={`booking-confirm-row is-total${priceChanged ? " is-changed" : ""}`}>
        <span className="k">Valor total</span>
        <span className="v">
          <ChangedValue
            changed={priceChanged}
            previous={formatCurrency(previous.totalPrice)}
            next={formatCurrency(totalPrice)}
          />
        </span>
      </div>
    </div>
  );
}

export function BookingConfirmation({
  mode = "created",
  responsibleName,
  whatsapp,
  isoDate,
  time,
  adults,
  childCount,
  totalPrice,
  previous,
  onClose,
}: BookingConfirmationProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div
      className="booking-confirm is-playing"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-confirmation-title"
      aria-describedby="booking-confirmation-description"
    >
      <div className="booking-confirm-inner">
        <div className="booking-confirm-logo">
          <div className="booking-confirm-logo-frame">
            <Image
              src="/images/logo2.png"
              alt="Recanto Da Uva Fina"
              fill
              priority
              sizes="448px"
              className="booking-confirm-logo-image"
            />
          </div>
        </div>

        <div className="booking-confirm-center">
          <div className="booking-confirm-icon" aria-hidden="true">
            <span className="booking-confirm-ripple booking-confirm-ripple-1" />
            <span className="booking-confirm-ripple booking-confirm-ripple-2" />
            <span className="booking-confirm-icon-inner">
              <svg viewBox="0 0 80 80">
                <circle className="booking-confirm-circle" cx="40" cy="40" r="34" />
                <path className="booking-confirm-check" d="M24 41l12 12L56 28" />
              </svg>
            </span>
          </div>

          <h1 id="booking-confirmation-title" className="booking-confirm-title">
            {mode === "updated" ? "Agendamento atualizado!" : "Agendamento confirmado!"}
          </h1>
          <p id="booking-confirmation-description" className="booking-confirm-sub">
            {mode === "updated"
              ? "Alteramos o agendamento existente no Recanto Da Uva Fina."
              : "Recebemos o seu pedido de agendamento no Recanto Da Uva Fina."}
          </p>

          {mode === "updated" && previous ? (
            <UpdatedSummary
              isoDate={isoDate}
              time={time}
              adults={adults}
              childCount={childCount}
              totalPrice={totalPrice}
              previous={previous}
            />
          ) : (
            <div className="booking-confirm-summary">
              <div className="booking-confirm-row">
                <span className="k">Responsável</span>
                <span className="v">{responsibleName}</span>
              </div>
              <div className="booking-confirm-row">
                <span className="k">WhatsApp</span>
                <span className="v">{formatPhone(whatsapp)}</span>
              </div>
              <div className="booking-confirm-row">
                <span className="k">Data</span>
                <span className="v">{formatLongDate(isoDate)}</span>
              </div>
              <div className="booking-confirm-row">
                <span className="k">Horário</span>
                <span className="v">{time}</span>
              </div>
              <div className="booking-confirm-row">
                <span className="k">Visitantes</span>
                <span className="v">{formatVisitors(adults, childCount)}</span>
              </div>
              <div className="booking-confirm-row is-total">
                <span className="k">Valor total</span>
                <span className="v">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="booking-confirm-actions">
          <button
            ref={closeButtonRef}
            type="button"
            className="booking-confirm-button"
            onClick={onClose}
          >
            {mode === "updated" ? "Concluir" : "Fazer novo agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
