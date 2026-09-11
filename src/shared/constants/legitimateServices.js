/**
 * Centralised list of legitimate services that own port 80/443.
 * Single source of truth — server.js and manager.js import from here.
 *
 * LEGITIMATE_SERVICES_LINUX: services that may occupy port 443 on Linux/macOS.
 * LEGITIMATE_SERVICES_WIN:   services that may occupy port 443 on Windows.
 * LEGITIMATE_SERVICES_ALL:   union of both — used when the caller is
 *                            cross-platform (e.g. server.js killPort).
 *
 * To add a new legitimate service: add it to the appropriate platform list(s)
 * below; LEGITIMATE_SERVICES_ALL is derived automatically.
 */

const LEGITIMATE_SERVICES_LINUX = [
  "nginx",
  "caddy",
  "apache2",
  "httpd",
  "haproxy",
  "traefik",
  "lighttpd",
];

const LEGITIMATE_SERVICES_WIN = [
  "nginx",
  "caddy",
  "apache",
  "httpd",
  "haproxy",
  "traefik",
  "w3svc",
  "iisexpress",
];

// Union — deduplicated, sorted for stable comparison
const LEGITIMATE_SERVICES_ALL = [
  ...new Set([...LEGITIMATE_SERVICES_LINUX, ...LEGITIMATE_SERVICES_WIN]),
];

module.exports = {
  LEGITIMATE_SERVICES_LINUX,
  LEGITIMATE_SERVICES_WIN,
  LEGITIMATE_SERVICES_ALL,
};
