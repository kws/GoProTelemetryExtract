#!/bin/bash

#ffmpeg -i $VIDEO -framerate 25 -pattern_type glob -i 'images/*.png' \
# -filter_complex "[1:v][0:v]blend=all_mode='overlay':all_opacity=1[v]" \
# -map [v] -c:a copy output.mp4

rm output.mp4

export VIDEO=$1

ffmpeg -i "$VIDEO" -framerate 5 -pattern_type glob -i 'images/*.png' \
 -filter_complex "[1:v]colorchannelmixer=aa=1.0[ovr];[0:v][ovr]overlay[v]" \
 -map [v] -c:a copy output.mp4

open ./output.mp4