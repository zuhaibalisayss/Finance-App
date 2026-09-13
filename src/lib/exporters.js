import { jsPDF } from "jspdf";

// Sanitize text fields to prevent Excel formula injection.
export function sanitizeForCSV(value) {
  let v = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  // escape quotes
  return `"${v.replace(/"/g, '""')}"`;
}

export function toCSV(rows, headers) {
  const head = headers.map((h) => sanitizeForCSV(h.label)).join(",");
  const body = rows.map((r) => headers.map((h) => sanitizeForCSV(h.get(r))).join(",")).join("\n");
  return head + "\n" + body;
}

export function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJSON(filename, obj) {
  downloadFile(filename, JSON.stringify(obj, null, 2), "application/json");
}

// Real offline SHA-256 of a string via the browser SubtleCrypto API.
// Used to authenticate backup integrity without any network call.
export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Build a professional PDF report.
export function buildPDFReport({ title, period, currency, sections, generatedAt }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 50;
  doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(title, 40, y);
  y += 22;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Reporting Period: ${period}`, 40, y); y += 14;
  doc.text(`Currency: ${currency}`, 40, y); y += 14;
  doc.text(`Generated: ${generatedAt || new Date().toLocaleString()}`, 40, y); y += 8;
  doc.setDrawColor(200); doc.line(40, y, W - 40, y); y += 20;
  doc.setTextColor(0);

  sections.forEach((sec) => {
    if (sec.heading) {
      doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.text(sec.heading, 40, y); y += 16;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    }
    if (sec.rows) {
      sec.rows.forEach((r) => {
        if (y > 780) { doc.addPage(); y = 50; }
        doc.text(String(r.label || ""), 50, y);
        doc.text(String(r.value ?? ""), W - 50, y, { align: "right" });
        y += 14;
      });
      y += 6;
    }
    if (sec.table) {
      const { headers, rows } = sec.table;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const colW = (W - 80) / headers.length;
      headers.forEach((h, i) => doc.text(String(h), 40 + i * colW, y));
      y += 12;
      doc.setFont("helvetica", "normal");
      rows.forEach((row) => {
        if (y > 780) { doc.addPage(); y = 50; }
        headers.forEach((_, i) => doc.text(String(row[i] ?? ""), 40 + i * colW, y));
        y += 12;
      });
      y += 8;
    }
    if (sec.disclaimer) {
      doc.setFontSize(8); doc.setTextColor(120);
      doc.text(sec.disclaimer, 40, y, { maxWidth: W - 80 });
      doc.setTextColor(0);
      y += 24;
    }
  });

  // disclaimer footer
  doc.setFontSize(8); doc.setTextColor(120);
  doc.text("Generated locally by Offline Wealth Manager. Market valuations are manually or locally-imported — not live.", 40, 820, { maxWidth: W - 80 });
  return doc;
}

export function downloadPDF(filename, doc) {
  doc.save(filename);
}