var currentEffect = null; // The current effect applying to the videos

var outputDuration = 0; // The duration of the output video
var outputFramesBuffer = []; // The frames buffer for the output video
var currentFrame = 0; // The current frame being processed
var completedFrames = 0; // The number of completed frames

// This function starts the processing of an individual frame.
function processFrame() {
    if (currentFrame < outputDuration) {
        currentEffect.process(currentFrame);
        currentFrame++;
    }
}

// This function is called when an individual frame is finished.
// If all frames are completed, it takes the frames stored in the
// `outputFramesBuffer` and builds a video. The video is then set as the 'src'
// of the <video id='output-video'></video>.
function finishFrame() {
    completedFrames++;
    if (completedFrames < outputDuration) {
        updateProgressBar("#effect-progress", completedFrames / outputDuration * 100);

        if (stopProcessingFlag) {
            stopProcessingFlag = false;
            $("#progress-modal").modal("hide");
        } else {
            setTimeout(processFrame, 1);
        }
    }
    else {
        buildVideo(outputFramesBuffer, function(resultVideo) {
            $("#output-video").attr("src", URL.createObjectURL(resultVideo));
            updateProgressBar("#effect-progress", 100);
            $("#progress-modal").modal("hide");
        });
    }
}

/*
* Convert RGB to HSV
* Modified from https://gist.github.com/mjackson/5311256
*/
function fromRGBToHSV(r, g, b) {
    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h *= 60;
    }

    return {"h": h, "s": s, "v": v};
}

/*
* Convert HSV to RGB
* Modified from https://gist.github.com/mjackson/5311256
*/
function fromHSVToRGB(h, s, v) {
    var r, g, b;

    var i = Math.floor(h / 60.0);
    var f = h / 60.0 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {"r": Math.round(r * 255),
            "g": Math.round(g * 255),
            "b": Math.round(b * 255)};
}

// Definition of various video effects
//
// `effects` is an object with unlimited number of members.
// Each member of `effects` represents an effect.
// Each effect is an object, with two member functions:
// - setup() which responsible for gathering different parameters
//           of that effect and preparing the output buffer
// - process() which responsible for processing of individual frame
var effects = {
    rgb: {
        setup: function() {
            // Prepare the parameters
            this.chromaThreshold =
                parseFloat($("#rgb-threshold").val());
            console.log($("#use-dropper").prop("checked"));
            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx) {
             // Use a canvas to store input-frame content
             var w1 = $("#input-video-1").get(0).videoWidth;
             var h1 = $("#input-video-1").get(0).videoHeight;
             var canvas1 = getCanvas(w1, h1);
             var ctx1 = canvas1.getContext('2d');
             // Use a canvas to store BG-frame content
             var w2 = $("#input-video-2").get(0).videoWidth;
             var h2 = $("#input-video-2").get(0).videoHeight;
             var canvas2 = getCanvas(w2, h2);
             var ctx2 = canvas2.getContext('2d');
             //OUT
             var canvas = getCanvas(w1, h1);
             var ctx = canvas.getContext('2d');

             /*
             * TODO
             */        
            var imageData = ctx.getImageData(0, 0, w1, h1);
            // Tolerance for color matching
            var TOLERANCE = this.chromaThreshold;
            //console.log(TOLERANCE);
            
            var front_img = new Image();
            front_img.onload = function() {
                // Get the image data object of the current frame
                ctx1.drawImage(front_img, 0, 0);
                var imageData1 = ctx1.getImageData(0, 0, w1, h1);
                
                var back_img = new Image();
                back_img.onload = function() {
                    // Get the image data object of the current frame
                    ctx2.drawImage(back_img, 0, 0, w1, h1);//ensure background not larger than front
                    var imageData2 = ctx2.getImageData(0, 0, w1, h1);

                    //Chroma
                    // Chroma key color (green)
                    let KEY_R = 0;
                    let KEY_G = 255;
                    let KEY_B = 0;
                    // use dropper if checked
                    if( $("#use-dropper").prop("checked") ){
                        let components = $("#dropper-result").css("background-color").replace(/rgba?\(|\)/g, '').split(',');
                        KEY_R = parseInt(components[0].trim(), 10);
                        KEY_G = parseInt(components[1].trim(), 10);
                        KEY_B = parseInt(components[2].trim(), 10);
                    }
                    
                    //console.log(TOLERANCE);

                    for (let i = 0; i < imageData1.data.length; i += 4) {
                        imageData.data[i]     =  0;// Red
                        imageData.data[i + 1] =  0;// Green
                        imageData.data[i + 2] =  0;// Blue
                        imageData.data[i + 3] =  255;//
                        // Get RGB values
                        let r = imageData1.data[i];
                        let g = imageData1.data[i + 1];
                        let b = imageData1.data[i + 2];

                        // Calculate the distance to the key color (442 means sqrt((255)^2+(255)^2+(255)^2))
                        let distance = (Math.sqrt((KEY_R - r) ** 2 + (KEY_G - g) ** 2 + (KEY_B - b) ** 2))/442;

                        // If the current pixel's color is close to the chroma key color
                        if (distance < TOLERANCE) {
                           // console.log("replace");
                            // Replace with the background pixel
                            imageData.data[i] = imageData2.data[i];
                            imageData.data[i + 1] = imageData2.data[i+1];
                            imageData.data[i + 2] = imageData2.data[i+2];

                            // imageData.data[i] = 0;
                            // imageData.data[i + 1] = 0;
                            // imageData.data[i + 2] = 0;
                        } else {
                            //console.log("keep");
                            // Else, keep the original pixel from the foreground image
                            imageData.data[i] = imageData1.data[i];     // R
                            imageData.data[i + 1] = imageData1.data[i + 1]; // G
                            imageData.data[i + 2] = imageData1.data[i + 2]; // B
                            // Copy alpha value
                            imageData.data[i + 3] = imageData1.data[i + 3]; // A
                        }
                    }


                    //OUT
                    ctx.putImageData(imageData, 0, 0);
                    outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
                    finishFrame();
                 };
                back_img.src = input2FramesBuffer[idx];
            };
            front_img.src = input1FramesBuffer[idx];
        }
    },

    hsv: {
        setup: function() {
            // Prepare the parameters
            this.chromaThreshold =
                parseFloat($("#hsv-threshold").val());
            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx) {
             // Use a canvas to store input-frame content
             var w1 = $("#input-video-1").get(0).videoWidth;
             var h1 = $("#input-video-1").get(0).videoHeight;
             var canvas1 = getCanvas(w1, h1);
             var ctx1 = canvas1.getContext('2d');
             // Use a canvas to store BG-frame content
             var w2 = $("#input-video-2").get(0).videoWidth;
             var h2 = $("#input-video-2").get(0).videoHeight;
             var canvas2 = getCanvas(w2, h2);
             var ctx2 = canvas2.getContext('2d');
             //OUT
             var canvas = getCanvas(w1, h1);
             var ctx = canvas.getContext('2d');

             /*
             * TODO
             */        
            var imageData = ctx.getImageData(0, 0, w1, h1);
            // Tolerance for color matching
            var TOLERANCE = this.chromaThreshold;
            //console.log(TOLERANCE);
            
            var front_img = new Image();
            front_img.onload = function() {
                // Get the image data object of the current frame
                ctx1.drawImage(front_img, 0, 0);
                var imageData1 = ctx1.getImageData(0, 0, w1, h1);
                
                var back_img = new Image();
                back_img.onload = function() {
                    // Get the image data object of the current frame
                    ctx2.drawImage(back_img, 0, 0, w1, h1);//ensure background not larger than front
                    var imageData2 = ctx2.getImageData(0, 0, w1, h1);

                    //Chroma
                    //Key(green)
                    let key_hue = 120;
                    if( $("#use-dropper").prop("checked") ){
                        let components = $("#dropper-result").css("background-color").replace(/rgba?\(|\)/g, '').split(',');
                        let KEY_R = parseInt(components[0].trim(), 10);
                        let KEY_G = parseInt(components[1].trim(), 10);
                        let KEY_B = parseInt(components[2].trim(), 10);
                        let key_hsv = fromRGBToHSV(KEY_R, KEY_G, KEY_B);
                        key_hue = key_hsv.h;
                    }

                    for (let i = 0; i < imageData1.data.length; i += 4) {
                        imageData.data[i]     =  0;// Red
                        imageData.data[i + 1] =  0;// Green
                        imageData.data[i + 2] =  0;// Blue
                        imageData.data[i + 3] =  255;//
                        // Get RGB values
                        let r = imageData1.data[i];
                        let g = imageData1.data[i + 1];
                        let b = imageData1.data[i + 2];

                        // Calculate the distance to the key color
                        let front_hsv = fromRGBToHSV(r, g, b);
                        let diff = Math.abs(front_hsv.h - key_hue);
                        let distance = -1;
                        if( diff < 180){
                            distance = diff/180;
                        }else if( diff >= 180){
                            distance = (360 - diff)/180;
                        }

                        // If the current pixel's color is close to the chroma key color
                        if (distance < TOLERANCE) {
                           // console.log("replace");
                            // Replace with the background pixel
                            imageData.data[i] = imageData2.data[i];
                            imageData.data[i + 1] = imageData2.data[i+1];
                            imageData.data[i + 2] = imageData2.data[i+2];

                            // imageData.data[i] = 0;
                            // imageData.data[i + 1] = 0;
                            // imageData.data[i + 2] = 0;
                        } else {
                            //console.log("keep");
                            // Else, keep the original pixel from the foreground image
                            imageData.data[i] = imageData1.data[i];     // R
                            imageData.data[i + 1] = imageData1.data[i + 1]; // G
                            imageData.data[i + 2] = imageData1.data[i + 2]; // B
                            // Copy alpha value
                            imageData.data[i + 3] = imageData1.data[i + 3]; // A
                        }
                    }


                    //OUT
                    ctx.putImageData(imageData, 0, 0);
                    outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
                    finishFrame();
                 };
                back_img.src = input2FramesBuffer[idx];
            };
            front_img.src = input1FramesBuffer[idx];
        }
    },

    vlahos: {
        setup: function() {
            // Prepare the parameters
            //console.log($("#use-dropper").prop("checked"));

            this.GBRatio = parseFloat($("#GB-ratio").val())

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx) {
             // Use a canvas to store input-frame content
             var w1 = $("#input-video-1").get(0).videoWidth;
             var h1 = $("#input-video-1").get(0).videoHeight;
             var canvas1 = getCanvas(w1, h1);
             var ctx1 = canvas1.getContext('2d');
             // Use a canvas to store BG-frame content
             var w2 = $("#input-video-2").get(0).videoWidth;
             var h2 = $("#input-video-2").get(0).videoHeight;
             var canvas2 = getCanvas(w2, h2);
             var ctx2 = canvas2.getContext('2d');
             //OUT
             var canvas = getCanvas(w1, h1);
             var ctx = canvas.getContext('2d');

             /*
             * TODO
             */        
            var imageData = ctx.getImageData(0, 0, w1, h1);
            //console.log(TOLERANCE);

            let KEY_R = 0;
            let KEY_G = 255;
            let KEY_B = 0;
            if( $("#use-dropper").prop("checked") ){
                let components = $("#dropper-result").css("background-color").replace(/rgba?\(|\)/g, '').split(',');
                KEY_R = parseInt(components[0].trim(), 10);
                KEY_G = parseInt(components[1].trim(), 10);
                KEY_B = parseInt(components[2].trim(), 10);
                console.log(KEY_R,KEY_G,KEY_B);
            }

            let k = this.GBRatio
            
            var front_img = new Image();
            front_img.onload = function() {
                // Get the image data object of the current frame
                ctx1.drawImage(front_img, 0, 0);
                var imageData1 = ctx1.getImageData(0, 0, w1, h1);
                
                var back_img = new Image();
                back_img.onload = function() {
                    // Get the image data object of the current frame
                    ctx2.drawImage(back_img, 0, 0, w1, h1);//ensure background not larger than front
                    var imageData2 = ctx2.getImageData(0, 0, w1, h1);

                    ///

                    ///
                    

                    for (let i = 0; i < imageData1.data.length; i += 4) {
                        imageData.data[i]     =  0;// Red
                        imageData.data[i + 1] =  0;// Green
                        imageData.data[i + 2] =  0;// Blue
                        imageData.data[i + 3] =  255;// alpha
                        // Get RGB values
                        let r = imageData1.data[i];
                        let g = imageData1.data[i + 1];
                        let b = imageData1.data[i + 2];

                        // Compute Unknowns
                        var alpha = 1-(g-k*b)/(KEY_G-k*KEY_B)
                        var R_Foreground = (r-KEY_R*(1-alpha))/alpha
                        var G_Foreground = (g-KEY_G*(1-alpha))/alpha
                        var B_Foreground = (b-KEY_B*(1-alpha))/alpha

                        // Combine with background
                        imageData.data[i]     =  R_Foreground * alpha + imageData2.data[i] * (1-alpha);// Red
                        imageData.data[i + 1] =  G_Foreground * alpha + imageData2.data[i+1] * (1-alpha);;// Green
                        imageData.data[i + 2] =  B_Foreground * alpha + imageData2.data[i+2] * (1-alpha);;// Blue
                    }


                    //OUT
                    ctx.putImageData(imageData, 0, 0);
                    outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
                    finishFrame();
                 };
                back_img.src = input2FramesBuffer[idx];
            };
            front_img.src = input1FramesBuffer[idx];
        }
    },
    
};

// Handler for the "Apply" button click event
function applyEffect(e) {
    $("#progress-modal").modal("show");
    updateProgressBar("#effect-progress", 0);

    // Check which one is the actively selected effect
    switch(selectedEffect) {
        case "rgb":
            currentEffect = effects.rgb;
            break;
        case "hsv":
            currentEffect = effects.hsv;
            break;
        case "vlahos":
            currentEffect = effects.vlahos;
            break;
        default:
            // Do nothing
            $("#progress-modal").modal("hide");
            return;
    }

    // Set up the effect
    currentEffect.setup();

    // Start processing the frames
    currentFrame = 0;
    completedFrames = 0;
    processFrame();
}
