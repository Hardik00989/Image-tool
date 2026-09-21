"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import ResultCard from "@/components/pdf/ResultCard";
import {
  baseName,
  downloadBlob,
  loadPdfLib,
  pdfBlob,
  pdfErrorMessage,
  readFileBytes,
} from "@/lib/pdf";

// Random owner password so the permission restrictions can't be lifted
// by simply opening the file with the (known) open password
function randomPassword(length = 32) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%&*+-=?@";
  const values = crypto.getRandomValues(new Uint32Array(length));

  return Array.from(values, (value) => chars[value % chars.length]).join("");
}

// Rough strength hint: length plus the number of character types used
function passwordStrength(password: string) {
  if (!password) return null;

  const types = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password)
  ).length;

  if (password.length < 8 || (password.length < 10 && types < 2)) {
    return { label: "Weak", width: "w-1/3", color: "bg-red-500", text: "text-red-600" };
  }

  if (password.length >= 12 && types >= 3) {
    return { label: "Strong", width: "w-full", color: "bg-green-500", text: "text-green-700" };
  }

  return { label: "Fair", width: "w-2/3", color: "bg-amber-500", text: "text-amber-700" };
}

export default function ProtectPdf() {
  const passwordId = useId();
  const confirmId = useId();
  const ownerId = useId();

  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [alreadyEncrypted, setAlreadyEncrypted] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [allowEditing, setAllowEditing] = useState(true);
  const [compatibility, setCompatibility] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const outputName = file ? `${baseName(file.name)}-protected.pdf` : "protected.pdf";
  const strength = passwordStrength(password);

  const handleFiles = async ([selected]: File[]) => {
    setFile(selected);
    setBytes(null);
    setPageCount(0);
    setFileError(null);
    setAlreadyEncrypted(false);
    setFormError(null);
    setResult(null);

    try {
      const data = await readFileBytes(selected);
      const { PDFDocument } = await loadPdfLib();
      const pdf = await PDFDocument.load(data, { ignoreEncryption: true });

      if (pdf.isEncrypted) {
        setAlreadyEncrypted(true);
        return;
      }

      setPageCount(pdf.getPageCount());
      setBytes(data);
    } catch (loadError) {
      console.error(loadError);
      setFileError(pdfErrorMessage(loadError));
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!bytes) return;

    if (!password) {
      setFormError("Enter a password.");
      return;
    }

    if (password !== confirm) {
      setFormError("The passwords don't match.");
      return;
    }

    if (ownerPassword && ownerPassword === password) {
      setFormError("The owner password must be different from the open password, or the restrictions won't apply.");
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const { PDFDocument } = await loadPdfLib();
      const pdf = await PDFDocument.load(bytes);

      pdf.encrypt({
        userPassword: password,
        ownerPassword: ownerPassword || randomPassword(),
        algorithm: compatibility ? "AES-128" : "AES-256",
        permissions: {
          printing: allowPrinting ? "highResolution" : false,
          copying: allowCopying,
          modifying: allowEditing,
          annotating: allowEditing,
          fillingForms: allowEditing,
          documentAssembly: allowEditing,
          // Screen readers keep working even when copying is blocked
          contentAccessibility: true,
        },
      });

      const blob = pdfBlob(await pdf.save());

      setResult(blob);
      downloadBlob(blob, outputName);
    } catch (saveError) {
      console.error(saveError);
      alert(pdfErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setBytes(null);
    setPageCount(0);
    setFileError(null);
    setAlreadyEncrypted(false);
    setPassword("");
    setConfirm("");
    setOwnerPassword("");
    setFormError(null);
    setResult(null);
  };

  // Any change after saving means the downloaded file is out of date
  const changed = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setResult(null);
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="🔒"
          badge="Protect PDF"
          title="Password Protect PDF"
          highlight="Online for Free"
          description="Add a password to your PDF with AES-256 encryption and choose whether people can print, copy or edit it."
        />

        {!file && (
          <PdfDropzone onFiles={handleFiles} />
        )}

        {file && (
          <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            {/* File info */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">
                <p className="truncate font-semibold" title={file.name}>
                  {file.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {pageCount > 0
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · choose a password below`
                    : fileError || alreadyEncrypted
                      ? "Can't protect this file"
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

            {fileError && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {fileError}
              </p>
            )}

            {alreadyEncrypted && (
              <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                This PDF is already password-protected. Remove the current password first with the{" "}
                <Link href="/unlock-pdf" className="font-semibold underline">
                  Unlock PDF
                </Link>{" "}
                tool, then protect the unlocked file here.
              </p>
            )}

            {bytes && (
              <form onSubmit={handleSave} noValidate className="mt-8">

                {/* Passwords */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <div>
                    <label htmlFor={passwordId} className="text-sm font-semibold text-gray-700">
                      Password
                    </label>

                    <div className="relative mt-2">
                      <input
                        id={passwordId}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          changed(setPassword)(event.target.value);
                          setFormError(null);
                        }}
                        autoComplete="new-password"
                        className={`${inputClass} pr-20`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((shown) => !shown)}
                        aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    {strength && (
                      <div className="mt-2" aria-live="polite">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className={`h-full ${strength.width} ${strength.color} transition-all`} />
                        </div>

                        <p className={`mt-1 text-xs font-medium ${strength.text}`}>
                          {strength.label} password
                          {strength.label !== "Strong" && " · use 12+ characters with numbers and symbols"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor={confirmId} className="text-sm font-semibold text-gray-700">
                      Confirm password
                    </label>

                    <input
                      id={confirmId}
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(event) => {
                        changed(setConfirm)(event.target.value);
                        setFormError(null);
                      }}
                      autoComplete="new-password"
                      className={`${inputClass} mt-2`}
                    />

                    {confirm && password !== confirm && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        The passwords don&apos;t match yet.
                      </p>
                    )}
                  </div>

                </div>

                {/* Permissions */}

                <fieldset className="mt-8">
                  <legend className="text-sm font-semibold text-gray-700">
                    What can people do after opening the PDF?
                  </legend>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Allow printing", checked: allowPrinting, set: setAllowPrinting },
                      { label: "Allow copying text", checked: allowCopying, set: setAllowCopying },
                      { label: "Allow editing", checked: allowEditing, set: setAllowEditing },
                    ].map((option) => (
                      <label
                        key={option.label}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-blue-300"
                      >
                        <input
                          type="checkbox"
                          checked={option.checked}
                          onChange={(event) => changed(option.set)(event.target.checked)}
                          className="h-4 w-4 accent-blue-600"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    Most PDF readers respect these restrictions, but some software ignores them. The password to open the file is always required.
                  </p>
                </fieldset>

                <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={compatibility}
                    onChange={(event) => changed(setCompatibility)(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span>
                    Compatibility mode for older PDF readers (AES-128)
                    <span className="block text-xs text-gray-500">
                      Leave off to use stronger AES-256 encryption.
                    </span>
                  </span>
                </label>

                {/* Advanced: own owner password */}

                <details className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                    Advanced
                  </summary>

                  <div className="mt-4">
                    <label htmlFor={ownerId} className="text-sm font-semibold text-gray-700">
                      Owner password (optional)
                    </label>

                    <input
                      id={ownerId}
                      type={showPassword ? "text" : "password"}
                      value={ownerPassword}
                      onChange={(event) => {
                        changed(setOwnerPassword)(event.target.value);
                        setFormError(null);
                      }}
                      autoComplete="new-password"
                      className={`${inputClass} mt-2`}
                    />

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      The owner password gives full access and lifts the restrictions above. If you leave it empty, a strong random one is generated and not stored anywhere.
                    </p>
                  </div>
                </details>

                {formError && (
                  <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {formError}
                  </p>
                )}

                <p className="mt-6 text-sm text-gray-500">
                  Keep your password safe — it can&apos;t be recovered if you forget it.
                </p>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-4 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Encrypting..." : "Protect PDF"}
                </button>

              </form>
            )}

          </div>
        )}

        {result && (
          <ResultCard
            title="Your PDF is protected"
            fileName={outputName}
            size={result.size}
            note="The file now asks for your password when it's opened."
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Protect another PDF"
          />
        )}

      </div>

    </div>
  );
}
