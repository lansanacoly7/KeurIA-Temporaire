#!/usr/bin/env bash
set -euo pipefail

mkdir -p public/videos

make_segment() {
  local input="$1" duration="$2" filter="$3" output="$4"
  ffmpeg -y -loglevel error -loop 1 -framerate 24 -i "$input" -t "$duration" \
    -vf "$filter" -an -r 24 -c:v libx264 -preset ultrafast -crf 23 \
    -pix_fmt yuv420p -f mpegts "$output"
}

make_video() {
  local age="$1" modules="$2" duration="$3"
  local hero="public/images/age-${age}.png"
  local storyboard="public/images/video/storyboard-${age}.png"
  local ass="scripts/video-${age}.ass"
  local output="public/videos/intro-${age}.mp4"
  local work
  work="$(mktemp -d)"
  trap 'rm -rf "$work"' RETURN

  local hero_filter="scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(1+on*0.00035,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24,fade=t=in:st=0:d=0.6"
  make_segment "$hero" 7 "$hero_filter" "$work/seg00.ts"

  local concat_url="concat:$work/seg00.ts"
  local i col row x y idx filter
  for ((i=0;i<modules;i++)); do
    col=$((i % 4)); row=$((i / 4)); x=$((col * 384)); y=$((row * 341)); idx=$((i + 1))
    filter="crop=384:341:${x}:${y},scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(1+on*0.00038,1.055)':x='iw/2-(iw/zoom/2)+8*sin(on/38)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24,fade=t=in:st=0:d=0.25,fade=t=out:st=5.7:d=0.3"
    make_segment "$storyboard" 6 "$filter" "$work/seg$(printf '%02d' "$idx").ts"
    concat_url+="|$work/seg$(printf '%02d' "$idx").ts"
  done

  idx=$((modules + 1))
  make_segment "$hero" 5 "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(1+on*0.00045,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24,fade=t=out:st=4:d=1" "$work/seg$(printf '%02d' "$idx").ts"
  concat_url+="|$work/seg$(printf '%02d' "$idx").ts"

  ffmpeg -y -loglevel error -i "$concat_url" \
    -f lavfi -t "$duration" -i "aevalsrc=0.08*sin(2*PI*220*t)+0.05*sin(2*PI*277.18*t)+0.035*sin(2*PI*329.63*t):s=44100" \
    -vf "subtitles=${ass}" -filter:a "volume=0.025,afade=t=in:st=0:d=1.5,afade=t=out:st=$(($duration-2)):d=2" \
    -map 0:v:0 -map 1:a:0 -t "$duration" -c:v libx264 -preset veryfast -crf 24 \
    -pix_fmt yuv420p -c:a aac -b:a 96k -ar 44100 -movflags +faststart "$output"

  rm -rf "$work"
  trap - RETURN
}

make_video "7-9" 10 72
make_video "10-12" 12 84
make_video "13-15" 12 84
