// Disponibilidade é calculada: funcionamento da quadra − reservas ativas.

// "Agora" no fuso do Brasil, independente de onde o servidor rode (UTC etc.)
export function nowInBR() {
  const tz = process.env.TZ_APP || 'America/Sao_Paulo';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return { today: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')) % 24 };
}

export function buildSlots(court, bookings, date) {
  const slots = [];
  const { today, hour: nowHour } = nowInBR();
  for (let h = court.openHour; h < court.closeHour; h++) {
    const start = `${String(h).padStart(2, '0')}:00`;
    const end = `${String(h + 1).padStart(2, '0')}:00`;
    const taken = bookings.some(
      (b) => b.startTime < end && b.endTime > start
    );
    const past = date === today && h <= nowHour;
    if (!taken && !past) slots.push({ startTime: start, endTime: end, price: court.pricePerHour });
  }
  return slots;
}

export function hoursBetween(startTime, endTime) {
  return (
    (Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3)) -
      (Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)))) / 60
  );
}
