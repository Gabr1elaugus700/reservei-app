"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CircleMinus, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { calculateTotalPrice, toIsoDate } from "@/lib/booking-display";
import { formatDate } from "@/lib/format-date";
import { normalizePhone } from "@/lib/phone";

interface NewBookingFormProps {
  slotId: string;
  slotTime: string;
  date: Date;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewBookingForm({
  slotId,
  slotTime,
  date,
  onSuccess,
  onCancel,
}: NewBookingFormProps) {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [showNameField, setShowNameField] = useState(false);
  const [isCustomerFound, setIsCustomerFound] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrensCount, setChildrensCount] = useState(0);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [isCounter, setIsCounter] = useState(false);
  const [nickname, setNickname] = useState("");

  const totalPrice = calculateTotalPrice(adultsCount, childrensCount);

  const handleWhatsappChange = (value: string) => {
    setWhatsappNumber(value);
    setShowNameField(false);
    setResponsibleName("");
    setIsCustomerFound(false);
    setCustomerId("");
  };

  const handleWhatsappBlur = async () => {
    const phone = normalizePhone(whatsappNumber);

    if (!phone) {
      if (whatsappNumber.trim()) {
        toast.error("Número de WhatsApp inválido");
      }
      return;
    }

    setIsLoadingCustomer(true);

    try {
      const response = await fetch(
        `/api/customer?phone=${encodeURIComponent(phone)}`
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setResponsibleName(result.data.name);
        setShowNameField(true);
        setIsCustomerFound(true);
        setCustomerId(result.data.id);
        toast.success("Cliente encontrado!");
      } else if (response.status === 404) {
        setShowNameField(true);
        setIsCustomerFound(false);
        toast.info("Novo cliente - informe o nome");
      } else {
        throw new Error(result.message || "Erro ao buscar cliente");
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      toast.error(
        "Erro ao buscar cliente" +
          (error instanceof Error ? `: ${error.message}` : "")
      );
    } finally {
      setIsLoadingCustomer(false);
    }
  };

  const handleCounterChange = (checked: boolean) => {
    setIsCounter(checked);
    if (checked) {
      setWhatsappNumber("");
      setResponsibleName("");
      setShowNameField(false);
      setIsCustomerFound(false);
      setCustomerId("");
      return;
    }
    setNickname("");
  };

  const handleSubmit = async () => {
    if (adultsCount < 1) {
      toast.error("Pelo menos 1 adulto é obrigatório");
      return;
    }

    if (isCounter) {
      await createCounterBooking();
      return;
    }

    const phone = normalizePhone(whatsappNumber);
    if (!responsibleName || !phone) {
      toast.error(
        phone ? "Preencha os dados do responsável" : "Número de WhatsApp inválido"
      );
      return;
    }

    try {
      setIsBookingLoading(true);

      // Se não houver customerId, criar novo customer
      let finalCustomerId = customerId;
      if (!finalCustomerId) {
        const customerResponse = await fetch("/api/customer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: responsibleName,
            phone,
          }),
        });

        const customerResult = await customerResponse.json();

        if (customerResponse.status === 409) {
          const lookupResponse = await fetch(
            `/api/customer?phone=${encodeURIComponent(phone)}`
          );
          const lookupResult = await lookupResponse.json();
          if (!lookupResponse.ok || !lookupResult.success) {
            throw new Error(customerResult.message || "Cliente já cadastrado");
          }
          finalCustomerId = lookupResult.data.id;
        } else if (!customerResponse.ok || !customerResult.success) {
          throw new Error(customerResult.message || "Erro ao criar cliente");
        } else {
          finalCustomerId = customerResult.data.id;
        }
      }

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeSlotId: slotId,
          customerId: finalCustomerId,
          date: toIsoDate(date),
          time: slotTime,
          adults: adultsCount,
          children: childrensCount,
          totalPrice,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao criar agendamento");
      }

      toast.success("Agendamento criado com sucesso!");
      onSuccess();
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar agendamento"
      );
    } finally {
      setIsBookingLoading(false);
    }
  };

  const createCounterBooking = async () => {
    try {
      setIsBookingLoading(true);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          counter: true,
          timeSlotId: slotId,
          date: toIsoDate(date),
          time: slotTime,
          adults: adultsCount,
          children: childrensCount,
          totalPrice,
          notes: nickname.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao criar agendamento");
      }

      toast.success("Agendamento de balcão criado!");
      onSuccess();
    } catch (error) {
      console.error("Error creating counter booking:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar agendamento"
      );
    } finally {
      setIsBookingLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-semibold text-blue-900">Novo Agendamento</h5>
        <Button
          size="icon"
          variant="ghost"
          onClick={onCancel}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-blue-900">
        {formatDate(toIsoDate(date))} às {slotTime}
      </p>

      <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-white p-3">
        <Checkbox
          id="agendamento-balcao"
          checked={isCounter}
          onCheckedChange={(checked) => handleCounterChange(checked === true)}
          disabled={isBookingLoading}
          className="mt-0.5"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium text-blue-950">
            Agendamento no balcão
          </span>
          <span className="block text-xs text-muted-foreground">
            Para quem chegou sem reserva. Não pede WhatsApp nem nome.
          </span>
        </span>
      </label>

      {isCounter ? (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="apelido-balcao">
            Apelido ou observação
          </label>
          <Input
            id="apelido-balcao"
            type="text"
            placeholder="Ex.: família Silva"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={120}
            disabled={isBookingLoading}
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Aparece na lista do dia junto com Balcão.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp</label>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="(00) 00000-0000"
                value={whatsappNumber}
                onChange={(e) => handleWhatsappChange(e.target.value)}
                onBlur={handleWhatsappBlur}
                disabled={isLoadingCustomer}
                className="flex-1"
              />
              {isLoadingCustomer && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>
          </div>

          {showNameField && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nome do Responsável {isCustomerFound && "(Cliente Cadastrado)"}
              </label>
              <Input
                type="text"
                placeholder="Nome completo"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                disabled={isCustomerFound}
              />
            </div>
          )}
        </>
      )}

      {/* Visitantes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Adultos</label>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => adultsCount > 1 && setAdultsCount(adultsCount - 1)}
              disabled={adultsCount <= 1}
              className="h-8 w-8"
            >
              <CircleMinus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold w-8 text-center">
              {adultsCount}
            </span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setAdultsCount(adultsCount + 1)}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Crianças</label>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() =>
                childrensCount > 0 && setChildrensCount(childrensCount - 1)
              }
              disabled={childrensCount <= 0}
              className="h-8 w-8"
            >
              <CircleMinus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold w-8 text-center">
              {childrensCount}
            </span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setChildrensCount(childrensCount + 1)}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="bg-white rounded-lg p-3 border">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total:</span>
          <span className="text-lg font-bold text-green-600">
            R$ {totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isBookingLoading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isBookingLoading || (!isCounter && !showNameField)}
          className="flex-1"
        >
          {isBookingLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Criar Agendamento"
          )}
        </Button>
      </div>
    </div>
  );
}
