
var isDragging = false;
var prevX = 0;
var prevY = 0;
var moveX = 0;
var moveY = 0;
var originX = 0;
var originY = 0;
var scaleValue = 1;
var width = 800;
var height = 800;

var canvas = document.getElementById('myCanvas');
var context = canvas.getContext('2d');

canvas.width = width;
canvas.height = height;

//TODO: scale image to fit canvas on initial load
image = new Image();
image.src = './map.jpg'
image.onload = function() {
    repaint();
}

//TODO: set cursor image to grabbing hand when dragging...
canvas.addEventListener('mousedown', function(event) {
    isDragging = true;
    // canvas.style.cursor = "move";
})

canvas.addEventListener('mouseup', function() {
    isDragging = false;
    // canvas.style.cursor = "default";
    prevX = 0;
    prevY = 0;
    
})

canvas.addEventListener('mousemove', function(event) {
    if (isDragging == true) {
        if (prevX>0 || prevY>0) {
            moveX += (event.pageX - prevX)/scaleValue;
            moveY += (event.pageY - prevY)/scaleValue;
            repaint();
        }

        prevX = event.pageX;
        prevY = event.pageY;
    }
})

//TODO: Refactor this function so that scaling is exponential and not linear
canvas.addEventListener('wheel', function(event) {
    event.preventDefault();
    let mouseX = event.pageX - canvas.offsetLeft;
    let mouseY = event.pageY - canvas.offsetTop;
    let scaleFactor = -event.deltaY*0.001;
    let scaleValue1 = Math.min(Math.max(0.125, scaleValue+scaleFactor), 4);

    context.translate(originX, originY);
    originX -= mouseX/(scaleValue1) - mouseX/scaleValue;
    originY -= mouseY/(scaleValue1) - mouseY/scaleValue;

    context.setTransform(scaleValue1,0,0,scaleValue1,0,0);
    context.translate(-originX, -originY);

    scaleValue = scaleValue1;

    repaint();
})

function repaint() {
    context.clearRect(originX,originY,width/scaleValue,height/scaleValue);
    context.drawImage(image, moveX, moveY);
}
