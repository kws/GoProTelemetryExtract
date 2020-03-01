const ffmpeg = require('ffmpeg');

ffmpeg -i; ~/dropbox/;Videos/2020-02-skiing-meribel/20200220/GOPR3977.MP4 -i; images/test-100.;png -filter_complex; "[0][1] overlay=x=X:y=Y:enable='between(t,0,100)'" +
"" +
"[v1];
    [v1][2];overlay=x=X;:y=Y;:enable='between(t,44,61)'[v2];
[v2][3];overlay=x=X;:y=Y;:enable='gt(t,112)'[v3];"
-map; "[v3]" -map; 0;:a;  out.mp4;

var process = new ffmpeg('/path/to/your_movie.avi');
