/// <reference types="vite/client" />

declare module 'qr.js/lib/QRCode' {
  class QRCode {
    constructor(typeNumber: number, errorCorrectLevel: number);
    addData(data: string): void;
    make(): void;
    modules: boolean[][];
  }
  export default QRCode;
}

declare module 'qr.js/lib/ErrorCorrectLevel' {
  interface ErrorCorrectLevelMap {
    L: number;
    M: number;
    Q: number;
    H: number;
    [key: string]: number;
  }
  const ErrorCorrectLevel: ErrorCorrectLevelMap;
  export default ErrorCorrectLevel;
}
