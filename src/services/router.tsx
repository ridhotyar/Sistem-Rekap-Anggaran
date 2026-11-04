import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface RouteInfo {
  path: string;
  pathname: string;
  search: string;
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

function parsePath(fullPath: string): RouteInfo {
  const [pathname = '/', search = ''] = fullPath.split('?');
  const normalized = pathname === '' ? '/' : pathname;

  const params: RouteInfo['params'] = {};

  // Match /sub-kegiatan/:idSubBl
  const subMatch = normalized.match(/^\/sub-kegiatan\/(\d+)/);
  if (subMatch) {
    params.idSubBl = parseInt(subMatch[1], 10);
  }

  return {
    path: fullPath,
    pathname: normalized,
    search: search ? `?${search}` : '',
    params,
  };
}

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname + window.location.search;
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    setCurrentPath(to);
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
    navigate(to);
  };

  return (
    <a href={to} target={target} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
};
