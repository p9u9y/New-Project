const MAP_OBJ_ENDPOINT = 'http://localhost:8111/map_obj.json';
const MAP_INFO_ENDPOINT = 'http://localhost:8111/map_info.json';
const MAP_ENDPOINT = 'http://localhost:8111/map.img';
const TEST_MAP_OBJ_ENDPOINT = 'map_obj.json';
const TEST_MAP_INFO_ENDPOINT = 'map_info.json';
const TEST_MAP_ENDPOINT = 'map.jpg';
const MIN_ZOOM = 0.125;
const MAX_ZOOM = 4;
class Point {
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * EFFECTS: Returns the distance between two given points.
     * @param {Point} a 
     * @param {Point} b 
     * @returns {number}
     */
        static distance(a, b) {
        dx = a.x - b.x;
        dy = a.y - b.y;
        return Math.hypot(dx, dy);
    }
}

class MapPoint extends Point  {
    /**
     * 
     * @param {string} type 
     * @param {string} color 
     * @param {string} icon 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(type, color, icon, x, y) {
        super(x, y);
        this.type = type;
        this.color = color;
        this.icon = icon;
    }
}

class MapInfo {
    /**
     * 
     * @param {Array<number>} grid_steps 
     * @param {Array<number>} grid_zero 
     * @param {number} map_generation 
     * @param {Array<number>} map_max 
     * @param {Array<number>} map_min 
     */
    constructor(grid_steps, grid_zero, map_generation,
    map_max, map_min) {
        this.grid_steps = grid_steps;
        this.grid_zero = grid_zero;
        this.map_generation = map_generation;
        this.map_max = map_max;
        this.map_min = map_min;
    }
}

var items = [];
var info = new MapInfo(0,0,0,0,0);
var isRealTimeModeOn = false;
var intervalId;
var isMouseDown = false;
var hasMouseDragged = false;
var previousMouse = new Point(0,0); // (number of page-space pixels from the top left edge of the canvas element)
var offset = new Point(0,0); // (number of page-space pixels from the top left edge of the canvas element) 
var mouseWhenScroll = new Point(0,0);
var wheelValue = 0;
var origin = new Point(0,0); // the point around which scaling is applied.
var zoom = 1;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const toggleBtn = document.getElementById("button");

image = new Image();
image.src = getMap();
image.onload = function() {
    repaint();
}

//TODO: Rewrite this method to be responsive only to the left mouse button
//TODO: set cursor image to grabbing hand when dragging...
canvas.addEventListener('mousedown', mousedown)
canvas.addEventListener('mouseup', mouseup)
canvas.addEventListener('mousemove', mousemoveAction)

canvas.addEventListener('wheel', wheel)
toggleBtn.addEventListener("click", toggleRealTimeMode);

/**
 * MODIFIES: this
 * EFFECTS: Default mouse-down actions are prevented, mousemove parameter is 
 *          set to the current mouse click point (page-space pixels),
 *          and the mouse down flag is set.
 * @param {MouseEvent} event 
 */
function mousedown(event) {
    event.preventDefault();
    const mouse = getMouse(event);
    previousMouse.x = mouse.x;
    previousMouse.y = mouse.y;
    isMouseDown = true;
}

/**
 * @param {MouseEvent} event 
 */
function mouseup(event) {
    if (isMouseDown == true) {isMouseDown = false;}
}

/**
 * MODIFIES: this
 * @param {MouseEvent} event 
 */
function wheel(event) {
    event.preventDefault();
    mouseWhenScroll = getMouse(event);
    wheelValue = -event.deltaY * 0.001;
    repaint();
}

/**
 * REQUIRES: Previous mouse position must be defined.
 * MODIFIES: this
 * EFFECTS: If the mouse is being clicked, the offset parameter is incremented 
 *          by the mouse's change in position, previous mouse point parameter 
 *          is set to the current point, and the canvas is repainted.
 * @param {MouseEvent} event 
 */
function mousemoveAction(event) {
    if (isMouseDown == true) {
        const currentMouse = getMouse(event);
        offset.x += currentMouse.x - previousMouse.x;
        offset.y += currentMouse.y - previousMouse.y;
        previousMouse = currentMouse;
        repaint();
    }
}

/**
 * REQUIRES: The canvas must be defined.
 * EFFECTS: Returns a point representing the number of pixels between the 
 *          mouse X coordinate and the canvas left bound (in page space), 
 *          and the number of pixels between the mouse Y coordinate and 
 *          the canvas top bound (in page space).
 * @param {MouseEvent} event 
 * @returns {Point}
 */
function getMouse(event) {
    const x = event.pageX - canvas.offsetLeft;
    const y = event.pageY - canvas.offsetTop;
    return new Point(x, y);
}

/**
 * REQUIRES: mouse, offset, zoom, origin, wheel, canvas, ctx,
 *           items, and markers must be defined.
 * MODIFIES: this
 * NOTE: This method is solely responsible for drawing on the canvas.
 * EFFECTS: Paints the canvas element.
 */
function repaint() {
    const newZoom = Math.min(Math.max(MIN_ZOOM, zoom + wheelValue), MAX_ZOOM);
    wheelValue = 0;
    // NOTE: origin has already been calculated with zoom scale
    ctx.translate(origin.x, origin.y);
    ctx.setTransform(newZoom, 0, 0, newZoom, 0 ,0)
    origin.x -= (-offset.x + mouseWhenScroll.x) / newZoom - (-offset.x + mouseWhenScroll.x) / zoom;  
    origin.y -= (-offset.y + mouseWhenScroll.y) / newZoom - (-offset.y + mouseWhenScroll.y) / zoom;   

    //TODO: refactor this such that it is more clear that you are using a newly-scaled origin to translate
    ctx.translate(-origin.x, -origin.y);
    zoom = newZoom;

    ctx.clearRect(
        origin.x,
        origin.y,
        canvas.width / zoom,
        canvas.height / zoom);
    ctx.drawImage(image, offset.x / zoom, offset.y / zoom);
    items.forEach(item => {
        if (item.type == "ground_model") {
            ctx.strokeStyle = item.color;
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(offset.x / zoom + item.x * image.width, offset.y /zoom + item.y * image.height, 5 / zoom, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
        } else if (item.type == "capture_zone") {
            ctx.strokeStyle = item.color;
            ctx.beginPath();
            ctx.arc(offset.x / zoom + item.x * image.width, offset.y / zoom + item.y * image.height, 30 / zoom, 0, Math.PI*2);
            ctx.stroke();
        }
    })
}

/**
 * MODIFIES: this
 * EFFECTS: Fetches map object data and replaces the items list;
 *          then canvas is repainted.
 */
async function update() {
    items = await getMapObj();
    repaint();
}

/**
 * MODIFIES: this
 * EFFECTS: Gets and sets initial data taken from map info api and map image api
 */
async function init() {
    image.src = getMap();
    try {
        info = await getInfo();
    } catch (reason) {
        handleError(reason)
    }
}

function toggleRealTimeMode() {
    if (!isRealTimeModeOn) {
        startUpdate();
    } else {
        stopUpdate();
    }
}

function startUpdate() {
    init();
    intervalId = setInterval(update, 1000);
    isRealTimeModeOn = true;
}

function stopUpdate() {
    clearInterval(intervalId)
    isRealTimeModeOn = false;
}

function handleError(reason) {
    if (isRealTimeModeOn) {
        stopUpdate();
        console.error(reason);
    }
}

/**
 * REQUIRES: URL has to be valid.
 * EFFECTS: Returns an array of ground models and capture zones fetched 
 *          from an api.
 *          
 * @returns {Promise<Array<MapPoint>>} 
 */
async function getMapObj() {
    const data = await getJson(TEST_MAP_OBJ_ENDPOINT);
    var items = [];
    data.forEach(item => {
        if (item.type == "ground_model" || item.type == "capture_zone") {
            items.push(new MapPoint(item.type,
                item.color,
                item.icon,
                item.x,
                item.y))
        }
    })
    return items;
}

/**
 * REQUIRES: URL has to be valid.
 * EFFECTS: Fetches and returns a map info object.
 * @returns {Promise<MapInfo>}
 */
async function getInfo() {
    const data = await getJson(TEST_MAP_INFO_ENDPOINT);

    const grid_steps = data.grid_steps;
    const grid_zero = data.grid_zero;
    const map_generation = data.map_generation;
    const map_max = data.map_max;
    const map_min = data.map_min;

    return new MapInfo(
            grid_steps, 
            grid_zero,
            map_generation,
            map_max,
            map_min
        )
    ;
}

/**
 * REQUIRES: URL has to provide a JSON file.
 * @param {RequestInfo | URL} url 
 * @returns {Promise<any>}
 */
async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Network response was not OK'); 
    }
    return response.json();
}

/**
 * REQUIRES: URL has to be valid.
 * @returns {string}
 */
function getMap() {
    return TEST_MAP_ENDPOINT;
}

