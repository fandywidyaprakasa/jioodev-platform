export interface NavItem {
  href: string;
  label: string;
  group?: string;
  exact?: boolean;
}

export function isNavItemActive(pathname: string, item: NavItem) {
  if (pathname === item.href) return true;
  if (item.exact) return false;
  if (item.href === "/" || item.href === "/app" || item.href === "/admin") {
    return false;
  }
  return pathname.startsWith(`${item.href}/`);
}
