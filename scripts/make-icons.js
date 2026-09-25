/**
 * Render build/icon.svg into the raster icons electron-builder needs.
 *
 * Produces build/icon.ico (Windows, multi-resolution) and build/icon.png
 * (512x512, which electron-builder converts to .icns for macOS and uses
 * directly on Linux).
 *
 * Why Electron rather than an image library: rasterizing an SVG needs a real
 * renderer, and this project already ships one. Adding sharp or svg2png for a
 * file that changes once a year would work against the "keep the dependency
 * list small" rule. The page is loaded with show:false, so nothing appears on
 * screen.
 *
 * Run it after editing build/icon.svg:
 *
 *   npm run icons
 */

const fs = require("fs");
const path = require("path");
const { app, BrowserWindow } = require("electron");

const ROOT = path.join(__dirname, "..");
const BUILD = path.join(ROOT, "build");
const SVG = path.join(BUILD, "icon.svg");

/**
 * Sizes packed into the .ico. Windows picks per context: 16 in title bars,
 * 32 in the taskbar, 48 in Explorer, 256 for large tiles and the installer.
 * The in-between sizes keep scaled displays from resampling a distant one.
 */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

/** The single PNG macOS and Linux builds are generated from. */
const PNG_SIZE = 512;

/**
 * Pack PNGs into an .ico.
 *
 * An .ico is a 6-byte header, then one 16-byte directory entry per image,
 * then the image payloads. Since Vista those payloads may be PNGs as-is,
 * which is what Chromium just produced, so there is no bitmap re-encoding to
 * do here. A side of 256 is written as 0 because the field is one byte.
 */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach(({ size, buffer }, i) => {
    const at = i * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, at); // width
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1); // height
    directory.writeUInt8(0, at + 2); // palette size (0 = truecolour)
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(buffer.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += buffer.length;
  });

  return Buffer.concat([header, directory, ...images.map((i) => i.buffer)]);
}

/** Draw the SVG at each size and hand back base64 PNGs. */
async function render(win, svg, sizes) {
  return win.webContents.executeJavaScript(`(async () => {
    const svg = ${JSON.stringify(svg)};
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("the SVG could not be decoded"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
    const out = {};
    for (const size of ${JSON.stringify(sizes)}) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);
      out[size] = canvas.toDataURL("image/png").split(",")[1];
    }
    return out;
  })()`);
}

app.whenReady().then(async () => {
  try {
    if (!fs.existsSync(SVG)) throw new Error(`missing ${SVG}`);
    const svg = fs.readFileSync(SVG, "utf8");

    const win = new BrowserWindow({ show: false, width: 640, height: 640 });
    // A blank HTML document, so document.createElement makes HTML elements —
    // loading the SVG directly gives an XML document where it does not.
    await win.loadURL("data:text/html;charset=utf-8,<!doctype html><title>icons</title>");

    const sizes = [...new Set([...ICO_SIZES, PNG_SIZE])].sort((a, b) => a - b);
    const rendered = await render(win, svg, sizes);

    const decoded = Object.fromEntries(
      Object.entries(rendered).map(([size, b64]) => [size, Buffer.from(b64, "base64")]),
    );
    for (const size of sizes) {
      const buf = decoded[size];
      // Every PNG starts with the same 8-byte signature; a truncated or empty
      // render would otherwise be written out and only fail at packaging time.
      if (!buf || buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) {
        throw new Error(`the ${size}px render is not a PNG`);
      }
    }

    const ico = buildIco(ICO_SIZES.map((size) => ({ size, buffer: decoded[size] })));
    fs.writeFileSync(path.join(BUILD, "icon.ico"), ico);
    fs.writeFileSync(path.join(BUILD, "icon.png"), decoded[PNG_SIZE]);

    console.log(`build/icon.ico  ${ICO_SIZES.join(", ")}px  ${(ico.length / 1024).toFixed(1)} KB`);
    console.log(`build/icon.png  ${PNG_SIZE}px  ${(decoded[PNG_SIZE].length / 1024).toFixed(1)} KB`);
    app.exit(0);
  } catch (error) {
    console.error("Icon generation failed:", error.message);
    app.exit(1);
  }
});
