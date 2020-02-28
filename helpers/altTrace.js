const palette = require('google-palette');

class AltTrace {
    constructor(samples, options) {
        this.samples = samples;

        options = options || {};
        options.x = options.x || 0;
        options.y = options.y || 0;
        options.size = options.size || 300;
        options.traceWidth = options.traceWidth || 3;
        options.palette = options.palette || 'cb-RdYlGn';

        options.locationSize = options.locationSize || 7;
        options.locationColor = options.locationColor || '#fff';
        options.locationBorderColor = options.locationBorderColor || '#000';

        this.options = options;

        this.clrs = palette(options.palette, 10);

        this.altMin = Math.min(...samples.map(sample => sample.alt));
        this.altMax = Math.max(...samples.map(sample => sample.alt));

        this.distMin = Math.min(...samples.map(sample => sample.dist));
        this.distMax = Math.max(...samples.map(sample => sample.dist));

        this.xScale = (this.distMax - this.distMin) / options.size;
        this.yScale = (this.altMax - this.altMin) / options.size;
    }

    drawTrace(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.fillRect(this.options.x, this.options.y, this.options.size, this.options.size);
        this.samples.forEach((sample, ix) => {
            const {x,y} = this.getLocation(sample);
            const color = this.getColor(sample)
            ctx.fillStyle = `#${color}`;
            ctx.fillRect(x-1,y-1,3,3);
        });
    }

    drawLocation(ctx, sample) {
        if (!sample) {
            return;
        }
        const {x,y} = this.getLocation(sample);
        ctx.beginPath();
        ctx.arc(x, y, this.options.locationSize,0,2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = this.options.locationColor;
        ctx.fill();
        ctx.fillStyle = this.options.locationBorderColor;
        ctx.stroke();

        const color = this.getColor(sample)
        ctx.fillStyle = `#${color}`;
        ctx.font = "35px Arial";
        ctx.fillText(`${sample.alt.toFixed(0)}m`, x-125, y+5);

    }

    getColor(sample) {
        const cIndex = Math.max(9-Math.floor(sample.speed3d_kph/5), 0);
        return this.clrs[cIndex];
    }

    getLocation(sample) {
        const x = this.options.x + (sample.dist - this.distMin) / this.xScale;
        const y = this.options.size + this.options.y - (sample.alt - this.altMin) / this.yScale;
        return {x, y};
    }

}

module.exports = AltTrace;


