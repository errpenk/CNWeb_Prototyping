(() => {
  const lang = document.documentElement.lang?.startsWith("zh") ? "zh" : "en";
  const brand = window.LUXUREAT_BRAND_DATA?.[lang];
  if (!brand) return;

  document.querySelectorAll("[data-brand-field]").forEach((node) => {
    const value = brand[node.dataset.brandField];
    if (value) node.textContent = value;
  });
})();
