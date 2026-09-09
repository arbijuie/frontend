import { useEffect } from 'react';
import { formatPageTitle } from '../lib/navigation';

/** Keeps `document.title` in sync with the active section so tabs and history are readable. */
export function usePageTitle(section: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = formatPageTitle(section);
    return () => {
      document.title = previous;
    };
  }, [section]);
}
