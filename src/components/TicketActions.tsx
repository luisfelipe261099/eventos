"use client";

/** Adicionar à agenda (.ics) e enviar o link do ingresso para o próprio WhatsApp. */
export default function TicketActions({ title, startsAt, place, url }: { title: string; startsAt: string; place: string; url?: string }) {
  function ics() {
    const s = new Date(startsAt), e = new Date(s.getTime() + 5 * 36e5);
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Casa Cheia//PT-BR", "BEGIN:VEVENT", `UID:${f(s)}-${title.replace(/\W/g, "")}@casacheia`, `DTSTAMP:${f(new Date())}`,
      `DTSTART:${f(s)}`, `DTEND:${f(e)}`, `SUMMARY:${title}`, `LOCATION:${place}`, `DESCRIPTION:Seu ingresso: ${url ?? location.href}`, "BEGIN:VALARM", "TRIGGER:-PT3H", "ACTION:DISPLAY", `DESCRIPTION:${title} hoje`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" })); a.download = "ingresso.ics"; a.click();
  }
  const share = `https://wa.me/?text=${encodeURIComponent(`Meu ingresso para ${title}: ${url ?? (typeof window !== "undefined" ? location.href : "")}`)}`;
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button className="btn-line border-white/20 bg-white/10 text-white hover:border-white" onClick={ics}>Adicionar à agenda</button>
      <a className="btn-line border-white/20 bg-white/10 text-white hover:border-white" href={share} target="_blank">Salvar no WhatsApp</a>
    </div>
  );
}
