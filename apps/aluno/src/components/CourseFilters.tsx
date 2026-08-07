"use client";

import { FormEvent } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button, Field, Input, Select } from "@foxtrot/ui";
import type { CourseStatus } from "../lib/courses";

export function CourseFilters({
  q,
  status,
  loading,
  onQueryChange,
  onStatusChange,
  onSubmit,
  onClear
}: {
  q: string;
  status: CourseStatus | "";
  loading: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: CourseStatus | "") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  return (
    <form className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]" onSubmit={onSubmit} noValidate>
      <Field label="Buscar curso" htmlFor="course-search">
        <Input
          id="course-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Nome do curso, carreira ou descricao"
          value={q}
        />
      </Field>
      <Field label="Fase" htmlFor="course-status">
        <Select id="course-status" onChange={(event) => onStatusChange(event.target.value as CourseStatus | "")} value={status}>
          <option value="">Todas</option>
          <option value="PRE_EDITAL">Pre-edital</option>
          <option value="POS_EDITAL">Pos-edital</option>
        </Select>
      </Field>
      <div className="flex items-end">
        <Button className="w-full" disabled={loading} type="submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          Buscar
        </Button>
      </div>
      <div className="flex items-end">
        <Button className="w-full" disabled={loading || (!q && !status)} onClick={onClear} type="button" variant="outline">
          <X className="h-4 w-4" aria-hidden /> Limpar
        </Button>
      </div>
    </form>
  );
}
