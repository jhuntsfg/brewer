import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { createInterview, createAgentFromInterview, listInterviews } from "@/lib/interviews";
import { EnrollmentStatus } from "@/lib/interviews";

function parseBoolean(val: string): boolean | null {
  const v = val.trim().toLowerCase();
  if (v === "y" || v === "yes" || v === "true" || v === "1") return true;
  if (v === "n" || v === "no" || v === "false" || v === "0") return false;
  return null;
}

function parseEnrollment(val: string): EnrollmentStatus {
  const v = val.trim().toLowerCase();
  if (v === "yes" || v === "enrolled") return "enrolled";
  if (v === "licensed") return "licensed";
  if (v === "pending") return "pending";
  return null;
}

function parseDate(val: string): string | null {
  if (!val.trim()) return null;
  const d = new Date(val.trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await request.json() as { rows: Record<string, string>[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const existing = await listInterviews();
  const existingEmails = new Set(existing.map((i) => i.email?.toLowerCase()).filter(Boolean));
  const existingNames = new Set(existing.map((i) => i.interviewee_name.toLowerCase()));

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const name = (row["Interviewee"] ?? "").trim();
    if (!name) { results.skipped++; continue; }

    const scheduled_at = parseDate(row["Interview Date"] ?? "");
    if (!scheduled_at) { results.skipped++; continue; }

    const email = (row["Email"] ?? "").trim() || null;
    const phone = (row["Phone"] ?? "").trim() || null;
    const owner = (row["Ran by?"] ?? "").trim();
    const showed = parseBoolean(row["Show? Y/N"] ?? "");
    const hired = parseBoolean(row["Hired? Y/N"] ?? "");
    const enrollment_status = parseEnrollment(row["Purchased Course"] ?? "");
    const notes = (row["Additional Notes"] ?? "").trim() || null;

    // Skip duplicates by email or name+date
    if (email && existingEmails.has(email.toLowerCase())) {
      results.skipped++;
      continue;
    }
    if (existingNames.has(name.toLowerCase())) {
      results.skipped++;
      continue;
    }

    try {
      const interview = await createInterview({
        interviewee_name: name,
        email,
        phone,
        scheduled_at,
        owner,
        showed,
        hired,
        enrollment_status,
        notes,
        source: "manual",
      });

      existingEmails.add(email?.toLowerCase() ?? "");
      existingNames.add(name.toLowerCase());

      // Auto-create agent card for hired + enrolled/licensed
      if (hired === true && (enrollment_status === "enrolled" || enrollment_status === "licensed")) {
        try {
          await createAgentFromInterview(interview.id, enrollment_status);
        } catch {
          // non-fatal
        }
      }

      results.created++;
    } catch (err) {
      results.errors.push(`${name}: ${String(err)}`);
    }
  }

  return NextResponse.json(results);
}
