(() => {
  const lang = document.documentElement.lang?.startsWith("zh") ? "zh" : "en";
  const brand = window.LUXUREAT_BRAND_DATA?.[lang];
  if (!brand) return;

  document.querySelectorAll("[data-brand-field]").forEach((node) => {
    const value = brand[node.dataset.brandField];
    if (value) node.textContent = value;
  });
  document.querySelectorAll("a[href^='mailto:china@luxureat.com']").forEach((node) => {
    node.href = `mailto:${brand.email}`;
    node.lastChild.textContent = brand.email;
  });
  document.querySelectorAll("a[href^='tel:+8615721452475']").forEach((node) => {
    node.href = `tel:${brand.phone.replace(/\s/g, "")}`;
    node.lastChild.textContent = brand.phone;
  });
})();
