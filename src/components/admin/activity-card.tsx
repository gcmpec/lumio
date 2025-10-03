interface Activity {
  id: number;
  user_name: string;
  user_email: string;
  engagement: string;
  manager_email: string | null;
  process: string | null;
  deliverable: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

interface ActivityCardProps {
  activity: Activity;
}

const formatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDuration(durationSeconds: number | null | undefined) {
  if (durationSeconds == null) {
    return "Em curso";
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!hours && !minutes) parts.push(`${seconds}s`);

  return parts.join(" ") || "0m";
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const started = formatter.format(new Date(activity.started_at));
  const ended = activity.ended_at
    ? formatter.format(new Date(activity.ended_at))
    : null;

  return (
    <div className="border rounded-xl p-4 bg-card text-card-foreground space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{activity.engagement}</h3>
          <p className="text-sm text-muted-foreground">{activity.deliverable ?? "Sem deliverable"}</p>
        </div>
        <span className="text-sm font-medium">
          {formatDuration(activity.duration_seconds)}
        </span>
      </div>
      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
        <div>
          <span className="font-medium text-foreground">Colaborador:</span> {activity.user_name} ({activity.user_email})
        </div>
        <div>
          <span className="font-medium text-foreground">Manager:</span> {activity.manager_email ?? "Nao indicado"}
        </div>
        <div>
          <span className="font-medium text-foreground">Processo:</span> {activity.process ?? "Nao indicado"}
        </div>
        <div>
          <span className="font-medium text-foreground">Inicio:</span> {started}
        </div>
        <div>
          <span className="font-medium text-foreground">Fim:</span> {ended ?? "Em curso"}
        </div>
      </div>
    </div>
  );
}
