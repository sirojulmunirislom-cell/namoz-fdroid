// Runs before the application bundle; external script preserves script-src 'self'.
(() => {
  let preference = "system";
  try {
    const saved = JSON.parse(localStorage.getItem("namoz.preferences") || "null");
    if (["light", "dark", "system"].includes(saved?.theme)) preference = saved.theme;
  } catch { /* Private browsing or invalid saved settings: follow the system. */ }
  const dark = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const background = dark ? "#111d19" : "#f3f5f2";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.backgroundColor = background;
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", background);
})();
