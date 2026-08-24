import { useEffect, useState } from 'react';
import { getTrack as getDefaultTrack } from '../config/tracks.js';
import { api } from './api.js';

export function useTrackConfig(trackKey) {
  const [track, setTrack] = useState(() => getDefaultTrack(trackKey));

  useEffect(() => {
    let cancelled = false;
    setTrack(getDefaultTrack(trackKey));
    api.getStructure(trackKey)
      .then((custom) => {
        if (cancelled || !custom || !custom.sections) return;
        setTrack((prev) => ({ ...prev, sections: custom.sections }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [trackKey]);

  return track;
}
