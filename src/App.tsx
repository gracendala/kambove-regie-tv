/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LiveMonitor } from './components/LiveMonitor';
import { ScheduleGrid } from './components/ScheduleGrid';
import { NasExplorer } from './components/NasExplorer';
import { SystemDiagnostics } from './components/SystemDiagnostics';
import { MediaItem, PlaylistItem, PlayoutStatus } from './types';
import { cascadeRundownTimes, formatDuration } from './utils/timeFormat';

export default function App() {
  const [activeTab, setActiveTab] = useState<'regie' | 'nas' | 'diagnostics'>('regie');
  const [status, setStatus] = useState<PlayoutStatus>({
    status: 'STANDBY',
    mode: 'playlist',
    onAir: false,
    currentMedia: null,
    nextMedia: null,
    rtmpStatus: {
      connected: false,
      url: 'rtmp://127.0.0.1:1935/live/kambove_live',
      bitrateKbps: 0,
      fps: 0,
      droppedFrames: 0,
      uptimeSeconds: 0
    },
    nasStatus: {
      mounted: false,
      mountPoint: '/mnt/regie_videos',
      totalSpaceGB: 0,
      freeSpaceGB: 0,
      usedSpaceGB: 0,
      latencyMs: 0
    },
    serverStatus: {
      hostname: 'ubuntu-regie-kambove',
      os: 'Ubuntu 24.04 LTS (x86_64)',
      liquidsoapPid: null,
      liquidsoapRunning: false,
      telnetPort: 1234,
      telnetConnected: false,
      cpuPercent: 0,
      ramPercent: 0,
      tempCelsius: 0
    },
    telnetLog: []
  });

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  // Chemin du clip réellement à l'antenne (lu dans Liquidsoap via /api/status)
  const [onAirPath, setOnAirPath] = useState<string | null>(null);
  // Ligne de la grille en cours de diffusion (-1 si le clip n'est pas dans la grille)
  const currentIndex = onAirPath ? playlist.findIndex((it) => it.path === onAirPath) : -1;
  const [nasMedia, setNasMedia] = useState<MediaItem[]>([]);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isRefreshingNas, setIsRefreshingNas] = useState<boolean>(false);

  // Poll status from /api/status periodically
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setOnAirPath(data.currentMedia?.path || null);
      }
    } catch (e) {
      // Offline fallback
    }
  }, []);

  // Fetch playlist on load
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [statusRes, playlistRes, nasRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/playlist'),
          fetch('/api/nas')
        ]);

        if (statusRes.ok) {
          const sData = await statusRes.json();
          setStatus(sData);
          setOnAirPath(sData.currentMedia?.path || null);
        }
        if (playlistRes.ok) {
          const pData = await playlistRes.json();
          if (Array.isArray(pData.playlist)) {
            setPlaylist(pData.playlist);
          }
        }
        if (nasRes.ok) {
          const nData = await nasRes.json();
          if (Array.isArray(nData.items)) {
            setNasMedia(nData.items);
          }
        }
      } catch (e) {
        // Fallback
      }
    };

    fetchInitial();

    // Resource-friendly polling: 4s interval, paused automatically when browser tab is in background
    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(fetchStatus, 4000);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchStatus();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStatus]);

  // Master controls
  const handleControl = async (action: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status && typeof data.status === 'object') {
          setStatus(data.status);
        } else if (typeof data.status === 'string') {
          setStatus(prev => ({
            ...prev,
            status: data.status,
            onAir: data.onAir !== undefined ? data.onAir : (data.status === 'ONLINE'),
            mode: data.mode || prev.mode
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
      fetchStatus();
    }
  };

  // Save playlist
  const handleSavePlaylist = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist })
      });
      if (!res.ok) {
        setSaveMessage("Erreur d'enregistrement sur le serveur.");
      } else {
        setSaveMessage('Programmation enregistrée avec succès dans active_playlist.txt et rechargée dans Liquidsoap !');
        setTimeout(() => setSaveMessage(null), 5000);
      }
    } catch (e) {
      setSaveMessage("Erreur d'enregistrement sur le serveur.");
    } finally {
      setIsSaving(false);
      fetchStatus();
    }
  };

  // Écran d'attente rapide
  const handleQuickInsert = (_type: 'mire') => {
    handleControl('emergency_mire');
  };

  // Add items from NAS Explorer
  const handleAddToPlaylist = (items: MediaItem[]) => {
    const newPlaylistItems: PlaylistItem[] = items.map((item, idx) => ({
      id: `pl-${Date.now()}-${idx}`,
      mediaId: item.id,
      title: item.title,
      path: item.path,
      category: item.category,
      duration: item.duration,
      durationFormatted: item.durationFormatted,
      scheduledTime: '00:00:00',
      calculatedStartTime: '00:00:00',
      calculatedEndTime: '00:00:00',
      type: 'video',
      isFixedTime: false,
      status: 'pending'
    }));

    const updated = [...playlist, ...newPlaylistItems];
    const cascaded = cascadeRundownTimes(updated);
    setPlaylist(cascaded);
    setActiveTab('regie');
  };

  // Direct play from NAS Explorer : le serveur pousse la vidéo dans la file
  // « direct » de Liquidsoap, elle passe tout de suite sans modifier la playlist
  const handlePlayDirectly = async (item: MediaItem) => {
    setIsActionLoading(true);
    try {
      await fetch('/api/play-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
      setActiveTab('regie');
      fetchStatus();
    }
  };

  // Send Telnet Command
  const handleSendTelnetCommand = async (command: string): Promise<string> => {
    const res = await fetch('/api/telnet/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const data = await res.json();
    fetchStatus();
    return data.response || 'OK';
  };

  // Refresh NAS files
  const handleRefreshNas = async () => {
    setIsRefreshingNas(true);
    try {
      const res = await fetch('/api/nas/media?refresh=1');
      const data = await res.json();
      setNasMedia(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingNas(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Station Master Header */}
      <Header
        status={status}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onControl={handleControl}
        isActionLoading={isActionLoading}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Tab 1: Live Master Playout & Schedule Rundown */}
        {activeTab === 'regie' && (
          <div className="space-y-6">
            <LiveMonitor
              status={status}
              onControl={handleControl}
              onQuickInsert={handleQuickInsert}
              isActionLoading={isActionLoading}
            />

            <ScheduleGrid
              playlist={playlist}
              currentIndex={currentIndex}
              onUpdatePlaylist={setPlaylist}
              onSavePlaylist={handleSavePlaylist}
              onOpenNasExplorer={() => setActiveTab('nas')}
              isSaving={isSaving}
              saveMessage={saveMessage}
            />
          </div>
        )}

        {/* Tab 2: NAS Video Library Explorer */}
        {activeTab === 'nas' && (
          <NasExplorer
            nasStatus={status.nasStatus}
            mediaList={nasMedia}
            onAddToPlaylist={handleAddToPlaylist}
            onPlayDirectly={handlePlayDirectly}
            onRefreshNas={handleRefreshNas}
            isRefreshing={isRefreshingNas}
          />
        )}

        {/* Tab 3: System Diagnostics & Telnet Console */}
        {activeTab === 'diagnostics' && (
          <SystemDiagnostics
            status={status}
            onSendTelnetCommand={handleSendTelnetCommand}
          />
        )}

        {/* Tab 4: Audit & Deployment Guide for Grace Ndala */}
      </main>
    </div>
  );
}
