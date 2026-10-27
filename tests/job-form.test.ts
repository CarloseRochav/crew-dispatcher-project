import { describe, expect, it } from "vitest";
import { jobFormErrors, jobUpdateSchema } from "@/lib/jobs/job-form";

const northCrewId = "c0000000-0000-4000-8000-000000000001";

const validForm = {
  jobId: "a0000000-0000-4000-8000-000000000001",
  updatedAt: "2026-10-26T15:04:05.123456+00:00",
  customerName: "Rosa Delgado",
  address: "1420 Calle Ocho",
  jobType: "Water heater install",
  date: "2026-10-22",
  time: "14:30",
  crewId: northCrewId,
  status: "scheduled",
  notes: "Gate code 2291.",
};

function fieldErrorsFor(input: Record<string, unknown>) {
  const result = jobUpdateSchema.safeParse(input);
  if (result.success) throw new Error("expected the form to be rejected");
  return jobFormErrors(result.error).fieldErrors;
}

describe("jobUpdateSchema", () => {
  it("turns a valid form into a jobs update on the Tijuana clock", () => {
    expect(jobUpdateSchema.parse(validForm)).toEqual({
      jobId: validForm.jobId,
      updatedAt: validForm.updatedAt,
      update: {
        customer_name: "Rosa Delgado",
        address: "1420 Calle Ocho",
        job_type: "Water heater install",
        scheduled_for: "2026-10-22T21:30:00.000Z",
        crew_id: northCrewId,
        status: "scheduled",
        notes: "Gate code 2291.",
      },
    });
  });

  it("trims text and treats the Unassigned option as no crew", () => {
    const { update } = jobUpdateSchema.parse({
      ...validForm,
      customerName: "  Rosa Delgado  ",
      crewId: "",
      notes: "   ",
    });

    expect(update.customer_name).toBe("Rosa Delgado");
    expect(update.crew_id).toBeNull();
    expect(update.notes).toBe("");
  });

  // Step 6 decision: the dispatcher may move a job backwards.
  it("accepts any status, including moving a done job back", () => {
    expect(jobUpdateSchema.parse({ ...validForm, status: "on_site" }).update.status).toBe("on_site");
  });

  it.each([
    ["customerName", "   "],
    ["address", ""],
    ["jobType", " "],
  ])("rejects a blank %s", (field, value) => {
    expect(fieldErrorsFor({ ...validForm, [field]: value })[field as "address"]).toBeDefined();
  });

  it.each([
    ["customerName", 201],
    ["address", 301],
    ["jobType", 101],
    ["notes", 5001],
  ])("rejects a %s longer than the limit", (field, length) => {
    expect(fieldErrorsFor({ ...validForm, [field]: "x".repeat(length) })[field as "notes"]).toBeDefined();
  });

  it.each([
    ["crewId", "north"],
    ["status", "cancelled"],
    ["date", "2026-02-30"],
    ["time", "25:00"],
    ["time", "14:30:00"],
  ])("rejects %s = %s", (field, value) => {
    expect(fieldErrorsFor({ ...validForm, [field]: value })[field as "time"]).toBeDefined();
  });

  it("rejects a time skipped by the spring-forward change", () => {
    const errors = fieldErrorsFor({ ...validForm, date: "2026-03-08", time: "02:30" });
    expect(errors.time?.[0]).toMatch(/clock change/);
  });

  it.each([
    ["jobId", "not-a-uuid"],
    ["updatedAt", "yesterday"],
  ])("rejects a tampered hidden %s", (field, value) => {
    expect(fieldErrorsFor({ ...validForm, [field]: value })[field as "jobId"]).toBeDefined();
  });

  it("rejects a form with missing fields", () => {
    expect(Object.keys(fieldErrorsFor({ jobId: validForm.jobId }))).toEqual(
      expect.arrayContaining(["customerName", "address", "date", "time", "status"]),
    );
  });
});
