function generarGoogleCalendarLink({
  titulo,
  descripcion,
  ubicacion,
  fecha_inicio,
  fecha_fin,
  invitados, // <-- nuevo parámetro
}: {
  titulo: string;
  descripcion?: string;
  ubicacion?: string;
  fecha_inicio: string | Date;
  fecha_fin: string | Date;
  invitados?: string[]; // <-- array de emails
}) {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      throw new Error("Fecha inválida para Google Calendar");
    }
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  if (!fecha_inicio || !fecha_fin) {
    throw new Error("Faltan fechas para Google Calendar");
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    details: descripcion || "",
    location: ubicacion || "",
    dates: `${formatDate(fecha_inicio)}/${formatDate(fecha_fin)}`,
  });

  if (invitados && invitados.length > 0) {
    params.append("add", invitados.join(","));
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default generarGoogleCalendarLink;
