"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { PDFDocument, PDFField } from "@cantoo/pdf-lib";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import ResultCard from "@/components/pdf/ResultCard";
import { usePdfPreviews } from "@/components/pdf/usePdfPreviews";
import {
  baseName,
  downloadBlob,
  loadPdfLib,
  pdfBlob,
  pdfErrorMessage,
  readFileBytes,
} from "@/lib/pdf";

type Value = string | boolean | string[];

type FieldInfo = {
  name: string;
  label: string;
  readOnly: boolean;
  // First page (0-based) the field appears on, or -1 if unknown
  page: number;
} & (
  | { kind: "text"; multiline: boolean; maxLength?: number }
  | { kind: "checkbox" }
  | { kind: "radio"; options: string[] }
  | { kind: "dropdown"; options: string[]; editable: boolean }
  | { kind: "list"; options: string[]; multiple: boolean }
);

type FormInfo = {
  fields: FieldInfo[];
  values: Record<string, Value>;
  // Buttons and signature fields can't be filled here
  skipped: number;
};

// Extra characters the standard PDF fonts (WinAnsi encoding) can draw
const WIN_ANSI_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

function canDrawText(text: string) {
  return [...text].every((char) => {
    const code = char.codePointAt(0) ?? 0;

    return (
      char === "\n" ||
      char === "\r" ||
      (code >= 32 && code <= 126) ||
      (code >= 160 && code <= 255) ||
      WIN_ANSI_EXTRAS.includes(char)
    );
  });
}

// "form1[0].page1[0].full_name[0]" -> "Full name", "dateOfBirth" -> "Date of birth"
function prettifyName(name: string) {
  const words = (name.split(".").pop() ?? name)
    .replace(/\[\d+\]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // Keep short acronyms like ID or ZIP
    .map((word) =>
      word.toLowerCase() === "id"
        ? "ID"
        : word.length <= 3 && word === word.toUpperCase()
          ? word
          : word.toLowerCase()
    );

  const text = words.join(" ");

  return text ? text[0].toUpperCase() + text.slice(1) : name;
}

const sameValue = (a: Value, b: Value) => JSON.stringify(a) === JSON.stringify(b);

// Reads every field of the form with its type, label and current value
async function readForm(doc: PDFDocument): Promise<FormInfo> {
  const lib = await loadPdfLib();
  const form = doc.getForm();

  // Which page each widget (the visible part of a field) sits on
  const pageOfAnnotation = new Map<string, number>();

  doc.getPages().forEach((page, index) => {
    page.node.Annots()?.asArray().forEach((ref) => {
      pageOfAnnotation.set(ref.toString(), index);
    });
  });

  const pageOf = (field: PDFField) => {
    for (const widget of field.acroField.getWidgets()) {
      const ref = doc.context.getObjectRef(widget.dict);
      const page = ref ? pageOfAnnotation.get(ref.toString()) : undefined;

      if (page !== undefined) return page;
    }

    return -1;
  };

  // Use the form's own tooltip text (/TU) as the label when it has one
  const labelOf = (field: PDFField) => {
    const tooltip = field.acroField.dict.lookup(lib.PDFName.of("TU"));

    if (tooltip instanceof lib.PDFString || tooltip instanceof lib.PDFHexString) {
      const text = tooltip.decodeText().trim();

      if (text) return text;
    }

    return prettifyName(field.getName());
  };

  const fields: FieldInfo[] = [];
  const values: Record<string, Value> = {};
  let skipped = 0;

  for (const field of form.getFields()) {
    const base = {
      name: field.getName(),
      label: labelOf(field),
      readOnly: field.isReadOnly(),
      page: pageOf(field),
    };

    if (field instanceof lib.PDFTextField) {
      fields.push({
        ...base,
        kind: "text",
        multiline: field.isMultiline(),
        maxLength: field.getMaxLength(),
      });

      values[base.name] = field.getText() ?? "";
    } else if (field instanceof lib.PDFCheckBox) {
      fields.push({ ...base, kind: "checkbox" });
      values[base.name] = field.isChecked();
    } else if (field instanceof lib.PDFRadioGroup) {
      fields.push({ ...base, kind: "radio", options: field.getOptions() });
      values[base.name] = field.getSelected() ?? "";
    } else if (field instanceof lib.PDFDropdown && !field.isMultiselect()) {
      fields.push({
        ...base,
        kind: "dropdown",
        options: field.getOptions(),
        editable: field.isEditable(),
      });

      values[base.name] = field.getSelected()[0] ?? "";
    } else if (field instanceof lib.PDFDropdown || field instanceof lib.PDFOptionList) {
      fields.push({
        ...base,
        kind: "list",
        options: field.getOptions(),
        multiple: field.isMultiselect(),
      });

      values[base.name] = field.getSelected();
    } else {
      skipped++;
    }
  }

  return { fields, values, skipped };
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldInfo;
  value: Value;
  onChange: (value: Value) => void;
}) {
  const id = useId();

  const inputClass =
    "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500";

  const label = (
    <>
      {field.label}
      {field.readOnly && (
        <span className="ml-2 text-xs font-normal text-gray-500">(read-only)</span>
      )}
    </>
  );

  if (field.kind === "checkbox") {
    return (
      <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
        <input
          type="checkbox"
          checked={value === true}
          disabled={field.readOnly}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 rounded accent-blue-600"
        />
        <span>{label}</span>
      </label>
    );
  }

  if (field.kind === "radio" || (field.kind === "list" && field.multiple)) {
    const multiple = field.kind === "list";
    const selected = Array.isArray(value) ? value : [String(value)];

    return (
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700">{label}</legend>

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {field.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type={multiple ? "checkbox" : "radio"}
                name={id}
                checked={selected.includes(option)}
                disabled={field.readOnly}
                onChange={(event) =>
                  onChange(
                    multiple
                      ? event.target.checked
                        ? [...selected, option]
                        : selected.filter((item) => item !== option)
                      : option
                  )
                }
                className="h-4 w-4 accent-blue-600"
              />
              {option}
            </label>
          ))}

          {!multiple && value !== "" && !field.readOnly && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </fieldset>
    );
  }

  if (field.kind === "dropdown" || field.kind === "list") {
    const current = Array.isArray(value) ? (value[0] ?? "") : String(value);

    // A combo box that allows typing its own answer
    if (field.kind === "dropdown" && field.editable) {
      return (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
          <input
            type="text"
            list={`${id}-options`}
            value={current}
            disabled={field.readOnly}
            onChange={(event) => onChange(event.target.value)}
            className={inputClass}
          />
          <datalist id={`${id}-options`}>
            {field.options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
      );
    }

    return (
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        <select
          value={current}
          disabled={field.readOnly}
          onChange={(event) =>
            onChange(field.kind === "list"
              ? (event.target.value ? [event.target.value] : [])
              : event.target.value)
          }
          className={inputClass}
        >
          <option value="">— Not selected —</option>

          {/* Keep a current value that isn't one of the listed options */}
          {current && !field.options.includes(current) && (
            <option value={current}>{current}</option>
          )}

          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const text = String(value);

  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}

      {field.multiline ? (
        <textarea
          value={text}
          rows={4}
          maxLength={field.maxLength}
          disabled={field.readOnly}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          type="text"
          value={text}
          maxLength={field.maxLength}
          disabled={field.readOnly}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}

      {!canDrawText(text) && (
        <span className="mt-1 block text-xs font-normal text-red-600">
          The standard PDF font can only show Latin letters, numbers and
          common symbols.
        </span>
      )}
    </label>
  );
}

export default function PdfForms() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  const [form, setForm] = useState<FormInfo | null>(null);
  const [values, setValues] = useState<Record<string, Value>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [flatten, setFlatten] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const { previews, pageCount, loading, error } = usePdfPreviews(bytes);

  const outputName = file ? `${baseName(file.name)}-filled.pdf` : "filled.pdf";

  const handleFiles = async ([selected]: File[]) => {
    setFile(selected);
    setForm(null);
    setValues({});
    setLoadError(null);
    setResult(null);

    const fileBytes = await readFileBytes(selected);
    setBytes(fileBytes);

    try {
      const { PDFDocument } = await loadPdfLib();
      const info = await readForm(await PDFDocument.load(fileBytes));

      setForm(info);
      setValues(info.values);
    } catch (readError) {
      console.error(readError);
      setLoadError(pdfErrorMessage(readError));
    }
  };

  const setValue = (name: string, value: Value) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setResult(null);
  };

  const hasBadText =
    form?.fields.some((field) => field.kind === "text" && !canDrawText(String(values[field.name]))) ??
    false;

  const handleSave = async () => {
    if (!bytes || !form || hasBadText) return;

    setIsSaving(true);

    try {
      const lib = await loadPdfLib();
      const doc = await lib.PDFDocument.load(bytes);
      const pdfForm = doc.getForm();

      for (const info of form.fields) {
        const value = values[info.name];

        // Only touch fields that changed, so the rest keep their original look
        if (info.readOnly || sameValue(value, form.values[info.name])) continue;

        const field = pdfForm.getField(info.name);

        if (field instanceof lib.PDFTextField) {
          field.setText(String(value) || undefined);
        } else if (field instanceof lib.PDFCheckBox) {
          if (value === true) field.check();
          else field.uncheck();
        } else if (field instanceof lib.PDFRadioGroup || field instanceof lib.PDFDropdown) {
          const selected = Array.isArray(value) ? value : value ? [String(value)] : [];

          if (selected.length === 0) field.clear();
          else if (field instanceof lib.PDFRadioGroup) field.select(selected[0]);
          else field.select(selected.length === 1 ? selected[0] : selected);
        } else if (field instanceof lib.PDFOptionList) {
          const selected = Array.isArray(value) ? value : value ? [String(value)] : [];

          if (selected.length === 0) field.clear();
          else field.select(selected);
        }
      }

      if (flatten) {
        pdfForm.flatten();
      }

      const blob = pdfBlob(await doc.save());

      setResult(blob);
      downloadBlob(blob, outputName);
    } catch (saveError) {
      console.error(saveError);

      const message = saveError instanceof Error ? saveError.message : "";

      alert(
        /WinAnsi|encode/i.test(message)
          ? "Some text uses characters the standard PDF font can't show. Use Latin letters, numbers and common symbols."
          : pdfErrorMessage(saveError)
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setBytes(null);
    setForm(null);
    setValues({});
    setLoadError(null);
    setResult(null);
  };

  const shownError = error ?? loadError;

  // Group the fields by the page they are on
  const groups: { page: number; fields: FieldInfo[] }[] = [];

  for (const field of form?.fields ?? []) {
    let group = groups.find((item) => item.page === field.page);

    if (!group) {
      group = { page: field.page, fields: [] };
      groups.push(group);
    }

    group.fields.push(field);
  }

  groups.sort((a, b) => (a.page < 0 ? 1 : b.page < 0 ? -1 : a.page - b.page));

  const fieldCount = form?.fields.length ?? 0;

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="☑"
          badge="PDF Forms"
          title="Fill PDF Forms"
          highlight="Online for Free"
          description="Type into the fields of a fillable PDF form, tick boxes and pick options, then download the completed form."
        />

        {!file && (
          <PdfDropzone onFiles={handleFiles} />
        )}

        {file && (
          <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            {/* Toolbar */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">
                <p className="truncate font-semibold" title={file.name}>
                  {file.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {shownError
                    ? "Could not read this PDF"
                    : form && pageCount > 0
                      ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · ${fieldCount} fillable ${fieldCount === 1 ? "field" : "fields"}`
                      : "Reading PDF..."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="self-start rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 sm:self-auto"
              >
                Remove PDF
              </button>

            </div>

            {shownError && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {shownError}
              </p>
            )}

            {!shownError && (
              <div className="mt-8 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">

                {/* Page thumbnails */}

                <div className="grid grid-cols-3 content-start gap-3 sm:grid-cols-4 lg:max-h-[75vh] lg:grid-cols-1 lg:overflow-y-auto lg:pr-1">
                  {previews.map((preview, index) => (
                    <div
                      key={preview.url}
                      className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-2"
                    >
                      <img
                        src={preview.url}
                        alt={`Page ${index + 1}`}
                        className="max-h-56 w-full object-contain shadow-sm"
                      />

                      <span className="mt-2 text-xs font-medium text-gray-600">
                        Page {index + 1}
                      </span>
                    </div>
                  ))}

                  {loading && (
                    <p className="col-span-full text-sm text-gray-500">
                      Loading pages...
                    </p>
                  )}
                </div>

                {/* Fields */}

                <div className="min-w-0">

                  {!form && (
                    <p className="text-sm text-gray-500">
                      Looking for form fields...
                    </p>
                  )}

                  {form && fieldCount === 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                      <p className="font-semibold text-amber-900">
                        This PDF has no fillable form fields
                      </p>

                      <p className="mt-2 text-sm leading-6 text-amber-900">
                        It may be a scanned or flat form, where the boxes are just
                        printed lines. You can still type on it: use Edit PDF to add
                        text anywhere on the page.
                        {form.skipped > 0 && ` (It has ${form.skipped} button or signature field${form.skipped === 1 ? "" : "s"}, which can't be filled here.)`}
                      </p>

                      <Link
                        href="/edit-pdf"
                        className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Add text with Edit PDF
                      </Link>
                    </div>
                  )}

                  {form && fieldCount > 0 && (
                    <div className="space-y-8">

                      {groups.map((group) => (
                        <section key={group.page}>

                          <h2 className="border-b border-gray-200 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                            {group.page >= 0 ? `Page ${group.page + 1}` : "Other fields"}
                          </h2>

                          <div className="mt-4 grid gap-5 sm:grid-cols-2">
                            {group.fields.map((field) => (
                              <div
                                key={field.name}
                                className={
                                  (field.kind === "text" && field.multiline) ||
                                  field.kind === "radio" ||
                                  field.kind === "list"
                                    ? "sm:col-span-2"
                                    : ""
                                }
                              >
                                <FieldControl
                                  field={field}
                                  value={values[field.name]}
                                  onChange={(value) => setValue(field.name, value)}
                                />
                              </div>
                            ))}
                          </div>

                        </section>
                      ))}

                      {form.skipped > 0 && (
                        <p className="text-sm text-gray-500">
                          {form.skipped} button or signature {form.skipped === 1 ? "field is" : "fields are"} not
                          shown, as {form.skipped === 1 ? "it" : "they"} can&apos;t be filled here.
                        </p>
                      )}

                      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={flatten}
                          onChange={(event) => {
                            setFlatten(event.target.checked);
                            setResult(null);
                          }}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600"
                        />
                        <span>
                          <span className="font-semibold">Flatten form (make fields non-editable)</span>
                          <span className="mt-1 block text-gray-500">
                            The answers become part of the page, so nobody can change
                            them and every viewer shows them the same way.
                          </span>
                        </span>
                      </label>

                    </div>
                  )}

                </div>

              </div>
            )}

            {form && fieldCount > 0 && !shownError && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || hasBadText}
                className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save filled PDF"}
              </button>
            )}

          </div>
        )}

        {result && (
          <ResultCard
            fileName={outputName}
            size={result.size}
            note={flatten ? "The form was flattened: the answers can no longer be edited." : undefined}
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Fill another form"
          />
        )}

      </div>

    </div>
  );
}
