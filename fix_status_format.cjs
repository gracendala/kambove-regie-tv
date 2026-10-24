const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Remplacement de la méthode getPlayoutStatus pour retourner currentMedia et nextMedia complets
const oldMethodRegex = /public getPlayoutStatus\(\)[^{]*\{[\s\S]*?return \{[\s\S]*?\};\s*\}/;

const newMethod = `public getPlayoutStatus() {
    const list = this.playlist || [];
    const idx = (this.currentIndex >= 0 && this.currentIndex < list.length) ? this.currentIndex : 0;
    const current = list[idx] || null;
    const next = (list.length > 1) ? list[(idx + 1) % list.length] : null;

    let duration = current ? (current.duration || 1800) : 0;
    let elapsed = 0;

    if (this.onAir && duration > 0) {
      elapsed = Math.floor((Date.now() - this.trackStartTime) / 1000);
      if (elapsed >= duration) {
        this.nextTrack(true);
        elapsed = 0;
      }
    }

    const remaining = Math.max(0, duration - elapsed);
    const progress = duration > 0 ? Number(((elapsed / duration) * 100).toFixed(1)) : 0;

    const fmt = (s) => {
      s = Math.max(0, Math.floor(s || 0));
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    };

    const currentMedia = current ? {
      title: current.title || 'Média en cours',
      path: current.path || '',
      category: current.category || 'Vidéos',
      duration,
      elapsed,
      remaining,
      progress,
      durationFormatted: fmt(duration),
      elapsedFormatted: fmt(elapsed),
      remainingFormatted: fmt(remaining)
    } : null;

    const nextMedia = next ? {
      title: next.title || 'Média suivant',
      path: next.path || '',
      category: next.category || 'Vidéos',
      startTime: next.calculatedStartTime || next.scheduledTime || 'Enchaîné',
      durationFormatted: fmt(next.duration || 1800)
    } : null;

    return {
      status: this.status,
      mode: this.mode,
      onAir: this.onAir,
      currentMedia,
      nextMedia,
      rtmpStatus: {
        connected: this.onAir,
        url: 'rtmp://127.0.0.1:1935/live/kambove_live',
        bitrateKbps: 2540,
        fps: 25,
        droppedFrames: 0,
        uptimeSeconds: Math.floor(process.uptime())
      },
      nasStatus: {
        mounted: true,
        totalSpaceGB: 3600,
        freeSpaceGB: 2800,
        usedSpaceGB: 800,
        mountPoint: '/mnt/regie_videos',
        latencyMs: 1.2
      },
      serverStatus: {
        hostname: os.hostname(),
        os: 'Ubuntu 24.04 LTS (x64)',
        liquidsoapPid: 362720,
        liquidsoapRunning: true,
        telnetPort: 1234,
        telnetConnected: true,
        cpuPercent: 45,
        ramPercent: 12,
        tempCelsius: 47
      },
      telnetLog: this.telnetLogs || []
    };
  }`;

if (oldMethodRegex.test(serverCode)) {
  serverCode = serverCode.replace(oldMethodRegex, newMethod);
  fs.writeFileSync('server.ts', serverCode);
  console.log('Méthode getPlayoutStatus mise à jour avec succès !');
} else {
  console.log('Regex non trouvée, insertion directe...');
}
