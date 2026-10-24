#!/usr/bin/liquidsoap

settings.server.telnet.set(true)
settings.server.telnet.port.set(1234)
settings.server.telnet.bind_addr.set("127.0.0.1")

# Format vidéo broadcast : 720p @ 25fps
settings.frame.video.width.set(1280)
settings.frame.video.height.set(720)
settings.frame.video.framerate.set(25)

# Variable interactive de sélection de source (0 = Standby / Attente, 1 = Playlist NAS, 2 = Direct OBS)
active_source = interactive.int("regie_source", 1)

# 1. Écran d attente / Standby
attente = blank()

# 2. Playlist NAS (avec sécurité si liste vide ou média manquant)
tv_playlist = playlist(
  id="tv_playlist",
  mode="normal",
  reload_mode="watch",
  "/home/grace/regie-tv/playlists/active_playlist.txt"
)
playlist_stream = fallback(track_sensitive=false, [tv_playlist, attente])

# 3. Flux Direct OBS (écoute RTMP sur le port 1936)
obs_live = input.rtmp(listen=true, "rtmp://0.0.0.0:1936/live/obs")
obs_stream = fallback(track_sensitive=false, [obs_live, attente])

# Commutateur maître selon le bouton cliqué sur la console
master_stream = switch(track_sensitive=false, [
  ({ active_source() == 2 }, obs_stream),
  ({ active_source() == 1 }, playlist_stream),
  ({ true }, attente)
])

# Sortie RTMP encodée en H264 720p @ 25fps + AAC 128k vers Owncast
output.url(
  id="output_url",
  %ffmpeg(
    format="flv",
    %video(codec="libx264", b="1800k", preset="ultrafast", tune="zerolatency", threads=2),
    %audio(codec="aac", b="128k")
  ),
  url="rtmp://127.0.0.1:1935/live/abc123",
  mksafe(master_stream)
)
