const { chromium } = require("playwright");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch();

  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.goto("http://127.0.0.1:8770/zh/index.html", { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".lux-home-harvest .lux-home-harvest-copy h2");

      const result = await page.evaluate(() => ({
        overflow: Math.max(...Array.from(document.querySelectorAll(".lux-home-editorial"), (section) => section.scrollWidth - section.clientWidth)),
        sections: document.querySelectorAll(".lux-home-editorial").length,
        facts: document.querySelectorAll(".lux-home-harvest-facts > div").length,
        services: document.querySelectorAll(".lux-home-gifting-service").length,
        harvestDisplay: getComputedStyle(document.querySelector(".lux-home-harvest .lux-home-editorial-frame")).display,
        harvestNumberBackplate: getComputedStyle(document.querySelector(".lux-home-harvest .lux-home-editorial-frame"), "::before").backgroundColor,
        title: document.querySelector(".lux-home-harvest-copy h2")?.textContent.trim(),
      }));

      assert(result.overflow <= 2, `zh editorial modules overflow by ${result.overflow}px at ${viewport.width}px`);
      assert(result.sections === 2, "zh home should have two editorial modules");
      assert(result.facts === 2, "zh harvest should keep two facts");
      assert(result.services === 3, "zh gifting should keep three services");
      assert(result.harvestDisplay === "grid", "zh harvest editorial grid is missing");
      if (viewport.width >= 900) {
        assert(result.harvestNumberBackplate === "rgb(16, 16, 16)", `zh harvest number backplate is missing: ${result.harvestNumberBackplate}`);
      }
      assert(result.title, "zh shared harvest title did not render");
      await page.close();
  }

  const englishPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await englishPage.goto("http://127.0.0.1:8770/en/index.html", { waitUntil: "domcontentloaded" });
  assert(await englishPage.locator('[data-reader-open="en-harvest"]').count() === 1, "en legacy harvest module is missing");
  assert(await englishPage.getByText("Concierge & Gifting", { exact: true }).count() === 1, "en legacy gifting module is missing");
  assert(await englishPage.locator(".lux-home-editorial").count() === 0, "en home should keep its restored legacy layout");
  await englishPage.close();

  await browser.close();
  console.log("home editorial verification passed");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
