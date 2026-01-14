"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleMinus, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

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

  const handleWhatsappChange = (value: string) => {
    setWhatsappNumber(value);
    setShowNameField(false);
    setResponsibleName("");
    setIsCustomerFound(false);
    setCustomerId("");
  };

  const handleWhatsappBlur = async () => {
    const numbersOnly = whatsappNumber.replace(/\D/g, "");

    if (numbersOnly.length < 10) {
      toast.error("Número de WhatsApp inválido");
      return;
    }

    setIsLoadingCustomer(true);

    try {
      const response = await fetch(
        `/api/customer?phone=${encodeURIComponent(whatsappNumber)}`
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

  const handleSubmit = async () => {
    if (!responsibleName || !whatsappNumber) {
      toast.error("Preencha os dados do responsável");
      return;
    }

    if (adultsCount < 1) {
      toast.error("Pelo menos 1 adulto é obrigatório");
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
            phone: whatsappNumber,
          }),
        });

        const customerResult = await customerResponse.json();

        if (!customerResponse.ok || !customerResult.success) {
          throw new Error(customerResult.message || "Erro ao criar cliente");
        }

        finalCustomerId = customerResult.data.id;
      }

      const totalPrice = adultsCount * 10 + childrensCount * 5;

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeSlotId: slotId,
          customerId: finalCustomerId,
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
          time: slotTime,
          adults: adultsCount,
          children: childrensCount,
          totalPrice: totalPrice,
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

      {/* WhatsApp */}
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

      {/* Nome */}
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
            R$ {(adultsCount * 10 + childrensCount * 5).toFixed(2)}
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
          disabled={isBookingLoading || !showNameField}
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
