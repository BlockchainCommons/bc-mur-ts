/**
 * Renders one UR as a PNG.
 *
 *   bun examples/single-png.ts > single.png
 */
import { renderUrQr } from "@blockchaincommons/multipart-ur";

const image = renderUrQr("ur:bytes/hdcxdwinvezm", { size: 256, correction: "medium" });
process.stdout.write(image.toPng());
