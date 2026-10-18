// Test only: pdfjs-dist ships no types for its worker script; the tests only hand it to pdf.js.
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}
