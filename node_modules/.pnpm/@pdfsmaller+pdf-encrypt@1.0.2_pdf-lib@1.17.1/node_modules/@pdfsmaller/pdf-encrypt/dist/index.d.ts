export declare function encryptPDF(
  pdfBytes: Uint8Array,
  userPassword: string,
  options?: {
    ownerPassword?: string;
    algorithm?: 'AES-256' | 'RC4';
    allowPrinting?: boolean;
    allowModifying?: boolean;
    allowCopying?: boolean;
    allowAnnotating?: boolean;
    allowFillingForms?: boolean;
    allowExtraction?: boolean;
    allowAssembly?: boolean;
    allowHighQualityPrint?: boolean;
  }
): Promise<Uint8Array>;

export declare function md5(data: Uint8Array | string): Uint8Array;
export declare class RC4 {
  constructor(key: Uint8Array);
  process(data: Uint8Array): Uint8Array;
}
export declare function hexToBytes(hex: string): Uint8Array;
export declare function bytesToHex(bytes: Uint8Array): string;

export declare function sha256(data: Uint8Array): Promise<Uint8Array>;
export declare function sha384(data: Uint8Array): Promise<Uint8Array>;
export declare function sha512(data: Uint8Array): Promise<Uint8Array>;
export declare function aes256CbcEncrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array>;
export declare function aes256CbcEncryptNoPad(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array>;
export declare function aes256EcbEncryptBlock(block: Uint8Array, key: Uint8Array): Promise<Uint8Array>;
export declare function computeHash2B(password: Uint8Array, salt: Uint8Array, userKey: Uint8Array): Promise<Uint8Array>;
export declare function concat(...arrays: Uint8Array[]): Uint8Array;
