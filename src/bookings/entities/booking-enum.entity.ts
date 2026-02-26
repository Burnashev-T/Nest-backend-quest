export enum BookingStatus {
  PENDING = 'pending', // создана, ожидает предоплаты
  DEPOSIT_PAID = 'deposit_paid', // предоплата получена
  CONFIRMED = 'confirmed', // подтверждена админом (после звонка)
  CANCELLED = 'cancelled', // отменена (с возвратом)
  COMPLETED = 'completed', // услуга оказана, деньги получены наличными
}
