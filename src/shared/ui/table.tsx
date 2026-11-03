import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

export function Table({
  className = "",
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-line">
      <table className={`table-cards w-full border-collapse text-left text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Thead({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-paper text-xs uppercase tracking-wide text-muted ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function Tbody({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-line ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function Tr({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`hover:bg-paper/70 ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function Th({
  className = "",
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={`px-4 py-2.5 font-semibold ${className}`} {...props}>
      {children}
    </th>
  );
}

export function Td({
  className = "",
  label,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { label?: string }) {
  return (
    <td
      data-label={label}
      className={`px-4 py-3 text-ink ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
