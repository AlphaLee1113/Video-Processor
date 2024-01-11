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
        setup: function() {   // set things up before goin to the process funciton
            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx) {  // it wlll process each frame
            // Put the frames in reverse order
            outputFramesBuffer[idx] = input1FramesBuffer[(outputDuration - 1) - idx];

            // Notify the finish of a frame
            finishFrame(); // to move on next frame
        }
    },
    
    fadeInOut: {
        setup: function() {
            // Prepare the parameters

            // these are number of frames
            this.fadeInDuration = Math.round(parseFloat($("#fadeIn-duration").val()) * frameRate);
            this.fadeOutDuration = Math.round(parseFloat($("#fadeOut-duration").val()) * frameRate);
            

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function(idx) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;  //width
            var h = $("#input-video-1").get(0).videoHeight; // height
            var canvas = getCanvas(w, h);   // in memory canvas
            var ctx = canvas.getContext('2d');
            

            /*
             * TODO: Calculate the multiplier
             */
            
            //fade in is from 0 to 1
            // normal frame keep at 1 
            // fade out decrease from 1 to 0

            var multiplier = 1;
            if (idx < this.fadeInDuration) {
                // In the fade in region
                multiplier = idx/this.fadeInDuration;
            }
            else if (idx > outputDuration - this.fadeOutDuration) {
                // In the fade out region
                // multiplier = (idx - (outputDuration - this.fadeOutDuration))/this.fadeOutDuration;
                multiplier = (outputDuration - idx)/this.fadeOutDuration;
            }

            // Modify the image content based on the multiplier
            var img = new Image();
            img.onload = function() {
                // Get the image data object
                ctx.drawImage(img, 0, 0);
                var imageData = ctx.getImageData(0, 0, w, h);


                /*
                 * TODO: Modify the pixels
                 */
                // similar to image process and change pixelby pixel
                // need to +4 becuase have RGBA
                for (var i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i]     = imageData.data[i] * multiplier; // Red
                    imageData.data[i + 1] = imageData.data[i + 1] * multiplier; // Green
                    imageData.data[i + 2] = imageData.data[i + 2] * multiplier; // Blue
                    imageData.data[i + 3] = imageData.data[i + 3] * multiplier; // Alpha
                }

                
                // Store the image data as an output frame and put in canvas
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
                imageDataBuffer.push(imageData); // push at the end of the buffer
                if(imageDataBuffer.length > blurFrames){
                    imageDataBuffer.shift();// remove first item
                }
                // Create a blank image data
                imageData = new ImageData(w, h);
                // console.log("1 imageDataBuffer.length  is %d", imageDataBuffer.length);
                for (var i = 0; i < imageData.data.length; i += 4) {

                    imageData.data[i+3] = 255; //alpha is 255  opaque 
                    imageData.data[i] = 0;//Set the pixel to black 
                    imageData.data[i+1] = 0; 
                    imageData.data[i+2] = 0;
                    
                    for (var j = 0; j < imageDataBuffer.length; ++j) {
                        //Combine the pixels from the image data buffer...
                        imageData.data[i] += imageDataBuffer[j].data[i]/imageDataBuffer.length; //red
                        imageData.data[i+1] += imageDataBuffer[j].data[i+1]/imageDataBuffer.length; // green 
                        imageData.data[i+2] += imageDataBuffer[j].data[i+2]/imageDataBuffer.length; // blue
                        // console.log("imageDataBuffer[j].data[1] is &s", typeof (imageDataBuffer[j].data[1]));
                    }
                    // imageData.data[i] = imageData.data[i] /imageDataBuffer.length;  //r
                    // imageData.data[i+1] = imageData.data[i+1] /imageDataBuffer.length;
                    // imageData.data[i+2] = imageData.data[i+2]/imageDataBuffer.length;   
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
             *///determine the movement or zooming of frame
            var dx = Math.random() * 2 *  this.strength;
            var dy = Math.random() * 2 *  this.strength;
            var sw = w- 2* this.strength;
            var sh = h- 2* this.strength;


            // Draw the input frame in a new location and size
            var img = new Image();
            img.onload = function() {
                /*
                 * TODO: Draw the input frame appropriately
                 */
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
            outputDuration = input1FramesBuffer.length + input2FramesBuffer.length - this.crossFadeDuration;
            // console.log("outputDuration is", outputDuration); //175 frame
            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);

        },
        process: function(idx) {
            /*
             * TODO: Make the transition work
             */
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;  //width of video 1
            var h = $("#input-video-1").get(0).videoHeight; // height of video 1 video 2 has same height

            var canvas = getCanvas(w, h);   // in memory canvas
            var ctx = canvas.getContext('2d');

            /*
             * TODO: Calculate the multiplier
             */
            var multiplier_of_input2 = 1;
            // console.log("idx now is %d", idx)
            if (idx >= (input1FramesBuffer.length-this.crossFadeDuration) && idx < input1FramesBuffer.length) {
                // In the fade in region
                multiplier_of_input2 = (idx-(input1FramesBuffer.length-this.crossFadeDuration))/this.crossFadeDuration;
            }
            var multiplier_of_input1 = 1 - multiplier_of_input2;

            // Modify the image content based on the multiplier
            // var img = new Image();

            // console.log("input1FramesBuffer is %d", input1FramesBuffer.length);   125 frame
            // console.log("this.crossFadeDuration is %d", this.crossFadeDuration);       75 frame
            // console.log("(input1FramesBuffer.length-this.crossFadeDuration) && idx < input1FramesBuffer.length is ", (idx > (input1FramesBuffer.length-this.crossFadeDuration) && idx < input1FramesBuffer.length));
            //  ouput is 50

            if(idx < (input1FramesBuffer.length-this.crossFadeDuration)){  //0~49 frame
                var img = new Image();
                // console.log("now inside if(idx < (input1FramesBuffer.length-this.crossFadeDuration) and idx is %d", idx);
                img.onload = function() {
                    // Get the image data object
                    ctx.drawImage(img, 0, 0);
                    var imageData = ctx.getImageData(0, 0, w, h);
    
                    for (var i = 0; i < imageData.data.length; i += 4) {
                        imageData.data[i]     = imageData.data[i]; // Red
                        imageData.data[i + 1] = imageData.data[i + 1]; // Green
                        imageData.data[i + 2] = imageData.data[i + 2]; // Blue
                        imageData.data[i + 3] = imageData.data[i + 3]; // Alpha
                    }
                    // Store the image data as an output frame and put in canvas
                    ctx.putImageData(imageData, 0, 0);
                    outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
    
                    // Notify the finish of a frame
                    finishFrame();
                };
                img.src = input1FramesBuffer[idx];
                // outputFramesBuffer[idx] = input1FramesBuffer[idx];
                // finishFrame();

            }
            else if(idx >= (input1FramesBuffer.length-this.crossFadeDuration) && idx < input1FramesBuffer.length){  //50~124
                    var img1 = new Image();
                    var img2 = new Image();
                    var imageData1;
                    var imageData2;

                    // var w = $("#input-video-1").get(0).videoWidth;  //width of video 1
                    // var h = $("#input-video-1").get(0).videoHeight; // height of video 1 video 2 has same height

                    // var canvas = getCanvas(w, h);   // in memory canvas
                    // var ctx = canvas.getContext('2d');

                
                    // console.log("now  else if(idx > (input1FramesBuffer.length-this.crossFadeDuration) && idx < input1FramesBuffer.length)");
                    var idx2 = idx-(input1FramesBuffer.length-this.crossFadeDuration);
                    img1.onload = function() {
                        img2.src = input2FramesBuffer[idx2];
                        // console.log("INSISDE IMAGE 1");
                        // Get the image data object
                        ctx.drawImage(img1, 0, 0);
                        imageData1 = ctx.getImageData(0, 0, w, h);
                        // console.log("multiplier_of_input1 is %d", multiplier_of_input1);
                        // console.log("multiplier_of_input2 is %d", multiplier_of_input2);
        
                        for (var i = 0; i < imageData1.data.length; i += 4) {
                            imageData1.data[i]     = imageData1.data[i] * multiplier_of_input1; // Red
                            imageData1.data[i + 1] = imageData1.data[i + 1] * multiplier_of_input1; // Green
                            imageData1.data[i + 2] = imageData1.data[i + 2] * multiplier_of_input1; // Blue
                            imageData1.data[i + 3] = imageData1.data[i + 3] * multiplier_of_input1; // Alpha
                        }
                        // Store the image data as an output frame and put in canvas
                        ctx.putImageData(imageData1, 0, 0);
                        outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
                    };
                    

                    img2.onload = function() {
                        // console.log("INSISDE IMAGE 2");
                        // Get the image data object
                        ctx.drawImage(img2, 0, 0);
                        imageData2 = ctx.getImageData(0, 0, w, h);
        
                        for (var i = 0; i < imageData2.data.length; i += 4) {
                            imageData2.data[i]     = imageData2.data[i] * multiplier_of_input2 + imageData1.data[i]; // Red
                            imageData2.data[i + 1] = imageData2.data[i + 1] * multiplier_of_input2 + imageData1.data[i+1]; // Green
                            imageData2.data[i + 2] = imageData2.data[i + 2] * multiplier_of_input2 + imageData1.data[i+2]; // Blue
                            imageData2.data[i + 3] = imageData2.data[i + 3] * multiplier_of_input2 + imageData1.data[i+3]; // Alpha
                        }
                        // Store the image data as an output frame and put in canvas
                        ctx.putImageData(imageData2, 0, 0);
                        outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
        
                        // Notify the finish of a frame
                        finishFrame();
                    };img1.src = input1FramesBuffer[idx];

                    
            }
            
            else if(idx >= input1FramesBuffer.length){ //125 ~175
                var img = new Image();
                // console.log("now  else if(idx > input1FramesBuffer)");
                img.onload = function() {
                    // Get the image data object
                    ctx.drawImage(img, 0, 0);
                    var imageData = ctx.getImageData(0, 0, w, h);
    
                    for (var i = 0; i < imageData.data.length; i += 4) {
                        imageData.data[i]     = imageData.data[i]; // Red
                        imageData.data[i + 1] = imageData.data[i + 1]; // Green
                        imageData.data[i + 2] = imageData.data[i + 2]; // Blue
                        imageData.data[i + 3] = imageData.data[i + 3]; // Alpha
                    }
                    // Store the image data as an output frame and put in canvas
                    ctx.putImageData(imageData, 0, 0);
                    outputFramesBuffer[idx] = canvas.toDataURL("image/webp");
    
                    // Notify the finish of a frame
                    finishFrame();
                };
                img.src = input2FramesBuffer[idx-(input1FramesBuffer.length-this.crossFadeDuration)];
            }
        }
    }
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
