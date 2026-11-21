// Joins a site-relative path to the configured base path (the site lives under
// /Saad-Shaikh-Analytics-Portfolio/ on GitHub Pages). Directory routes keep their trailing slash.
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  if (/^(https?:|mailto:|#)/.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

// Absolute URL for canonical links, Open Graph and structured data.
export function absoluteUrl(path = '/'): string {
  return new URL(url(path), import.meta.env.SITE).toString();
}

export function isCurrent(currentPath: string, navPath: string): boolean {
  const here = currentPath.replace(/\/+$/, '/') || '/';
  const target = url(navPath);
  if (navPath === '/') return here === target || here === `${target}index.html`;
  return here.startsWith(target);
}
