addEventListener('message', function(e) {
    var imageData = e.data;
    for (var i = 0; i < imageData.data.length/4; i++) {
        var r = imageData.data[(i*4)  ],
            g = imageData.data[(i*4)+1],
            b = imageData.data[(i*4)+2],
            a = imageData.data[(i*4)+3];

        var y = (r + g + b) / 3.0;
        imageData.data[(i*4)  ] = y * 1;
        imageData.data[(i*4)+1] = y * 0.9;
        imageData.data[(i*4)+2] = y * 0.7;
    }

    postMessage(imageData);
});
