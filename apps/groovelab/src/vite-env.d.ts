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

// 🛡️ Enterprise Parity Engine: Compile-Time Build Signatures
declare const __CG_BUILD_HASH__: string;
declare const __CG_BUILD_TIMESTAMP__: number;
