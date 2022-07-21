const MAP_OBJ_ENDPOINT = '../../map_obj.json';
const MAP_INFO_ENDPOINT = '../../map_info.json';
const MAP_ENDPOINT = '../../map.jpg';
const ZOOM_DX = 0.2;

class MapPoint extends DOMPoint  {
    type: string;
    color: string;
    icon: string;
    /**
     * 
     * @param {string} type 
     * @param {string} color 
     * @param {string} icon 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(type: string, color: string, icon: string, x: number, y: number) {
        super(x, y);
        this.type = type;
        this.color = color;
        this.icon = icon;
    }
}

class MapInfo {
    grid_steps: number[];
    grid_zero: number[];
    map_generation: number;
    map_max: number[];
    map_min: number[];
    /**
     * 
     * @param {Array<number>} grid_steps 
     * @param {Array<number>} grid_zero 
     * @param {number} map_generation 
     * @param {Array<number>} map_max 
     * @param {Array<number>} map_min 
     */
    constructor(grid_steps: Array<number>, grid_zero: Array<number>, map_generation: number,
    map_max: Array<number>, map_min: Array<number>) {
        this.grid_steps = grid_steps;
        this.grid_zero = grid_zero;
        this.map_generation = map_generation;
        this.map_max = map_max;
        this.map_min = map_min;
    }
}

let mapObjects: MapPoint[] = [];
let info = new MapInfo([],[],0,[],[]);
let isRealTimeModeOn = false;
let intervalId: number;
let isMouseDown = false;
let previousMouse = new DOMPoint(0,0); // (number of page-space pixels from the top left edge of the canvas element)
let offset = new DOMPoint(0,0); // (number of page-space pixels from the top left edge of the canvas element) 
let mouseFromWheel = new DOMPoint(0,0);
let deltaY = 0;
let origin = new DOMPoint(0,0); // the point around which scaling is applied.
let zoom = 1;


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas?.getContext('2d');

const image = new Image();
image.src = getMap();
image.onload = function() {
    render();
}

//TODO: Rewrite this method to be responsive only to the left mouse button
//TODO: set cursor image to grabbing hand when dragging...
canvas.addEventListener('mousedown', mousedownCallback)
canvas.addEventListener('mouseup', mouseupCallback)
canvas.addEventListener('mousemove', mousemoveCallback)

canvas.addEventListener('wheel', wheelCallback)
document.getElementById("button")?.addEventListener("click", toggleRealTimeMode);

/**
 * MODIFIES: this
 * EFFECTS: Default mouse-down actions are prevented, mousemove parameter is 
 *          set to the current mouse click point (page-space pixels),
 *          and the mouse down flag is set.
 * @param {MouseEvent} event 
 */
function mousedownCallback(event: MouseEvent) {
    event.preventDefault();
    const mouse = getMouse(event);
    previousMouse.x = mouse.x;
    previousMouse.y = mouse.y;
    isMouseDown = true;
}

/**
 * @param {MouseEvent} event 
 */
function mouseupCallback() {
    if (isMouseDown == true) {isMouseDown = false;}
}

/**
 * MODIFIES: this
 * @param {WheelEvent} event 
 */
function wheelCallback(event: WheelEvent) {
    event.preventDefault();
    mouseFromWheel = getMouse(event);
    deltaY = event.deltaY;
    render();
}

/**
 * REQUIRES: Previous mouse position must be defined.
 * MODIFIES: this
 * EFFECTS: If the mouse is being clicked, the offset parameter is incremented 
 *          by the mouse's change in position, previous mouse point parameter 
 *          is set to the current point, and the canvas is repainted.
 * @param {MouseEvent} event 
 */
function mousemoveCallback(event: MouseEvent) {
    if (isMouseDown == true) {
        const currentMouse = getMouse(event);
        offset.x += currentMouse.x - previousMouse.x;
        offset.y += currentMouse.y - previousMouse.y;
        previousMouse = currentMouse;
        render();
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
function getMouse(event: MouseEvent): DOMPoint {
    const x = event.pageX - canvas.offsetLeft;
    const y = event.pageY - canvas.offsetTop;
    return new DOMPoint(x, y);
}

/**
 * REQUIRES: mouse from wheel callback, offset, zoom, origin, mousewheel delta Y, canvas, context,
 *           and mapObjects list has to be defined.
 * MODIFIES: this
 * EFFECTS: Handles rendering of the canvas.
 */
function render() {
    handleZoom();
    draw();
}

/**
 * REQUIRES: canvas context, image, map objects list, and zoom to be defined.
 * MODIFIES: this
 * EFFECTS: Preforms setup translations on canvas context and then draws graphic elements.
 */
function draw() {
    if (ctx) {
        ctx.save();
        ctx.translate(offset.x / zoom, offset.y / zoom);

        ctx.drawImage(image, 0, 0);
        mapObjects.forEach(mapObject => {
            if (mapObject.type == "ground_model") {
                ctx.strokeStyle = mapObject.color;
                ctx.fillStyle = mapObject.color;
                ctx.beginPath();
                ctx.arc(mapObject.x * image.width, mapObject.y * image.height, 5 / zoom, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
            } else if (mapObject.type == "capture_zone") {
                ctx.strokeStyle = mapObject.color;
                ctx.beginPath();
                ctx.arc(mapObject.x * image.width, mapObject.y * image.height, 30 / zoom, 0, Math.PI*2);
                ctx.stroke();
            }
        })

        ctx.restore();
    }
}

/**
 * REQUIRES: mouse from wheel callback, offset, zoom, origin, mousewheel delta Y, canvas, context
 * MODIFIES: this
 * EFFECTS: Scales and clears the canvas using the mouse cursor as the transformation origin.
 */
function handleZoom() {
    if (ctx) {
        const scale = Math.exp(normalizeOrZero(deltaY) * ZOOM_DX)
        deltaY = 0; //prevent scaling using the same previous stored delta Y
        ctx.translate(origin.x, origin.y);
        const x = -offset.x + mouseFromWheel.x;
        origin.x -= x / (zoom * scale) - x / zoom;
        const y = -offset.y + mouseFromWheel.y;
        origin.y -= y / (zoom * scale) - y / zoom;
        ctx.scale(scale,scale);
        ctx.translate(-origin.x, -origin.y);

        zoom *= scale;
        
        ctx.clearRect(origin.x, origin.y, canvas.width / zoom, canvas.height / zoom);
    }
}

/**
 * EFFECTS: Returns 1 if x is greater than zero and -1 if x is less than zero; 
 *          if zero return zero.
 * @param {number} x 
 * @returns {number}
 */
function normalizeOrZero(x: number): number {
    if (x < 0) {
        return 1;
    } else if (x > 0) {
        return -1;
    } else {
        return 0;
    }
}

/**
 * MODIFIES: this
 * EFFECTS: Fetches map object data and replaces the items list;
 *          then canvas is repainted.
 */
async function update() {
    mapObjects = await getMapObj();
    render();
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

function handleError(reason: unknown) {
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
async function getMapObj(): Promise<Array<MapPoint>> {
    const data = await getJson(MAP_OBJ_ENDPOINT);
    var items: MapPoint[] = [];
    data.forEach((item: { type: string; color: string; icon: string; x: number; y: number; }) => {
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
async function getInfo(): Promise<MapInfo> {
    const data = await getJson(MAP_INFO_ENDPOINT);

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
async function getJson(url: RequestInfo | URL): Promise<any> {
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
function getMap(): string {
    return MAP_ENDPOINT;
}

export {};