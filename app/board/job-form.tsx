"use client";

import { CircleAlert } from "lucide-react";
import { useActionState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { businessDateTimeOf } from "@/lib/business-time";
import type { BoardFilters } from "@/lib/jobs/board-filters";
import type { JobFormField } from "@/lib/jobs/job-form";
import type { Crew, JobDetails } from "@/lib/jobs/queries";
import { JOB_STATUSES, JOB_STATUS_LABELS } from "@/lib/jobs/status";
import { updateJob, type JobFormState } from "./actions";

const initialState: JobFormState = { error: null };

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-surface px-2 text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

type JobFormProps = {
  job: JobDetails;
  crews: Crew[];
  // Where to go back to after saving.
  filters: BoardFilters;
  onCancel: () => void;
};

export function JobForm({ job, crews, filters, onCancel }: JobFormProps) {
  const [state, formAction] = useActionState(updateJob, initialState);
  const [pending, startTransition] = useTransition();
  const scheduled = businessDateTimeOf(new Date(job.scheduled_for));
  const errors = state.fieldErrors ?? {};

  // Submitting by hand skips React's automatic form reset, so a failed save keeps the edits.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-4 px-4 pb-4">
      <input type="hidden" name="jobId" value={job.id} />
      <input type="hidden" name="updatedAt" value={job.updated_at} />
      <input type="hidden" name="returnDate" value={filters.date} />
      <input type="hidden" name="returnCrew" value={filters.crew} />

      <Field name="customerName" label="Customer" errors={errors.customerName}>
        <Input {...fieldProps("customerName", errors)} defaultValue={job.customer_name} />
      </Field>
      <Field name="address" label="Address" errors={errors.address}>
        <Input {...fieldProps("address", errors)} defaultValue={job.address} />
      </Field>
      <Field name="jobType" label="Job type" errors={errors.jobType}>
        <Input {...fieldProps("jobType", errors)} defaultValue={job.job_type} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field name="date" label="Date" errors={errors.date}>
          <Input {...fieldProps("date", errors)} type="date" defaultValue={scheduled.date} />
        </Field>
        <Field name="time" label="Time (Tijuana)" errors={errors.time}>
          <Input {...fieldProps("time", errors)} type="time" defaultValue={scheduled.time} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field name="crewId" label="Crew" errors={errors.crewId}>
          <select {...fieldProps("crewId", errors)} defaultValue={job.crew_id ?? ""} className={selectClassName}>
            <option value="">Unassigned</option>
            {crews.map((crew) => (
              <option key={crew.id} value={crew.id}>
                {crew.name}
              </option>
            ))}
          </select>
        </Field>
        <Field name="status" label="Status" errors={errors.status}>
          <select {...fieldProps("status", errors)} defaultValue={job.status} className={selectClassName}>
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {JOB_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field name="notes" label="Notes" errors={errors.notes}>
        <Textarea {...fieldProps("notes", errors)} defaultValue={job.notes} rows={5} />
      </Field>

      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="mt-auto flex justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save job"}
        </Button>
      </div>
    </form>
  );
}

function fieldProps(name: JobFormField, errors: Partial<Record<JobFormField, string[]>>) {
  return {
    id: `job-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `job-${name}-error` : undefined,
  };
}

type FieldProps = {
  name: JobFormField;
  label: string;
  errors?: string[];
  children: ReactNode;
};

function Field({ name, label, errors, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`job-${name}`}>{label}</Label>
      {children}
      {errors && (
        <p id={`job-${name}-error`} className="text-sm text-destructive">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
