"use client";

import { useId, useRef, useState, type FormEvent } from "react";
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

type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

// "checking"   → reading the file
// "plain"      → the PDF has no password at all
// "password"   → a password is needed to open it
// "unlocked"   → decrypted (with a password or only a permissions password)
type Status = "checking" | "plain" | "password" | "unlocked" | "error";

// Decrypts the PDF and saves a copy without encryption.
// Throws if the password is wrong.
async function decryptPdf(lib: PdfLib, bytes: Uint8Array, password: string) {
  const { PDFDocument, PDFName, PDFStream, PDFInvalidObject } = lib;

  const raw = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const encryptRef = raw.context.trailerInfo.Encrypt;

  const pdf = await PDFDocument.load(bytes, { password });

  // pdf-lib keeps the old encryption dictionary, cross-reference stream and
  // object streams around after decrypting. They would be copied into the new
  // file and make some readers think it's still encrypted, so drop them.
  // (Their content has already been read into the document.)
  for (const [ref, object] of pdf.context.enumerateIndirectObjects()) {
    let stale = encryptRef !== undefined && ref.toString() === encryptRef.toString();

    if (object instanceof PDFStream) {
      const type = object.dict.get(PDFName.of("Type"));
      stale ||= type === PDFName.of("XRef") || type === PDFName.of("ObjStm");
    }

    if (object instanceof PDFInvalidObject) {
      const data = new Uint8Array(object.sizeInBytes());
      object.copyBytesInto(data, 0);

      const text = Array.from(data.subarray(0, 400), (byte) => String.fromCharCode(byte)).join("");
      stale ||= /\/Type\s*\/XRef/.test(text);
    }

    if (stale) {
      pdf.context.delete(ref);
    }
  }

  const output = await pdf.save();

  // Double-check the result really opens without a password
  const check = await PDFDocument.load(output, { ignoreEncryption: true });

  if (check.isEncrypted) {
    throw new Error("The PDF is still encrypted after unlocking.");
  }

  return { output, pageCount: check.getPageCount() };
}

export default function UnlockPdf() {
  const passwordId = useId();
  const passwordInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [status, setStatus] = useState<Status>("checking");
  const [fileError, setFileError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // True when the file only had a permissions (owner) password
  const [restrictionsOnly, setRestrictionsOnly] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const outputName = file ? `${baseName(file.name)}-unlocked.pdf` : "unlocked.pdf";

  const handleFiles = async ([selected]: File[]) => {
    setFile(selected);
    setBytes(null);
    setStatus("checking");
    setFileError(null);
    setPassword("");
    setPasswordError(null);
    setRestrictionsOnly(false);
    setPageCount(0);
    setResult(null);

    try {
      const data = await readFileBytes(selected);
      const lib = await loadPdfLib();
      const pdf = await lib.PDFDocument.load(data, { ignoreEncryption: true });

      setBytes(data);

      if (!pdf.isEncrypted) {
        setPageCount(pdf.getPageCount());
        setStatus("plain");
        return;
      }

      // Files with only a permissions password open with an empty password
      try {
        const unlocked = await decryptPdf(lib, data, "");

        setPageCount(unlocked.pageCount);
        setRestrictionsOnly(true);
        setResult(pdfBlob(unlocked.output));
        setStatus("unlocked");
      } catch {
        setStatus("password");
        setTimeout(() => passwordInput.current?.focus(), 0);
      }
    } catch (loadError) {
      console.error(loadError);
      setFileError(pdfErrorMessage(loadError).replace(/ Unlock it first.*$/, ""));
      setStatus("error");
    }
  };

  const handleUnlock = async (event: FormEvent) => {
    event.preventDefault();

    if (!bytes) return;

    if (!password) {
      setPasswordError("Enter the password.");
      passwordInput.current?.focus();
      return;
    }

    setIsWorking(true);
    setPasswordError(null);

    try {
      const lib = await loadPdfLib();
      const unlocked = await decryptPdf(lib, bytes, password);
      const blob = pdfBlob(unlocked.output);

      setPageCount(unlocked.pageCount);
      setResult(blob);
      setStatus("unlocked");
      downloadBlob(blob, outputName);
    } catch (unlockError) {
      const message = unlockError instanceof Error ? unlockError.message : String(unlockError);

      if (/password/i.test(message)) {
        setPasswordError("That password isn't correct. Check it and try again.");
      } else {
        console.error(unlockError);
        setPasswordError("This PDF couldn't be unlocked. It may use an encryption type that isn't supported, or the file may be damaged.");
      }

      passwordInput.current?.select();
    } finally {
      setIsWorking(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setBytes(null);
    setStatus("checking");
    setFileError(null);
    setPassword("");
    setPasswordError(null);
    setRestrictionsOnly(false);
    setPageCount(0);
    setResult(null);
  };

  const statusText = {
    checking: "Checking the PDF...",
    plain: `${pageCount} ${pageCount === 1 ? "page" : "pages"} · not password-protected`,
    password: "Password-protected · enter the password to unlock it",
    unlocked: `${pageCount} ${pageCount === 1 ? "page" : "pages"} · unlocked`,
    error: "Can't unlock this file",
  }[status];

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="🔓"
          badge="Unlock PDF"
          title="Remove PDF Password"
          highlight="Online for Free"
          description="Enter the password you know once and save a copy of your PDF that opens without it — restrictions on printing and copying are removed too."
        />

        {!file && (
          <>
            <PdfDropzone onFiles={handleFiles} title="Upload a protected PDF" />

            <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-6 text-gray-500">
              Only unlock files you own or have permission to unlock. This tool can&apos;t crack or guess unknown passwords.
            </p>
          </>
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
                  {statusText}
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

            {status === "plain" && (
              <p className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                This PDF isn&apos;t password-protected, so there&apos;s nothing to unlock. It already opens without a password.
              </p>
            )}

            {status === "password" && (
              <form onSubmit={handleUnlock} noValidate className="mt-8">

                <label htmlFor={passwordId} className="text-sm font-semibold text-gray-700">
                  PDF password
                </label>

                <div className="relative mt-2">
                  <input
                    ref={passwordInput}
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordError(null);
                    }}
                    autoComplete="current-password"
                    aria-invalid={passwordError !== null}
                    aria-describedby={passwordError ? `${passwordId}-error` : undefined}
                    className={`w-full rounded-xl border bg-white px-4 py-3 pr-20 text-base outline-none transition focus:ring-2 ${
                      passwordError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {passwordError && (
                  <p id={`${passwordId}-error`} role="alert" className="mt-2 text-sm font-medium text-red-600">
                    {passwordError}
                  </p>
                )}

                <p className="mt-4 text-xs leading-5 text-gray-500">
                  Only unlock files you own or have permission to unlock. This tool can&apos;t crack or guess unknown passwords — you need the password that opens the file.
                </p>

                <button
                  type="submit"
                  disabled={isWorking}
                  className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isWorking ? "Unlocking..." : "Unlock PDF"}
                </button>

              </form>
            )}

            {status === "unlocked" && restrictionsOnly && (
              <p className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
                This PDF opens without a password but had restrictions (such as no printing or copying). They were removed without needing a password.
              </p>
            )}

          </div>
        )}

        {result && (
          <ResultCard
            title="Your PDF is unlocked"
            fileName={outputName}
            size={result.size}
            note="The new copy opens without a password and has no printing, copying or editing restrictions."
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Unlock another PDF"
          />
        )}

      </div>

    </div>
  );
}
