"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Priority = "normal" | "rush" | "urgent";

type LineItem = {
  key: string;
  partNumber: string;
  description: string;
  quantity: string;
  unit: string;
  manufacturer: string;
  model: string;
  preferredVendor: string;
  estimatedUnitCost: string;
  notes: string;
};

const makeItem = (key = "line-1"): LineItem => ({
  key,
  partNumber: "",
  description: "",
  quantity: "1",
  unit: "EA",
  manufacturer: "",
  model: "",
  preferredVendor: "",
  estimatedUnitCost: "",
  notes: "",
});

const priorityOptions: Array<{
  value: Priority;
  label: string;
  timing: string;
  detail: string;
}> = [
  {
    value: "normal",
    label: "Normal",
    timing: "Standard processing",
    detail: "Use for planned material needs with adequate lead time.",
  },
  {
    value: "rush",
    label: "Rush",
    timing: "Expedited review",
    detail: "Use when schedule impact is likely without faster action.",
  },
  {
    value: "urgent",
    label: "Urgent",
    timing: "Immediate attention",
    detail: "Use for critical field needs. Contact purchasing after submitting.",
  },
];

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const [priority, setPriority] = useState<Priority>("normal");
  const [items, setItems] = useState<LineItem[]>([makeItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);

  const estimatedTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const quantity = Number(item.quantity);
        const unitCost = Number(item.estimatedUnitCost);
        return sum + (Number.isFinite(quantity) && Number.isFinite(unitCost) ? quantity * unitCost : 0);
      }, 0),
    [items],
  );

  useEffect(() => {
    const saved = localStorage.getItem("3dtsi-material-request-draft");
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as {
        fields?: Record<string, string>;
        priority?: Priority;
        items?: LineItem[];
      };
      if (draft.priority) setPriority(draft.priority);
      if (draft.items?.length) setItems(draft.items.map((item) => ({ ...item, key: crypto.randomUUID() })));
      requestAnimationFrame(() => {
        Object.entries(draft.fields ?? {}).forEach(([name, value]) => {
          const control = formRef.current?.elements.namedItem(name);
          if (control && "value" in control && typeof value === "string") {
            (control as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = value;
          }
        });
        setNotice("Your saved draft has been restored.");
      });
    } catch {
      localStorage.removeItem("3dtsi-material-request-draft");
    }
  }, []);

  function updateItem(key: string, field: keyof LineItem, value: string) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((current) => [...current, makeItem(crypto.randomUUID())]);
    setNotice("");
  }

  function removeItem(key: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.key !== key)));
  }

  function saveDraft() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const fields: Record<string, string> = {};
    data.forEach((value, key) => {
      if (typeof value === "string" && key !== "priority" && key !== "confirmed") fields[key] = value;
    });
    localStorage.setItem("3dtsi-material-request-draft", JSON.stringify({ fields, priority, items }));
    setNotice("Draft saved on this device.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setNotice("");
    setReceipt(null);

    if (!form.reportValidity()) return;
    const invalidItem = items.find(
      (item) => !item.partNumber.trim() || !item.description.trim() || !item.manufacturer.trim() || Number(item.quantity) <= 0,
    );
    if (invalidItem) {
      setNotice("Each material line needs a part number, description, manufacturer, and quantity greater than zero.");
      document.getElementById(`item-${invalidItem.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const payload = {
      requesterName: text("requesterName"),
      requesterEmail: text("requesterEmail"),
      requesterPhone: text("requesterPhone"),
      department: text("department"),
      projectName: text("projectName"),
      projectNumber: text("projectNumber"),
      costCode: text("costCode"),
      projectManager: text("projectManager"),
      purpose: text("purpose"),
      priority,
      neededBy: text("neededBy"),
      shipTo: text("shipTo"),
      deliveryContact: text("deliveryContact"),
      deliveryPhone: text("deliveryPhone"),
      deliveryHours: text("deliveryHours"),
      approverName: text("approverName"),
      poRequired: data.get("poRequired") === "on",
      poNumber: text("poNumber"),
      substitutionPolicy: text("substitutionPolicy"),
      notes: text("notes"),
      items: items.map(({ key: _key, ...item }) => ({
        ...item,
        quantity: Number(item.quantity),
        estimatedUnitCost: item.estimatedUnitCost === "" ? null : Number(item.estimatedUnitCost),
      })),
    };

    setSubmitting(true);
    try {
      const response = await fetch("/api/material-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { requestId?: string; error?: string };
      if (!response.ok || !result.requestId) throw new Error(result.error || "Submission failed. Please try again.");
      localStorage.removeItem("3dtsi-material-request-draft");
      setReceipt(result.requestId);
      setNotice("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to submit this request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <div className="brand-rail">
        <span>3D Technology Services</span>
        <span className="rail-status">Internal operations</span>
      </div>

      <header className="site-header">
        <a className="brand" href="https://www.3dtsi.com/" aria-label="3D Technology Services home">
          <img src="/3dtsi-logo.png" alt="3D Technology Services" />
        </a>
        <div className="header-context">
          <span>Operations portal</span>
          <strong>Material ordering</strong>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow"><span /> Purchasing request</p>
          <h1>Order project <em>materials.</em></h1>
          <p className="hero-copy">
            Give purchasing a complete, field-ready request. Required details are marked with <b>*</b>.
          </p>
        </div>
        <div className="hero-note">
          <span className="hero-note-number">01</span>
          <p><strong>Before you begin</strong>Confirm project coding, the delivery location, and the exact manufacturer part numbers.</p>
        </div>
      </section>

      {receipt && (
        <section className="receipt" role="status" aria-live="polite">
          <div className="receipt-mark">✓</div>
          <div>
            <p className="eyebrow">Request submitted</p>
            <h2>Purchasing has your material request.</h2>
            <p>Confirmation <strong>{receipt}</strong>. Save this number for follow-up.</p>
          </div>
          <button type="button" className="button secondary" onClick={() => window.print()}>Print confirmation</button>
        </section>
      )}

      <div className="form-layout">
        <aside className="progress-panel" aria-label="Request sections">
          <p className="eyebrow">Request guide</p>
          <ol>
            <li><span>01</span><a href="#request-details">Request details</a></li>
            <li><span>02</span><a href="#materials">Materials</a></li>
            <li><span>03</span><a href="#delivery">Delivery</a></li>
            <li><span>04</span><a href="#approval">Approval</a></li>
          </ol>
          <div className="summary-card">
            <span>{items.length}</span>
            <p>material {items.length === 1 ? "line" : "lines"}</p>
            {estimatedTotal > 0 && <strong>{estimatedTotal.toLocaleString("en-US", { style: "currency", currency: "USD" })} estimated</strong>}
          </div>
          <p className="privacy-note">Drafts stay on this device. Submitted requests are stored securely for purchasing.</p>
        </aside>

        <form ref={formRef} className="request-form" onSubmit={handleSubmit} noValidate>
          <section className="form-section" id="request-details">
            <div className="section-heading">
              <p className="eyebrow">01 / Request details</p>
              <h2>Who needs what—and for which project?</h2>
            </div>

            <div className="field-grid two">
              <label className="field">
                <span>Requested by <b>*</b></span>
                <input name="requesterName" autoComplete="name" placeholder="Full name" required />
              </label>
              <label className="field">
                <span>Work email <b>*</b></span>
                <input name="requesterEmail" type="email" autoComplete="email" placeholder="name@3dtsi.com" required />
              </label>
              <label className="field">
                <span>Phone</span>
                <input name="requesterPhone" type="tel" autoComplete="tel" placeholder="(555) 000-0000" />
              </label>
              <label className="field">
                <span>Department / branch</span>
                <input name="department" placeholder="Operations, Service, Sacramento…" />
              </label>
            </div>

            <div className="subsection-label"><span>Project coding</span></div>
            <div className="field-grid two">
              <label className="field">
                <span>Project name <b>*</b></span>
                <input name="projectName" placeholder="Customer or site name" required />
              </label>
              <label className="field">
                <span>Project number <b>*</b></span>
                <input name="projectNumber" placeholder="Job / project number" required />
              </label>
              <label className="field">
                <span>Cost code / phase</span>
                <input name="costCode" placeholder="Optional accounting code" />
              </label>
              <label className="field">
                <span>Project manager</span>
                <input name="projectManager" placeholder="PM responsible for this order" />
              </label>
              <label className="field span-two">
                <span>Purpose / work area</span>
                <input name="purpose" placeholder="Example: IDF-2 buildout, east platform cameras, change order 04" />
              </label>
            </div>

            <fieldset className="priority-fieldset">
              <legend>Required timing <b>*</b></legend>
              <div className="priority-grid">
                {priorityOptions.map((option) => (
                  <label key={option.value} className={`priority-card ${priority === option.value ? "selected" : ""}`} data-priority={option.value}>
                    <input
                      type="radio"
                      name="priority"
                      value={option.value}
                      checked={priority === option.value}
                      onChange={() => setPriority(option.value)}
                    />
                    <span className="priority-top"><strong>{option.label}</strong><i /></span>
                    <b>{option.timing}</b>
                    <small>{option.detail}</small>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="field needed-by">
              <span>Needed by <b>*</b></span>
              <input name="neededBy" type="date" required />
              <small>Enter the date materials must be on site—not the installation date.</small>
            </label>
          </section>

          <section className="form-section" id="materials">
            <div className="section-heading heading-row">
              <div>
                <p className="eyebrow">02 / Materials</p>
                <h2>Build the order.</h2>
              </div>
              <button type="button" className="button secondary compact" onClick={addItem}>+ Add material</button>
            </div>

            <div className="materials-list">
              {items.map((item, index) => (
                <article className="material-card" id={`item-${item.key}`} key={item.key}>
                  <div className="material-card-head">
                    <span>Line {String(index + 1).padStart(2, "0")}</span>
                    <button type="button" className="remove-button" onClick={() => removeItem(item.key)} disabled={items.length === 1} aria-label={`Remove material line ${index + 1}`}>
                      Remove
                    </button>
                  </div>
                  <div className="field-grid material-grid">
                    <label className="field">
                      <span>Part number <b>*</b></span>
                      <input value={item.partNumber} onChange={(e) => updateItem(item.key, "partNumber", e.target.value)} placeholder="Exact catalog / SKU" required />
                    </label>
                    <label className="field description-field">
                      <span>Description <b>*</b></span>
                      <input value={item.description} onChange={(e) => updateItem(item.key, "description", e.target.value)} placeholder="Material description, size, color, rating" required />
                    </label>
                    <label className="field quantity-field">
                      <span>Quantity <b>*</b></span>
                      <input value={item.quantity} onChange={(e) => updateItem(item.key, "quantity", e.target.value)} type="number" min="0.01" step="0.01" inputMode="decimal" required />
                    </label>
                    <label className="field unit-field">
                      <span>Unit</span>
                      <select value={item.unit} onChange={(e) => updateItem(item.key, "unit", e.target.value)}>
                        <option>EA</option><option>BOX</option><option>CASE</option><option>ROLL</option><option>FT</option><option>PAIR</option><option>LOT</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Manufacturer <b>*</b></span>
                      <input value={item.manufacturer} onChange={(e) => updateItem(item.key, "manufacturer", e.target.value)} placeholder="Manufacturer name" required />
                    </label>
                    <label className="field">
                      <span>Model / series</span>
                      <input value={item.model} onChange={(e) => updateItem(item.key, "model", e.target.value)} placeholder="Model, series, or revision" />
                    </label>
                    <label className="field">
                      <span>Preferred vendor</span>
                      <input value={item.preferredVendor} onChange={(e) => updateItem(item.key, "preferredVendor", e.target.value)} placeholder="If known" />
                    </label>
                    <label className="field">
                      <span>Est. unit cost</span>
                      <div className="money-input"><span>$</span><input value={item.estimatedUnitCost} onChange={(e) => updateItem(item.key, "estimatedUnitCost", e.target.value)} type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" /></div>
                    </label>
                    <label className="field material-notes">
                      <span>Line notes</span>
                      <input value={item.notes} onChange={(e) => updateItem(item.key, "notes", e.target.value)} placeholder="Alternate specs, lead-time note, quote reference, or package details" />
                    </label>
                  </div>
                </article>
              ))}
            </div>
            <button type="button" className="add-line-wide" onClick={addItem}>+ Add another material line</button>
          </section>

          <section className="form-section" id="delivery">
            <div className="section-heading">
              <p className="eyebrow">03 / Delivery</p>
              <h2>Tell us where it needs to land.</h2>
            </div>
            <div className="field-grid two">
              <label className="field span-two">
                <span>Ship to / jobsite address <b>*</b></span>
                <textarea name="shipTo" rows={3} placeholder="Company or jobsite, street address, city, state, ZIP, and specific receiving location" required />
              </label>
              <label className="field">
                <span>Delivery contact</span>
                <input name="deliveryContact" placeholder="On-site receiver" />
              </label>
              <label className="field">
                <span>Delivery phone</span>
                <input name="deliveryPhone" type="tel" placeholder="Contact number for carrier" />
              </label>
              <label className="field span-two">
                <span>Receiving hours / instructions</span>
                <input name="deliveryHours" placeholder="Gate, dock, access, appointment, or call-ahead instructions" />
              </label>
            </div>
          </section>

          <section className="form-section" id="approval">
            <div className="section-heading">
              <p className="eyebrow">04 / Approval & purchasing</p>
              <h2>Close the loop.</h2>
            </div>
            <div className="field-grid two">
              <label className="field">
                <span>Approver / supervisor</span>
                <input name="approverName" placeholder="Name of person approving spend" />
              </label>
              <label className="field">
                <span>PO / quote number</span>
                <input name="poNumber" placeholder="If already assigned" />
              </label>
              <label className="field span-two">
                <span>Substitution policy</span>
                <select name="substitutionPolicy" defaultValue="contact">
                  <option value="contact">Contact requester before any substitution</option>
                  <option value="equivalent">Approved equivalent is acceptable</option>
                  <option value="exact">Exact manufacturer and part number only</option>
                </select>
              </label>
              <label className="field span-two">
                <span>Order notes</span>
                <textarea name="notes" rows={4} placeholder="Budget limits, vendor quote details, special handling, certifications, freight, or other purchasing instructions" />
              </label>
            </div>
            <label className="check-row">
              <input type="checkbox" name="poRequired" />
              <span><strong>Purchase order required</strong>Check if the vendor must receive a PO before release.</span>
            </label>
            <label className="check-row confirmation">
              <input type="checkbox" name="confirmed" required />
              <span><strong>I reviewed the request for accuracy. <b>*</b></strong>Project coding, quantities, part numbers, delivery details, and requested timing are complete.</span>
            </label>
          </section>

          {notice && <div className="form-notice" role="alert">{notice}</div>}

          <footer className="form-actions">
            <div>
              <button type="button" className="text-button" onClick={saveDraft}>Save draft</button>
              <button type="button" className="text-button" onClick={() => window.print()}>Print</button>
            </div>
            <button type="submit" className="button primary submit-button" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit material request"}<span aria-hidden="true">→</span>
            </button>
          </footer>
        </form>
      </div>

      <footer className="page-footer">
        <span>3D Technology Services, Inc.</span>
        <span>Purchasing & project operations</span>
      </footer>
    </main>
  );
}
