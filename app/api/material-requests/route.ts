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

type NormalizedMaterialItem = {
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  manufacturer: string;
  model: string;
  preferredVendor: string;
  estimatedUnitCost: number | null;
  notes: string;
};

type PurchasingEmailBinding = {
  send(message: {
    to: string;
    from: string;
    replyTo?: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
};

const PURCHASING_EMAIL = "fjpedersen@3dtsi.com";
const MATERIAL_REQUEST_SENDER = "material-requests@orders.awgoodson.com";

const clean = (value: unknown, max = 1000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const display = (value: unknown) => clean(value) || "—";

const escapeHtml = (value: unknown) =>
  display(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br>");

const substitutionLabels: Record<string, string> = {
  contact: "Contact requester before any substitution",
  equivalent: "Approved equivalent is acceptable",
  exact: "Exact manufacturer and part number only",
};

function buildPurchasingEmail(
  requestId: string,
  payload: RequestPayload,
  required: {
    requesterName: string;
    requesterEmail: string;
    projectName: string;
    projectNumber: string;
    neededBy: string;
    shipTo: string;
  },
  items: NormalizedMaterialItem[],
) {
  const priority = (payload.priority ?? "normal").toUpperCase();
  const substitutionPolicy =
    substitutionLabels[clean(payload.substitutionPolicy, 30)] ??
    substitutionLabels.contact;
  const estimatedTotal = items.reduce(
    (sum, item) =>
      sum + (item.estimatedUnitCost === null ? 0 : item.estimatedUnitCost * item.quantity),
    0,
  );
  const hasEstimatedCost = items.some((item) => item.estimatedUnitCost !== null);
  const money = (value: number | null) =>
    value === null
      ? "—"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value);
  const textDetails = [
    `MATERIAL REQUEST ${requestId}`,
    `Priority: ${priority}`,
    `Needed by: ${required.neededBy}`,
    "",
    "REQUESTER",
    `Name: ${required.requesterName}`,
    `Email: ${required.requesterEmail}`,
    `Phone: ${display(payload.requesterPhone)}`,
    `Department / branch: ${display(payload.department)}`,
    "",
    "PROJECT",
    `Project name: ${required.projectName}`,
    `Project number: ${required.projectNumber}`,
    `Cost code: ${display(payload.costCode)}`,
    `Project manager: ${display(payload.projectManager)}`,
    `Purpose / scope: ${display(payload.purpose)}`,
    "",
    "DELIVERY",
    `Ship to: ${required.shipTo}`,
    `Delivery contact: ${display(payload.deliveryContact)}`,
    `Delivery phone: ${display(payload.deliveryPhone)}`,
    `Delivery hours / instructions: ${display(payload.deliveryHours)}`,
    "",
    "APPROVAL & PURCHASING",
    `Approver / supervisor: ${display(payload.approverName)}`,
    `PO required: ${payload.poRequired ? "Yes" : "No"}`,
    `PO / quote number: ${display(payload.poNumber)}`,
    `Substitution policy: ${substitutionPolicy}`,
    `Order notes: ${display(payload.notes)}`,
    "",
    "MATERIALS",
    ...items.flatMap((item, index) => [
      `${index + 1}. ${item.description}`,
      `   Part number: ${item.partNumber}`,
      `   Manufacturer: ${item.manufacturer}`,
      `   Model: ${display(item.model)}`,
      `   Quantity: ${item.quantity} ${item.unit}`,
      `   Preferred vendor: ${display(item.preferredVendor)}`,
      `   Estimated unit cost: ${money(item.estimatedUnitCost)}`,
      `   Line notes: ${display(item.notes)}`,
      "",
    ]),
    `Estimated request total: ${hasEstimatedCost ? money(estimatedTotal) : "—"}`,
    "",
    `Reply to this email to contact ${required.requesterName}.`,
  ];

  const row = (label: string, value: unknown) =>
    `<tr><th style="padding:7px 10px;text-align:left;vertical-align:top;color:#5a6472;width:190px;border-bottom:1px solid #e5e7eb">${escapeHtml(label)}</th><td style="padding:7px 10px;vertical-align:top;border-bottom:1px solid #e5e7eb">${escapeHtml(value)}</td></tr>`;
  const materialRows = items
    .map(
      (item, index) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${index + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>${escapeHtml(item.partNumber)}</strong></td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.description)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.manufacturer)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.model)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${item.quantity} ${escapeHtml(item.unit)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.preferredVendor)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${money(item.estimatedUnitCost)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.notes)}</td>
      </tr>`,
    )
    .join("");

  return {
    subject: `[${priority}] Material Request ${requestId} — ${required.projectName} (${required.projectNumber})`,
    text: textDetails.join("\n"),
    html: `<!doctype html>
      <html><body style="margin:0;background:#f4f6f8;color:#17202a;font-family:Arial,sans-serif">
        <div style="max-width:900px;margin:0 auto;padding:24px">
          <div style="background:#102a43;color:white;padding:20px 24px;border-radius:10px 10px 0 0">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b9d8ef">3D Technology Services</div>
            <h1 style="margin:8px 0 4px;font-size:24px">Material Request ${escapeHtml(requestId)}</h1>
            <div><strong>${escapeHtml(priority)}</strong> · Needed by ${escapeHtml(required.neededBy)}</div>
          </div>
          <div style="background:white;padding:24px;border:1px solid #dbe2e8;border-top:0">
            <h2 style="font-size:18px;margin:0 0 10px">Requester</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              ${row("Name", required.requesterName)}
              ${row("Email", required.requesterEmail)}
              ${row("Phone", payload.requesterPhone)}
              ${row("Department / branch", payload.department)}
            </table>
            <h2 style="font-size:18px;margin:0 0 10px">Project</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              ${row("Project name", required.projectName)}
              ${row("Project number", required.projectNumber)}
              ${row("Cost code", payload.costCode)}
              ${row("Project manager", payload.projectManager)}
              ${row("Purpose / scope", payload.purpose)}
            </table>
            <h2 style="font-size:18px;margin:0 0 10px">Materials</h2>
            <div style="overflow-x:auto;margin-bottom:12px">
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead><tr style="background:#edf2f7">
                  <th style="padding:8px;text-align:left">#</th><th style="padding:8px;text-align:left">Part number</th>
                  <th style="padding:8px;text-align:left">Description</th><th style="padding:8px;text-align:left">Manufacturer</th>
                  <th style="padding:8px;text-align:left">Model</th><th style="padding:8px;text-align:left">Qty</th>
                  <th style="padding:8px;text-align:left">Vendor</th><th style="padding:8px;text-align:left">Est. unit cost</th>
                  <th style="padding:8px;text-align:left">Notes</th>
                </tr></thead><tbody>${materialRows}</tbody>
              </table>
            </div>
            <p style="margin:0 0 24px;text-align:right"><strong>Estimated request total: ${hasEstimatedCost ? money(estimatedTotal) : "—"}</strong></p>
            <h2 style="font-size:18px;margin:0 0 10px">Delivery</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              ${row("Ship to", required.shipTo)}
              ${row("Delivery contact", payload.deliveryContact)}
              ${row("Delivery phone", payload.deliveryPhone)}
              ${row("Delivery hours / instructions", payload.deliveryHours)}
            </table>
            <h2 style="font-size:18px;margin:0 0 10px">Approval & purchasing</h2>
            <table style="width:100%;border-collapse:collapse">
              ${row("Approver / supervisor", payload.approverName)}
              ${row("PO required", payload.poRequired ? "Yes" : "No")}
              ${row("PO / quote number", payload.poNumber)}
              ${row("Substitution policy", substitutionPolicy)}
              ${row("Order notes", payload.notes)}
            </table>
          </div>
          <div style="padding:14px 24px;color:#5a6472;font-size:12px">Reply to this email to contact ${escapeHtml(required.requesterName)} at ${escapeHtml(required.requesterEmail)}.</div>
        </div>
      </body></html>`,
  };
}

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
    db.prepare(`CREATE TABLE IF NOT EXISTS submission_rate_limits (
      rate_key TEXT PRIMARY KEY,
      window_start INTEGER NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 1
    )`),
  ]);
}

async function submissionAllowed(db: D1Database, request: Request) {
  const source = request.headers.get("cf-connecting-ip") || "unknown";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  const sourceHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const windowSeconds = 15 * 60;
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const rateKey = `${sourceHash}:${windowStart}`;
  const result = await db.prepare(`INSERT INTO submission_rate_limits (
      rate_key, window_start, request_count
    ) VALUES (?, ?, 1)
    ON CONFLICT(rate_key) DO UPDATE SET request_count = request_count + 1
    RETURNING request_count`)
    .bind(rateKey, windowStart)
    .first<{ request_count: number }>();

  await db.prepare("DELETE FROM submission_rate_limits WHERE window_start < ?")
    .bind(windowStart - windowSeconds)
    .run();

  return Number(result?.request_count ?? 1) <= 20;
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
    if (!(await submissionAllowed(db, request))) {
      return Response.json(
        { error: "Too many requests were submitted. Please wait 15 minutes and try again." },
        { status: 429 },
      );
    }

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

    const purchasingEmail = (env as unknown as { EMAIL?: PurchasingEmailBinding }).EMAIL;
    const emailContent = buildPurchasingEmail(requestId, payload, required, items);
    try {
      if (!purchasingEmail) {
        throw new Error("Purchasing email service is unavailable.");
      }
      await purchasingEmail.send({
        to: PURCHASING_EMAIL,
        from: MATERIAL_REQUEST_SENDER,
        replyTo: required.requesterEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
      await db.prepare("UPDATE material_requests SET status = ? WHERE id = ?")
        .bind("emailed", requestId)
        .run();
    } catch {
      await db.prepare("UPDATE material_requests SET status = ? WHERE id = ?")
        .bind("email_failed", requestId)
        .run()
        .catch(() => undefined);
      return Response.json(
        {
          requestId,
          error: `Request ${requestId} was saved, but the purchasing email could not be delivered. Do not resubmit; contact purchasing with this confirmation number.`,
        },
        { status: 502 },
      );
    }

    return Response.json(
      { requestId, status: "submitted", emailStatus: "sent" },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit this request.";
    return Response.json({ error: message }, { status: 500 });
  }
}
