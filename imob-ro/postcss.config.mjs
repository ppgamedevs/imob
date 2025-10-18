const config = {
  // When running unit tests we avoid loading Tailwind/PostCSS plugins here to prevent
  // toolchains (vite/vitest) from failing in test environments. For builds, this can
  // be replaced with the real plugin list.
  plugins: [],
};

export default config;
