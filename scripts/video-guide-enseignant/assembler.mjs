// Assemblage final : images du screencast (débit variable) -> 1920x1080 à 60 images/s, + pistes de voix calées sur chaque scène,
// mixage normalisé (EBU R128), puis encodage H.264/AAC.
// Usage : node assembler.mjs <dossier de travail> <fichier de sortie.mp4>
import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const WORK = path.resolve(process.argv[2] ?? 'sortie');
const OUT = path.resolve(process.argv[3] ?? path.join(WORK, 'guide_complet_espace_enseignant.mp4'));
const FFMPEG = process.env.FFMPEG
  ?? execFileSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).trim();

const { frames, marks } = JSON.parse(fs.readFileSync(path.join(WORK, 'marks.json'), 'utf8'));
const t0 = frames[0];

// Liste « concat » : chaque image reste à l'écran jusqu'à la suivante (durée réelle entre deux horodatages).
const lines = [];
frames.forEach((t, i) => {
  const next = frames[i + 1] ?? t + 0.5;
  lines.push(`file 'frames/f${String(i).padStart(6, '0')}.jpg'`, `duration ${Math.max(0.001, next - t).toFixed(4)}`);
});
lines.push(`file 'frames/f${String(frames.length - 1).padStart(6, '0')}.jpg'`);
fs.writeFileSync(path.join(WORK, 'frames.txt'), lines.join('\n'));

// Voix : chaque scène démarre à (début de scène - première image) secondes, avec 0,25 s de marge d'entrée.
const ids = Object.keys(marks);
const inputs = ['-f', 'concat', '-safe', '0', '-i', 'frames.txt'];
const filters = [];
ids.forEach((id, i) => {
  inputs.push('-i', path.join('audio', `${id}.mp3`));
  const ms = Math.round((marks[id] - t0 + 0.25) * 1000);
  filters.push(`[${i + 1}:a]adelay=${ms}|${ms},volume=1.0[a${i}]`);
});
filters.push(`${ids.map((_, i) => `[a${i}]`).join('')}amix=inputs=${ids.length}:normalize=0:dropout_transition=0,`
  + 'highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=15:release=250,loudnorm=I=-16:TP=-1.5:LRA=9[aout]');

const args = ['-y', ...inputs,
  '-filter_complex', filters.join(';'),
  '-map', '0:v', '-map', '[aout]',
  '-vf', 'fps=60,scale=1920:1080:flags=lanczos:in_range=full:out_range=limited,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-r', '60', '-g', '120', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  OUT];
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const r = spawnSync(FFMPEG, args, { cwd: WORK, stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('OK ->', OUT);
