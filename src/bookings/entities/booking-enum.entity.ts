export enum BookingStatus {
  PENDING = 'pending', // ожидает предоплаты
  DEPOSIT_PAID = 'deposit_paid', // предоплата внесена
  CONFIRMED = 'confirmed', // подтверждена админом
  CANCELLED = 'cancelled', // отменена
  COMPLETED = 'completed', // завершена
  AWAITING_CLIENT_CONFIRMATION = 'awaiting_client_confirmation', // создана менеджером, ждёт подтверждения клиента
}
