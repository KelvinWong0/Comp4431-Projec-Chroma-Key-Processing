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

// Definition of various video effects
//
// `effects` is an object with unlimited number of members.
// Each member of `effects` represents an effect.
// Each effect is an object, with two member functions:
// - setup() which responsible for gathering different parameters
//           of that effect and preparing the output buffer
// - process() which responsible for processing of individual frame
var effects = {
    reverse: {
        setup: function() {
            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx) {
            // Put the frames in reverse order
            outputFramesBuffer[idx] = input1FramesBuffer[(outputDuration - 1) - idx];

            // Notify the finish of a frame
            finishFrame();
        }
    },
    
    fadeInOut: {
        setup: function() {
            // Prepare the parameters
            this.fadeInDuration = Math.round(parseFloat($("#fadeIn-duration").val()) * frameRate);
            this.fadeOutDuration = Math.round(parseFloat($("#fadeOut-duration").val()) * frameRate);

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');
            

            /*
             * TODO: Calculate the multiplier
             */
            if(this.fadeInDuration>outputDuration){
                this.fadeInDuration=outputDuration;
            }
            if(this.fadeOutDuration>outputDuration){
                this.fadeOutDuration=outputDuration;
            }

            var multiplier = 1 ;
            if (idx < this.fadeInDuration) {
                // In the fade in region
                multiplier = idx / this.fadeInDuration;
            }
            else if (idx > outputDuration - this.fadeOutDuration) {
                // In the fade out region
                var ref = outputDuration - this.fadeOutDuration;
                multiplier = 1 - (idx-ref)/(outputDuration-ref);
            }
            console.log(multiplier);


            // Modify the image content based on the multiplier
            var img = new Image();
            img.onload = function() {
                // Get the image data object
                ctx.drawImage(img, 0, 0);
                var imageData = ctx.getImageData(0, 0, w, h);


                /*
                 * TODO: Modify the pixels
                 */
                for (var i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i]     =  imageData.data[i]*multiplier ;// Red
                    imageData.data[i + 1] =  imageData.data[i+1]*multiplier ;// Green
                    imageData.data[i + 2] =  imageData.data[i+2]*multiplier ;// Blue
                   // imageData.data[i + 3] =  // Alpha
                }

                
                // Store the image data as an output frame
                ctx.putImageData(imageData, 0, 0);
                outputFramesBuffer[idx] = canvas.toDataURL("image/webp");

                // Notify the finish of a frame
                finishFrame();
            };
            img.src = input1FramesBuffer[idx];
        }
    },
    
    motionBlur: {
        setup: function() {
            // Prepare the parameters
            this.blurFrames = parseInt($("#blur-frames").val());

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);

            // Prepare a buffer of frames (as ImageData)
            this.imageDataBuffer = [];
        },
        process: function(idx, parameters) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');

            //console.log("P:",parameters);
            
            // Need to store them as local variables so that
            // img.onload can access them
            var imageDataBuffer = this.imageDataBuffer;
            var blurFrames = this.blurFrames;

            // Combine frames into one
            var img = new Image();
            img.onload = function() {
                // Get the image data object of the current frame
                ctx.drawImage(img, 0, 0);
                var imageData = ctx.getImageData(0, 0, w, h);


                /*
                 * TODO: Manage the image data buffer
                 */
                if(imageDataBuffer.length >= blurFrames){
                    imageDataBuffer.shift();
                }
                imageDataBuffer.push(imageData);
                console.log(imageDataBuffer.length);


                // Create a blank image data
                imageData = new ImageData(w, h);



                /*
                 * TODO: Combine the image data buffer into one frame
                 */
                for (var i = 0; i < imageData.data.length; i += 4) {

                    imageData.data[i]     =  0;// Red
                    imageData.data[i + 1] =  0;// Green
                    imageData.data[i + 2] =  0;// Blue
                    imageData.data[i + 3] =  255;

                    var r = imageData.data[i];
                    var g = imageData.data[i+1];
                    var b = imageData.data[i+2];
                
                    for (var j = 0; j < imageDataBuffer.length; ++j) {
                
                        r +=  imageDataBuffer[j].data[i];// Red
                        g +=  imageDataBuffer[j].data[i+1];// Green
                        b +=  imageDataBuffer[j].data[i+2];// Blue
                
                    }

                    imageData.data[i]     =  (r/imageDataBuffer.length);// Red
                    imageData.data[i + 1] =  (g/imageDataBuffer.length);// Green
                    imageData.data[i + 2] =  (b/imageDataBuffer.length);// Blue

                    imageData.data[i] = Math.min(Math.max(imageData.data[i], 0), 255);
                    imageData.data[i + 1] = Math.min(Math.max(imageData.data[i + 1], 0), 255);
                    imageData.data[i + 2] = Math.min(Math.max(imageData.data[i + 2], 0), 255);

                }



                // Store the image data as an output frame
                ctx.putImageData(imageData, 0, 0);
                outputFramesBuffer[idx] = canvas.toDataURL("image/webp");

                // Notify the finish of a frame
                finishFrame();
            };
            img.src = input1FramesBuffer[idx];
        }
    },
    earthquake: {
        setup: function() {
            // Prepare the parameters
            this.strength = parseInt($("#earthquake-strength").val());

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx, parameters) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');
            

            /*
             * TODO: Calculate the placement of the output frame
             */
            var dx = Math.floor(Math.random()*2*this.strength);
            var dy = Math.floor(Math.random()*2*this.strength);
            var str = this.strength;

            console.log("dx:", dx, "dy:", dy);


            // Draw the input frame in a new location and size
            var img = new Image();
            img.onload = function() {
            

                /*
                 * TODO: Draw the input frame appropriately
                 */
                var sw = w - 2*str;
                var sh = h - 2*str;
                console.log(sw, " ",sh);
                ctx.drawImage(img, dx, dy, sw, sh, 0, 0, w, h);

                outputFramesBuffer[idx] = canvas.toDataURL("image/webp");

                // Notify the finish of a frame
                finishFrame();
            };
            img.src = input1FramesBuffer[idx];
        }
    },
    crossFade: {
        setup: function() {
            // Prepare the parameters
            this.crossFadeDuration =
                Math.round(parseFloat($("#crossFade-duration").val()) * frameRate);

            /*
             * TODO: Prepare the duration and output buffer
             */
            outputDuration = (input1FramesBuffer.length==input2FramesBuffer.length)? input1FramesBuffer.length:0;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);

            this.begin_trans = (outputDuration -  this.crossFadeDuration)/2;
            this.end_trans = this.begin_trans +  this.crossFadeDuration;
            console.log(this.begin_trans);console.log(this.end_trans);console.log( this.crossFadeDuration);
        },
        process: function(idx) {
            // Use a canvas to store frame content
            var w1 = $("#input-video-1").get(0).videoWidth;
            var h1 = $("#input-video-1").get(0).videoHeight;
            var canvas1 = getCanvas(w1, h1);
            var ctx1 = canvas1.getContext('2d');
            // Use a canvas to store frame content
            var w2 = $("#input-video-2").get(0).videoWidth;
            var h2 = $("#input-video-2").get(0).videoHeight;
            var canvas2 = getCanvas(w2, h2);
            var ctx2 = canvas2.getContext('2d');

            //OUT
            var canvas = getCanvas(w1, h1);
            var ctx = canvas.getContext('2d');


            /*
             * TODO: Make the transition work
             */

            
            var imageData = ctx.getImageData(0, 0, w1, h1);
            var start = this.begin_trans;
            var end = this.end_trans;
            var dur = this.crossFadeDuration;
            

            var img1 = new Image();
            img1.onload = function() {
                // Get the image data object of the current frame
                ctx1.drawImage(img1, 0, 0);
                var imageData1 = ctx1.getImageData(0, 0, w1, h1);
                
                var img2 = new Image();
                img2.onload = function() {
                    // Get the image data object of the current frame
                    ctx2.drawImage(img2, 0, 0);
                    var imageData2 = ctx2.getImageData(0, 0, w2, h2);

                    //
                    var multiplier1 = 1;
                    var multiplier2 = 1;
                    //console.log("idx: ",idx, "start: ", start,"end: ", end,"dur: ", dur);
                    if(idx < start){
                        console.log("V1");
                        multiplier1 = 1;
                        multiplier2 = 0;
                    }else if(idx >= start && idx < end){
                        console.log("V1 + V2");
                        // 1 -> 0
                        //var ref = this.end_trans - this.overlap;
                        multiplier1 = 1 - (idx-start)/(end-start);
                        
                        // 0 -> 1
                        multiplier2 = (idx-start) / dur;
                        console.log("m1: ", multiplier1, "m2: ", multiplier2);

                    }else if(idx >= end){
                        console.log("V2");
                        multiplier1 = 0;
                        multiplier2 = 1;
                    }




                    for (var i = 0; i < imageData.data.length; i += 4) {
                        imageData.data[i]     =  0;// Red
                        imageData.data[i + 1] =  0;// Green
                        imageData.data[i + 2] =  0;// Blue
                        imageData.data[i + 3] =  255;


                        imageData.data[i]     +=  imageData1.data[i]*multiplier1 + imageData2.data[i]*multiplier2;// Red
                        imageData.data[i + 1] +=  imageData1.data[i+1]*multiplier1 + imageData2.data[i+1]*multiplier2;// Green
                        imageData.data[i + 2] +=  imageData1.data[i+2]*multiplier1 + imageData2.data[i+2]*multiplier2;// Blue

                        imageData.data[i] = Math.min(Math.max(imageData.data[i], 0), 255);
                        imageData.data[i + 1] = Math.min(Math.max(imageData.data[i + 1], 0), 255);
                        imageData.data[i + 2] = Math.min(Math.max(imageData.data[i + 2], 0), 255);
                    }

                    

                    //OUT
                    ctx.putImageData(imageData, 0, 0);
                    outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
                    finishFrame();
                    //
                    
                };
                img2.src = input2FramesBuffer[idx];
            };
            img1.src = input1FramesBuffer[idx];
            

            
        }
    },
    chroma1: {
        setup: function() {
            // Prepare the parameters
            this.chromaThreshold =
                parseFloat($("#chroma1-threshold").val());

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
                    const KEY_R = 0;
                    const KEY_G = 255;
                    const KEY_B = 0;

                    console.log(TOLERANCE);

                    for (let i = 0; i < imageData1.data.length; i += 4) {
                        imageData.data[i]     =  0;// Red
                        imageData.data[i + 1] =  0;// Green
                        imageData.data[i + 2] =  0;// Blue
                        imageData.data[i + 3] =  255;//hue
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
                            //imageData.data[i] = 0;     // R
                            //imageData.data[i + 1] = 0; // G
                            //imageData.data[i + 2] = 0; // B
                            // You can also copy over the alpha value if your videos do not have transparency:
                            // imageData.data[i + 3] = imageData2.data[i + 3]; // A
                            imageData.data[i] = 0;
                            imageData.data[i + 1] = 0;
                            imageData.data[i + 2] = 0;
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
    
};

// Handler for the "Apply" button click event
function applyEffect(e) {
    $("#progress-modal").modal("show");
    updateProgressBar("#effect-progress", 0);

    // Check which one is the actively selected effect
    switch(selectedEffect) {
        case "fadeInOut":
            currentEffect = effects.fadeInOut;
            break;
        case "reverse":
            currentEffect = effects.reverse;
            break;
        case "motionBlur":
            currentEffect = effects.motionBlur;
            break;
        case "earthquake":
            currentEffect = effects.earthquake;
            break;
        case "crossFade":
            currentEffect = effects.crossFade;
            break;
        case "chroma1":
            currentEffect = effects.chroma1;
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
