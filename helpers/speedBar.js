const palette = require('google-palette');

class SpeedBar {
    constructor(samples, options) {
        this.samples = samples;

        options = options || {};
        options.x = options.x || 0;
        options.y = options.y || 0;
        options.length = options.length || 250;
        options.height = options.height || 30;
        options.color = options.color || '#000';
        options.palette = options.palette || 'cb-RdYlGn';

        this.options = options;

        this.clrs = palette(options.palette, 10);

        this.maxSpeed = Math.max(...samples.map(s => s.speed3d_kph));

    }


    drawBox(ctx, sample) {
        if (!sample) {
            return;
        }
        const cIndex = Math.max(9-Math.floor(sample.speed3d_kph/5), 0);
        const color = this.clrs[cIndex];
        ctx.beginPath();
        ctx.fillStyle = `#${color}`;

        ctx.font = "35px Arial";
        ctx.fillText(`${sample['speed3d_kph'].toFixed(1)} km/h`,
            this.options.x  + this.options.length + 10, this.options.y + this.options.height);


        ctx.fillRect(this.options.x, this.options.y,
            this.options.length*sample.speed3d_kph/this.maxSpeed,
            this.options.height);
        ctx.closePath();
        ctx.beginPath();
        ctx.fillStyle = this.options.color;
        ctx.rect(this.options.x, this.options.y, this.options.length, this.options.height);
        ctx.stroke();

    }
}

module.exports = SpeedBar;