export interface MediaItem {
  id: string;
  title: string;
  filename: string;
  path: string;
  category: string;
  duration: number; // in seconds
  durationFormatted: string;
  sizeFormatted: string;
  resolution: string;
  format: string;
  dateModified: string;
}

export interface PlaylistItem {
  id: string;
  mediaId: string;
  title: string;
  path: string;
  category: string;
  duration: number;
  durationFormatted: string;
  scheduledTime: string; // "HH:MM:SS" or "HH:MM"
  calculatedStartTime: string;
  calculatedEndTime: string;
  type: 'video' | 'live_obs' | 'jingle' | 'mire' | 'annonce';
  isFixedTime: boolean;
  status: 'played' | 'playing' | 'pending';
}

export interface PlayoutStatus {
  status: 'ONLINE' | 'STANDBY' | 'OBS_LIVE' | 'OFFLINE';
  mode: 'playlist' | 'obs' | 'emergency_mire' | 'standby' | 'off';
  onAir: boolean;
  currentMedia: {
    title: string;
    path: string;
    category: string;
    duration: number;
    elapsed: number;
    remaining: number;
    progress: number;
    durationFormatted: string;
    elapsedFormatted: string;
    remainingFormatted: string;
  } | null;
  nextMedia: {
    title: string;
    path: string;
    category: string;
    startTime: string;
    durationFormatted: string;
  } | null;
  rtmpStatus: {
    connected: boolean;
    url: string;
    bitrateKbps: number;
    fps: number;
    droppedFrames: number;
    uptimeSeconds: number;
  };
  nasStatus: {
    mounted: boolean;
    mountPoint: string;
    totalSpaceGB: number;
    freeSpaceGB: number;
    usedSpaceGB: number;
    latencyMs: number;
  };
  serverStatus: {
    hostname: string;
    os: string;
    liquidsoapPid: number | null;
    liquidsoapRunning: boolean;
    telnetPort: number;
    telnetConnected: boolean;
    cpuPercent: number;
    ramPercent: number;
    tempCelsius: number;
  };
  telnetLog: Array<{
    id: string;
    time: string;
    command: string;
    response: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
}

export interface RundownTemplate {
  id: string;
  name: string;
  description: string;
  itemsCount: number;
  totalDuration: string;
  items: Omit<PlaylistItem, 'id'>[];
}
