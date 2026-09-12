import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TableColumn<Row> {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
}

interface TableProps<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  getRowKey?: (row: Row, index: number) => string;
  className?: string;
}

export function Table<Row extends Record<string, unknown>>({
  columns,
  rows,
  getRowKey,
  className,
}: TableProps<Row>) {
  return (
    <table className={cn("w-full border-collapse text-left font-body text-ink", className)}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className="border-b border-line px-3 py-2 font-mono text-[12px] uppercase tracking-[0.06em] text-grey"
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={getRowKey ? getRowKey(row, index) : index}>
            {columns.map((column) => (
              <td key={column.key} className="border-b border-line px-3 py-2 text-[14px]">
                {column.render ? column.render(row) : (row[column.key] as ReactNode)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
