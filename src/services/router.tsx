import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface RouteInfo {
  path: string;
  pathname: string;
  search: string;
  hash: string;
  params: {
    idSubBl?: number;
    [key: string]: any;
  };
}

interface RouterContextType {
  route: RouteInfo;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

const STORAGE_LAST_ROUTE = 'sipd_last_route_path';

/**
 * Normalizes any route string (supports hash, pathname, trailing slashes, variations)
 */
export function normalizePath(fullPath: string): {
  pathname: string;
  search: string;
  hash: string;
  params: RouteInfo['params'];
} {
  let raw = (fullPath || '').trim();

  // If path came from 404 redirect param (e.g. ?p=sub-kegiatan/123 or ?p=/dashboard)
  if (raw.includes('?p=') || raw.includes('&p=')) {
    try {
      const urlParams = new URLSearchParams(raw.includes('?') ? raw.split('?')[1] : raw);
      const redirectP = urlParams.get('p');
      if (redirectP) {
        raw = '/' + redirectP.replace(/^\/+/, '');
      }
    } catch {
      // ignore
    }
  }

  // Check if hash contains route (e.g. #/dashboard or #/sub-kegiatan/122054)
  let extractedHash = '';
  if (raw.includes('#')) {
    const parts = raw.split('#');
    extractedHash = parts[1] || '';
    // If the hash contains a slash-based path or keywords, prefer it
    if (
      extractedHash.startsWith('/') ||
      extractedHash.includes('sub') ||
      extractedHash.includes('dash') ||
      extractedHash.includes('dasbor')
    ) {
      raw = extractedHash;
    }
  }

  // Split search params
  const [pathOnly = '/', searchOnly = ''] = raw.split('?');
  let pathname = pathOnly;

  // Clean leading hash
  if (pathname.startsWith('#')) {
    pathname = pathname.substring(1);
  }

  // Ensure leading slash
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  // Remove trailing slashes (except root '/')
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '');
  }

  const params: RouteInfo['params'] = {};

  // Check query params if any
  if (searchOnly) {
    try {
      const sp = new URLSearchParams(searchOnly);
      const idParam =
        sp.get('idSubBl') || sp.get('id_sub_bl') || sp.get('id') || sp.get('subkegiatan');
      if (idParam && /^\d+$/.test(idParam)) {
        params.idSubBl = parseInt(idParam, 10);
      }
    } catch {
      // ignore
    }
  }

  // Normalize aliases: /dasbor -> /dashboard, /beranda -> /dashboard, /home -> /dashboard
  const lowerPath = pathname.toLowerCase();
  if (
    lowerPath === '/dasbor' ||
    lowerPath === '/dasbor/' ||
    lowerPath === '/beranda' ||
    lowerPath === '/home'
  ) {
    pathname = '/dashboard';
  }

  // Flexible regex to match sub-kegiatan in various URL formats:
  // e.g.:
  // /sub-kegiatan/122054
  // /subkegiatan/122054
  // /subkegiatan-122054
  // /sub-kegiatan-122054
  // /sub_kegiatan/122054
  // /sub_kegiatan-122054
  // /subkegiatan-123/
  const subRegex = /(?:^\/|\/)(?:sub[-_]?kegiatan)[/_\-]?(\d+)/i;
  const match = pathname.match(subRegex);
  if (match) {
    const parsedId = parseInt(match[1], 10);
    params.idSubBl = parsedId;
    pathname = `/sub-kegiatan/${parsedId}`;
  }

  return {
    pathname,
    search: searchOnly ? `?${searchOnly}` : '',
    hash: extractedHash ? `#${extractedHash}` : '',
    params,
  };
}

export function parsePath(fullPath: string): RouteInfo {
  const { pathname, search, hash, params } = normalizePath(fullPath);
  return {
    path: fullPath,
    pathname,
    search,
    hash,
    params,
  };
}

function getInitialLocation(): string {
  if (typeof window === 'undefined') return '/';

  // 1. Check if 404 query redirect exists (?p=...)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectP = searchParams.get('p');
    if (redirectP) {
      return '/' + redirectP.replace(/^\/+/, '');
    }
  } catch {
    // ignore
  }

  // 2. Check hash route: #/dashboard or #/sub-kegiatan/122054 or #/subkegiatan-123
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
    if (
      cleanHash.startsWith('/') ||
      cleanHash.includes('sub') ||
      cleanHash.includes('dash') ||
      cleanHash.includes('dasbor')
    ) {
      return cleanHash;
    }
  }

  // 3. Check pathname: /dashboard, /dasbor, /subkegiatan-123/, /sub-kegiatan/122054
  const pathname = window.location.pathname;
  if (pathname && pathname !== '/' && pathname !== '/index.html') {
    return pathname + window.location.search;
  }

  // 4. Default to root
  return '/';
}

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return getInitialLocation();
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const detected = getInitialLocation();
      setCurrentPath(detected);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const navigate = (to: string, options?: { replace?: boolean }) => {
    const normalized = normalizePath(to);
    const targetPath = normalized.pathname + normalized.search;
    const targetUrl = `#${targetPath}`;

    if (options?.replace) {
      window.history.replaceState({}, '', targetUrl);
    } else {
      window.history.pushState({}, '', targetUrl);
    }

    setCurrentPath(targetPath);

    try {
      sessionStorage.setItem(STORAGE_LAST_ROUTE, targetPath);
    } catch {
      // ignore
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const route = parsePath(currentPath);

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: ReactNode;
  className?: string;
  target?: string;
}

export const Link: React.FC<LinkProps> = ({
  to,
  children,
  className = '',
  target,
  onClick,
  ...props
}) => {
  const { navigate } = useRouter();

  // Normalize path and generate safe hash-based URL for right-click / "Open in new tab"
  const normalized = normalizePath(to);
  const targetPath = normalized.pathname + normalized.search;
  // If to already starts with #, use it; otherwise prefix with #
  const hashHref = to.startsWith('#') ? to : `#${targetPath}`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);

    // If target is _blank, or user held Ctrl/Meta/Shift, allow native browser tab open
    if (
      target === '_blank' ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.button !== 0 ||
      e.defaultPrevented
    ) {
      return;
    }

    e.preventDefault();
    navigate(targetPath);
  };

  return (
    <a href={hashHref} target={target} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
};
