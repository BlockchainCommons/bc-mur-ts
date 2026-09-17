declare module "gifenc" {
  export interface GIFEncoderInstance {
    reset(): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    readonly buffer: ArrayBuffer;
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        transparent?: boolean;
        transparentIndex?: number;
        delay?: number;
        palette?: number[][];
        repeat?: number;
        colorDepth?: number;
        dispose?: number;
        first?: boolean;
      },
    ): void;
  }

  export function GIFEncoder(opt?: {
    initialCapacity?: number;
    auto?: boolean;
  }): GIFEncoderInstance;

  export default GIFEncoder;
}
