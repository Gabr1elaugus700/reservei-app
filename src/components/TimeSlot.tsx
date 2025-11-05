function TimeSlot(
  timeSlots: string[],
  getTimeSlotCapacity: (time: string) => {
    occupied: number;
    max: number;
    isFull: boolean;
  },
  selectedTime: string | null,
  setSelectedTime: (time: string) => void
) {
  return (
    <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border border-border animate-in fade-in-50 slide-in-from-top-5 duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-1 bg-primary rounded-full" />
        <h3 className="text-xl font-bold">Selecione o Horário</h3>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {timeSlots.map((time) => {
          const capacity = getTimeSlotCapacity(time);
          const isSelected = selectedTime === time;
          const isFull = capacity.isFull;

          return (
            <button
              key={time}
              onClick={() => !isFull && setSelectedTime(time)}
              disabled={isFull}
              className={`
                      relative p-3 rounded-xl border-2 transition-all duration-200
                      ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-lg scale-105"
                          : isFull
                          ? "bg-muted/50 border-muted text-muted-foreground cursor-not-allowed opacity-50"
                          : "bg-background border-border hover:border-primary hover:bg-primary/5 hover:scale-105"
                      }
                    `}
            >
              <div className="font-semibold text-sm">{time}</div>
              {!isFull && (
                <div className="text-xs mt-1 opacity-75">
                  {capacity.occupied}/{capacity.max}
                </div>
              )}
              {isFull && <div className="text-xs mt-1 font-medium">Lotado</div>}
            </button>
          );
        })}
      </div>
      <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Selecionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-background border-2 border-border" />
            <span>Disponível</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span>Lotado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default TimeSlot;