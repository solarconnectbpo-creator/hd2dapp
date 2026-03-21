/**
 * ICS file generation for calendar integration
 * Generates .ics format for "Add to Calendar" functionality
 */

interface IcsEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
}

export function createICS(event: IcsEvent): string {
  const formatDateTime = (date: string, time: string): string => {
    return `${date.replace(/-/g, "")}T${time.replace(/:/g, "")}00Z`;
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HD2D//Event//EN
BEGIN:VEVENT
UID:${event.id}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${formatDateTime(event.date, event.start_time)}
DTEND:${formatDateTime(event.date, event.end_time)}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, "\\n")}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;
}
