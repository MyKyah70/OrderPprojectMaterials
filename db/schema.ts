import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const materialRequests = sqliteTable("material_requests", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  status: text("status").notNull().default("submitted"),
  requesterName: text("requester_name").notNull(),
  requesterEmail: text("requester_email").notNull(),
  requesterPhone: text("requester_phone").notNull().default(""),
  department: text("department").notNull().default(""),
  projectName: text("project_name").notNull(),
  projectNumber: text("project_number").notNull(),
  costCode: text("cost_code").notNull().default(""),
  projectManager: text("project_manager").notNull().default(""),
  purpose: text("purpose").notNull().default(""),
  priority: text("priority").notNull(),
  neededBy: text("needed_by").notNull(),
  shipTo: text("ship_to").notNull(),
  deliveryContact: text("delivery_contact").notNull().default(""),
  deliveryPhone: text("delivery_phone").notNull().default(""),
  deliveryHours: text("delivery_hours").notNull().default(""),
  approverName: text("approver_name").notNull().default(""),
  poRequired: integer("po_required", { mode: "boolean" }).notNull().default(false),
  poNumber: text("po_number").notNull().default(""),
  substitutionPolicy: text("substitution_policy").notNull().default("contact"),
  notes: text("notes").notNull().default(""),
});

export const materialItems = sqliteTable("material_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: text("request_id")
    .notNull()
    .references(() => materialRequests.id, { onDelete: "cascade" }),
  lineNumber: integer("line_number").notNull(),
  partNumber: text("part_number").notNull().default(""),
  description: text("description").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull().default("EA"),
  manufacturer: text("manufacturer").notNull().default(""),
  model: text("model").notNull().default(""),
  preferredVendor: text("preferred_vendor").notNull().default(""),
  estimatedUnitCost: real("estimated_unit_cost"),
  notes: text("notes").notNull().default(""),
});
