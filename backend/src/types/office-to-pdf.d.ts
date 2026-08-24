declare module 'office-to-pdf' {
  function convert(buffer: Buffer): Promise<Buffer>;
  export = convertToPdf;
}