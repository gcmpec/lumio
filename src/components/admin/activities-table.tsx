import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/admin/data-table";

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

export type Activity = {
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
};

const columnHelper = createColumnHelper<Activity>();

const formatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const columns: ColumnDef<Activity>[] = [
  columnHelper.accessor("id", {
    header: "ID",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("user_name", {
    header: "Colaborador",
    cell: (info) => (
      <div>
        <div className="font-medium">{info.getValue()}</div>
        <div className="text-xs text-muted-foreground">
          {info.row.original.user_email}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("engagement", {
    header: "Engagement",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("manager_email", {
    header: "Manager",
    cell: (info) => info.getValue() ?? "-",
  }),
  columnHelper.accessor("process", {
    header: "Processo",
    cell: (info) => info.getValue() ?? "-",
  }),
  columnHelper.accessor("deliverable", {
    header: "Deliverable",
    cell: (info) => info.getValue() ?? "-",
  }),
  columnHelper.accessor("started_at", {
    header: "Inicio",
    cell: (info) => formatter.format(new Date(info.getValue())),
  }),
  columnHelper.accessor("ended_at", {
    header: "Fim",
    cell: (info) =>
      info.getValue() ? formatter.format(new Date(info.getValue())) : "Em curso",
  }),
  columnHelper.accessor("duration_seconds", {
    header: "Duracao",
    cell: (info) => formatDuration(info.getValue()),
  }),
];

function formatDuration(durationSeconds: number | null) {
  if (durationSeconds == null) {
    return "-";
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

interface DataTableProps {
  data: Activity[];
}

export function ActivitiesTable({ data }: DataTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <DataTable table={table} />
    </div>
  );
}
