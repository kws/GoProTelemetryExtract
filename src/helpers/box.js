const Rematrix = require('rematrix');
const { Point3D } = require('./point3d');
const math = require('mathjs');

/* Constructs a CSS RGB value from an array of 3 elements. */
function arrayToRGB(arr) {
    if( arr.length === 3 ) {
        return "rgb(" + arr[0] + "," + arr[1] + "," + arr[2] + ")";
    }
    return "rgb(0,0,0)";
}

// Define the vertices that compose each of the 6 faces. These numbers are
// indices to the vertex list defined above.
const faces  = [[0,1,2,3],[1,5,6,2],[5,4,7,6],[4,0,3,7],[0,4,5,1],[3,2,6,7]];

// Define the colors for each face.
const colors = [[255,0,0],[0,255,0],[0,0,255],[255,255,0],[0,255,255],[255,0,255]];

function box(ctx, angleX, angleY, angleZ) {
    const vertices = [
        new Point3D(-1,1,-1),
        new Point3D(1,1,-1),
        new Point3D(1,-1,-1),
        new Point3D(-1,-1,-1),
        new Point3D(-1,1,1),
        new Point3D(1,1,1),
        new Point3D(1,-1,1),
        new Point3D(-1,-1,1)
    ];

    const transforms = [
        Rematrix.translate(1920/2, 1440/2),
        Rematrix.scale(100),
        Rematrix.rotateX(angleY),
        Rematrix.rotateY(angleX),
        Rematrix.rotateZ(angleZ),
        project(.1, 100, 90),
    ];

    for (let i = 0; i < vertices.length; i++ ) {
        const v = vertices[i];
        vertices[i] = v.transform(transforms);
    }

    const avg_z = [];
    for( let i = 0; i < faces.length; i++ ) {
        const f = faces[i];
        avg_z[i] = {"index":i, "z":(vertices[f[0]].z + vertices[f[1]].z + vertices[f[2]].z + vertices[f[3]].z) / 4.0};
    }

    avg_z.sort(function(a,b) {
        return b.z - a.z;
    });

    for( let i = 0; i < faces.length; i++ ) {
        const f = faces[avg_z[i].index];
        console.log(f, avg_z[i], avg_z[i].index)
        ctx.fillStyle = arrayToRGB(colors[avg_z[i].index]);
        ctx.beginPath();
        ctx.moveTo(vertices[f[0]].x, vertices[f[0]].y);
        ctx.lineTo(vertices[f[1]].x, vertices[f[1]].y);
        ctx.lineTo(vertices[f[2]].x, vertices[f[2]].y);
        ctx.lineTo(vertices[f[3]].x, vertices[f[3]].y);
        ctx.closePath();
        ctx.fill()
    }
}


function project(near, far, fov) {
    const S = 1 / (Math.tan((fov/2) * (Math.PI / 180)));
    const M1 = -(far/(far-near));
    const M2 = -((far*near)/(far-near));

    const matrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, -1, 0,
        0, 0, 0, 1,
    ];
    console.log(matrix);

    return matrix;
    // return [
    //     1,0,0,0,
    //     0,1,0,0,
    //     0,0,1,-1,
    //     0,0,1,0
    // ];
}

module.exports = {
    box
};