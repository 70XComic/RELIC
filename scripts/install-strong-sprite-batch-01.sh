#!/usr/bin/env bash
set -euo pipefail

src=/workspace/scratch/e5129d9ea880/generated_images
dst=/workspace/sites/relic-rush/public/assets
tmp=/workspace/scratch/e5129d9ea880/sprite-normalized
mkdir -p "$tmp"

install_sprite() {
  local input="$src/$1.png"
  local output="$dst/$2.png"
  local channels
  channels=$(identify -format '%[channels]' "$input")
  if [[ "$channels" == *a* ]]; then
    convert "$input" -alpha on -channel A -threshold 1% +channel -trim +repage \
      -filter point -resize '480x480>' -gravity center -background none -extent 512x512 "$tmp/$2.png"
  else
    convert "$input" -alpha on -fuzz 15% -transparent white -channel A -threshold 1% +channel \
      -trim +repage -filter point -resize '480x480>' -gravity center -background none -extent 512x512 "$tmp/$2.png"
  fi
  cp "$tmp/$2.png" "$output"
}

install_sprite exec-22035de6-9391-4bf3-8882-fc2e8567a639 gacha-b2-01
install_sprite exec-640118c0-e8f5-4911-804f-72adab73530a gacha-b2-02
install_sprite exec-1cfe4733-01da-4be2-bdb2-7e14a6ffcdc2 gacha-b2-03
install_sprite exec-29ddedfa-de07-4b36-958f-c38d5ba010ef gacha-b2-04
install_sprite exec-50c214e9-3e71-44ca-9f32-5069534fdd20 gacha-b2-05
install_sprite exec-d1452b52-664f-4199-b7bf-1a798f5ee0e5 gacha-b2-06
install_sprite exec-abfa22c5-97f1-4b54-9cb2-4657f8a0a88e gacha-b2-07
install_sprite exec-bafe8569-c385-4e27-b092-98ec8629d81e gacha-b2-08
install_sprite exec-89259d10-df61-4ad1-9b1f-7975fe00af46 gacha-b2-09
install_sprite exec-4884c560-6c72-4926-b40e-c42c8750488a gacha-b2-10
