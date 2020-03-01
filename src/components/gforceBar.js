const palette = require('google-palette');

const G = 9.8;

class GForceBar {
    constructor(samples, options) {
        this.samples = samples;

        options = options || {};
        options.x = options.x || 0;
        options.y = options.y || 0;
        options.length = options.length || 250;
        options.height = options.height || 30;
        options.color = options.color || '#000';
        options.palette = options.palette || 'cb-RdYlGn';
        options.font = options.font || "35px Arial";


        this.options = options;
        this.clrs = palette(options.palette, 10);

        this.maxG = 0;
        samples.forEach((sample, ix) => {
            const value = sample.value;
            sample.abs = Math.sqrt(value[0]**2 + value[1]**2 + value[2]**2);
            this.maxG = Math.max(this.maxG, sample.abs);
        });

    }


    drawBox(ctx, sample) {
        const cIndex = Math.max(9-Math.floor(sample.abs/5), 0);
        const color = this.clrs[cIndex];
        ctx.beginPath();
        ctx.fillStyle = `#${color}`;

        ctx.font = this.options.font;
        ctx.fillText(`${(sample.abs/G).toFixed(1)}G`,
            this.options.x  + this.options.length + 10, this.options.y + this.options.height);


        ctx.fillRect(this.options.x, this.options.y,
            this.options.length*sample.abs/this.maxG,
            this.options.height);
        ctx.closePath();
        ctx.beginPath();
        ctx.fillStyle = this.options.color;
        ctx.rect(this.options.x, this.options.y, this.options.length, this.options.height);
        ctx.stroke();
    }

    drawCircle(ctx, sample) {

        const radius = (this.options.length + 50)/2;

        ctx.fillStyle = this.options.color;
        ctx.beginPath();
        ctx.arc(this.options.x + radius, this.options.y - radius, radius,0,2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.options.x + radius, this.options.y - radius, 2*radius/3,0,2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.options.x + radius, this.options.y - radius, radius/3,0,2 * Math.PI);
        ctx.stroke();
        ctx.closePath();
        ctx.moveTo(this.options.x, this.options.y - radius);
        ctx.lineTo(this.options.x + 2*radius, this.options.y - radius);
        ctx.moveTo(this.options.x + radius, this.options.y);
        ctx.lineTo(this.options.x + radius, this.options.y - 2*radius);
        ctx.stroke();
        ctx.closePath();

        const cIndex = Math.max(9-Math.floor(sample.abs/5), 0);
        const color = this.clrs[cIndex];
        ctx.fillStyle = `#${color}`;

        const value = sample.value;
        const x = value[1]/(3*G);
        const y = -value[0]/(3*G);

        ctx.beginPath();
        ctx.arc(
            this.options.x + radius + (x*radius),
            this.options.y - radius + (y*radius),
            25,
            0,
            Math.PI * 2
            );
        ctx.fill();
        ctx.closePath();



    }


}

module.exports = GForceBar;