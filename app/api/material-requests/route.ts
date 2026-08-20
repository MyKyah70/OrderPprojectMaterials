import { env } from "cloudflare:workers";

type MaterialItem = {
  partNumber?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  manufacturer?: string;
  model?: string;
  preferredVendor?: string;
  estimatedUnitCost?: number | null;
  notes?: string;
};

type RequestPayload = {
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  department?: string;
  projectName?: string;
  projectNumber?: string;
  costCode?: string;
  projectManager?: string;
  purpose?: string;
  priority?: "normal" | "rush" | "urgent";
  neededBy?: string;
  shipTo?: string;
  deliveryContact?: string;
  deliveryPhone?: string;
  deliveryHours?: string;
  approverName?: string;
  poRequired?: boolean;
  poNumber?: string;
  substitutionPolicy?: string;
  notes?: string;
  items?: MaterialItem[];
};

const clean = (value: unknown, max = 1000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS material_requests (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'submitted',
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      requester_phone TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      project_name TEXT NOT NULL,
      project_number TEXT NOT NULL,
      cost_code TEXT NOT NULL DEFAULT '',
      project_manager TEXT NOT NULL DEFAULT '',
      purpose TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL CHECK(priority IN ('normal','rush','urgent')),
      needed_by TEXT NOT NULL,
      ship_to TEXT NOT NULL,
      delivery_contact TEXT NOT NULL DEFAULT '',
      delivery_phone TEXT NOT NULL DEFAULT '',
      delivery_hours TEXT NOT NULL DEFAULT '',
      approver_name TEXT NOT NULL DEFAULT '',
      po_required INTEGER NOT NULL DEFAULT 0,
      po_number TEXT NOT NULL DEFAULT '',
      substitution_policy TEXT NOT NULL DEFAULT 'contact',
      notes TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS material_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
      line_number INTEGER NOT NULL,
      part_number TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      quantity REAL NOT NULL CHECK(quantity > 0),
      unit TEXT NOT NULL DEFAULT 'EA',
      manufacturer TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      preferred_vendor TEXT NOT NULL DEFAULT '',
      estimated_unit_cost REAL,
      notes TEXT NOT NULL DEFAULT ''
    )`),
  ]);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RequestPayload;
    const required = {
      requesterName: clean(payload.requesterName, 120),
      requesterEmail: clean(payload.requesterEmail, 180),
      projectName: clean(payload.projectName, 180),
      projectNumber: clean(payload.projectNumber, 80),
      neededBy: clean(payload.neededBy, 20),
      shipTo: clean(payload.shipTo, 500),
    };

    if (Object.values(required).some((value) => !value)) {
      return Response.json({ error: "Please complete every required field." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(required.requesterEmail)) {
      return Response.json({ error: "Please enter a valid requester email." }, { status: 400 });
    }
    if (!payload.priority || !["normal", "rush", "urgent"].includes(payload.priority)) {
      return Response.json({ error: "Please select a valid priority." }, { status: 400 });
    }

    const items = (payload.items ?? [])
      .slice(0, 100)
      .map((item) => ({
        partNumber: clean(item.partNumber, 120),
        description: clean(item.description, 500),
        quantity: Number(item.quantity),
        unit: clean(item.unit, 30) || "EA",
        manufacturer: clean(item.manufacturer, 120),
        model: clean(item.model, 120),
        preferredVendor: clean(item.preferredVendor, 160),
        estimatedUnitCost:
          item.estimatedUnitCost === null || item.estimatedUnitCost === undefined
            ? null
            : Number(item.estimatedUnitCost),
        notes: clean(item.notes, 500),
      }))
      .filter(
        (item) =>
          item.partNumber &&
          item.description &&
          item.manufacturer &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0,
      );

    if (!items.length) {
      return Response.json({ error: "Add at least one valid material item." }, { status: 400 });
    }

    const now = new Date();
    const requestId = `MR-${now.getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const db = env.DB;
    if (!db) throw new Error("Material request storage is unavailable.");
    await ensureSchema(db);

    const statements = [
      db.prepare(`INSERT INTO material_requests (
        id, requester_name, requester_email, requester_phone, department,
        project_name, project_number, cost_code, project_manager, purpose,
        priority, needed_by, ship_to, delivery_contact, delivery_phone,
        delivery_hours, approver_name, po_required, po_number,
        substitution_policy, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          requestId,
          required.requesterName,
          required.requesterEmail,
          clean(payload.requesterPhone, 50),
          clean(payload.department, 100),
          required.projectName,
          required.projectNumber,
          clean(payload.costCode, 80),
          clean(payload.projectManager, 120),
          clean(payload.purpose, 500),
          payload.priority,
          required.neededBy,
          required.shipTo,
          clean(payload.deliveryContact, 120),
          clean(payload.deliveryPhone, 50),
          clean(payload.deliveryHours, 160),
          clean(payload.approverName, 120),
          payload.poRequired ? 1 : 0,
          clean(payload.poNumber, 80),
          clean(payload.substitutionPolicy, 30) || "contact",
          clean(payload.notes, 2000),
        ),
      ...items.map((item, index) =>
        db.prepare(`INSERT INTO material_items (
          request_id, line_number, part_number, description, quantity, unit,
          manufacturer, model, preferred_vendor, estimated_unit_cost, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(
            requestId,
            index + 1,
            item.partNumber,
            item.description,
            item.quantity,
            item.unit,
            item.manufacturer,
            item.model,
            item.preferredVendor,
            item.estimatedUnitCost,
            item.notes,
          ),
      ),
    ];

    await db.batch(statements);
    return Response.json({ requestId, status: "submitted" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit this request.";
    return Response.json({ error: message }, { status: 500 });
  }
}
