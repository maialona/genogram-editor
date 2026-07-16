import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://127.0.0.1:5173/";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1400,900"],
    defaultViewport: { width: 1400, height: 900 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  const logs = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 800));

  // Prefer empty-state button
  const loaded = await page.evaluate(() => {
    const empty = document.querySelector(".canvas-empty-primary");
    if (empty) {
      empty.click();
      return "empty-btn";
    }
    const sample = document.querySelector('button[aria-label="載入示範家系圖"]');
    if (sample) {
      sample.click();
      return "toolbar-btn";
    }
    return "none";
  });
  console.log("load method:", loaded);

  // Accept confirm if any
  page.on("dialog", async (d) => {
    await d.accept();
  });

  // If toolbar path needed confirm, click again after dialog listener
  if (loaded === "none" || loaded === "toolbar-btn") {
    await page.evaluate(() => {
      const sample = document.querySelector('button[aria-label="載入示範家系圖"]');
      sample?.click();
    });
  }

  await new Promise((r) => setTimeout(r, 1000));

  const debug = await page.evaluate(() => {
    return {
      persons: document.querySelectorAll(".person-node").length,
      empty: !!document.querySelector(".canvas-empty"),
      toast: document.querySelector(".toast")?.textContent ?? null,
      bodyText: document.body.innerText.slice(0, 200),
    };
  });
  console.log("debug:", debug);

  if (debug.persons === 0) {
    // Try drag a male from library - too complex; inject via localStorage document
    await page.evaluate(() => {
      const doc = {
        title: "test",
        persons: [
          {
            id: "p1",
            gender: "male",
            name: "Test",
            x: 200,
            y: 200,
            age: null,
            birthYear: null,
            deathYear: null,
            deceased: false,
            indexPerson: false,
            medicalConditions: [],
            notes: "",
            rotation: 0,
            sexuality: "none",
            transgender: "none",
            specialType: "none",
            culturalMark: "none",
          },
        ],
        relationships: [],
        annotations: [],
        viewport: { scale: 1, offsetX: 0, offsetY: 0 },
        updatedAt: Date.now(),
      };
      localStorage.setItem(
        "genogram-editor-document-v1",
        JSON.stringify(doc)
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 800));
  }

  const before = await page.evaluate(
    () => document.querySelectorAll(".person-node").length
  );
  console.log("persons before:", before);
  if (before === 0) {
    console.log("FAIL: no persons to test");
    console.log(logs.slice(-30));
    await browser.close();
    process.exit(1);
  }

  const box = await page.evaluate(() => {
    const g = document.querySelector(".person-node");
    const r = g.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  });
  console.log("person box:", box);

  await page.mouse.click(box.x, box.y);
  await new Promise((r) => setTimeout(r, 250));

  const afterClick = await page.evaluate(() => ({
    rings: document.querySelectorAll(".selection-layer").length,
    active: document.activeElement
      ? `${document.activeElement.tagName}.${document.activeElement.className}`
      : null,
    deleteBtn: !!document.querySelector(".prop-delete-btn"),
  }));
  console.log("after click:", afterClick);

  await page.keyboard.press("Delete");
  await new Promise((r) => setTimeout(r, 400));

  let after = await page.evaluate(
    () => document.querySelectorAll(".person-node").length
  );
  console.log("after Delete key:", after);

  if (after >= before) {
    await page.mouse.click(box.x, box.y);
    await new Promise((r) => setTimeout(r, 200));
    await page.keyboard.press("Backspace");
    await new Promise((r) => setTimeout(r, 400));
    after = await page.evaluate(
      () => document.querySelectorAll(".person-node").length
    );
    console.log("after Backspace key:", after);
  }

  if (after >= before) {
    // Focus canvas then delete
    await page.click(".canvas-container");
    await page.mouse.click(box.x, box.y);
    await new Promise((r) => setTimeout(r, 200));
    await page.keyboard.down("Delete");
    await page.keyboard.up("Delete");
    await new Promise((r) => setTimeout(r, 400));
    after = await page.evaluate(
      () => document.querySelectorAll(".person-node").length
    );
    console.log("after focus+Delete:", after);
  }

  if (after >= before) {
    const hasBtn = await page.$(".prop-delete-btn");
    if (hasBtn) {
      await hasBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      after = await page.evaluate(
        () => document.querySelectorAll(".person-node").length
      );
      console.log("after delete button:", after);
    }
  }

  // Dispatch synthetic keydown on window to test handler
  if (after >= before) {
    await page.mouse.click(box.x, box.y);
    await new Promise((r) => setTimeout(r, 200));
    const synth = await page.evaluate(() => {
      const rings = document.querySelectorAll(".selection-layer").length;
      const ev = new KeyboardEvent("keydown", {
        key: "Delete",
        code: "Delete",
        bubbles: true,
        cancelable: true,
      });
      const r1 = window.dispatchEvent(ev);
      return {
        rings,
        dispatchResult: r1,
        persons: document.querySelectorAll(".person-node").length,
        toast: document.querySelector(".toast")?.textContent ?? null,
      };
    });
    console.log("synthetic window keydown:", synth);
    after = synth.persons;
  }

  if (logs.length) {
    console.log("--- console ---");
    logs.forEach((l) => console.log(l));
  }

  await browser.close();
  if (after < before) {
    console.log("PASS");
    process.exit(0);
  }
  console.log("FAIL");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
