// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function(){var lastTime=0;var vendors=['ms','moz','webkit','o'];for(var x=0;x<vendors.length&&!window.requestAnimationFrame;++x){window.requestAnimationFrame=window[vendors[x]+'RequestAnimationFrame'];window.cancelAnimationFrame=window[vendors[x]+'CancelAnimationFrame']||window[vendors[x]+'CancelRequestAnimationFrame'];}if(!window.requestAnimationFrame){window.requestAnimationFrame=function(callback,element){var currTime = new Date().getTime();var timeToCall=Math.max(0,16-(currTime-lastTime));var id=window.setTimeout(function(){callback(currTime+timeToCall);},timeToCall);lastTime=currTime+timeToCall;return id;};}if(!window.cancelAnimationFrame){window.cancelAnimationFrame=function(id){clearTimeout(id);};}}());


(function(){

var getTimeStamp;
if(window.performance.now) {
    getTimeStamp = function(){return window.performance.now();};
}
else if(window.perfomance.webkitNow) {
    getTimeStamp = function(){return window.perfomance.webkitNow();};
}
else {
    getTimeStamp = function(){return new Date().getTime();};
}

var SIM_TIME;
var TIME_STEP = 16; // ms
var BOARD_DIM = [10, 10]; // w, h
var BOARD_SEP = 40;
var BOARD_HALF_SEP = Math.floor(BOARD_SEP / 2);
var BOARD_LINE_COLOR = '#ccc';
var BOARD_LINE_WIDTH = 1;
var BOARD_LINE_OFFSET = .5;
var BOARD_PEBBLE_RADIUS = 2;
var MCOORDS = {x:0, y:0}; // pixel coords
var MCLICK_HANDLED = true;
var SELECTED_COORDS = {x:-1, y:-1}; // board coords
var MOUSE_HIGHLIGHT_COLOR = '#f00';
var MOUSE_HIGHLIGHT_RADIUS = 3; // pixels
var APPLE = {
    x: -1, y: -1, // board coords
    radius: 6, // pixels
    color: '#0a0',
    visible: false
};
var SNAKE_POOL = [];
var SNAKE_SEG_POOL = [];
var SNAKE_MIN_LENGTH = 1;
var SNAKE_MAX_LENGTH = 5;
var SNAKE_SPEED = 40;
var NORTH = 0;
var EAST = 1;
var SOUTH = 2;
var WEST = 3;
var NORTHEAST = 4;
var NORTHWEST = 5;
var SOUTHEAST = 6;
var SOUTHWEST = 7;
var BARRICADE_SIZE = 8;
var BARRICADE_COLOR = '#aaa';
var OBJECTS = [];
var OBJT_NONE = -1;
var OBJT_BARRICADE = 0;


var canvas = document.getElementById('gameboard');
var ctx = canvas.getContext('2d');

canvas.width = BOARD_DIM[0] * BOARD_SEP;
canvas.height = BOARD_DIM[1] * BOARD_SEP;


function randIntBetween(max, min) {
    return Math.floor(Math.random() * (max - min) + min);
}


function Snake() {
    this._prev = {x:-1, y:-1}; // board coords
    this._next = {x:-1, y:-1}; // board coords
    this._direction_log = [];
    this.reset();
}
Snake.prototype.reset = function() {
    this.active = true; // so doesn't get snagged as free in pool
    this.enabled = false; // whether or not the snake is updated/drawn
    this.headx = -1; // pixel coordinate
    this.heady = -1; // pixel coordinate
    this.direction = -1;
    this.color = '#0ff';
    this.headradius = 5;
    this.speed = SNAKE_SPEED;
    this.length = randIntBetween(SNAKE_MAX_LENGTH, SNAKE_MIN_LENGTH);
    this._prev.x = this._prev.y = this._next.x = this._next.y = -1;
    this._started = false;
};
Snake.prototype._select_next = function() {
    // only switch directions after we've started moving
    if(this._started) {
        var obj = OBJECTS[this._prev.x][this._prev.y];
        if(obj.t == OBJT_BARRICADE) {
            this.direction = obj.dir;
        }
        else {
            var ax = APPLE.x * BOARD_SEP + BOARD_LINE_OFFSET;
            var ay = APPLE.y * BOARD_SEP + BOARD_LINE_OFFSET;
            var diffx = Math.abs(this.headx - ax);
            var diffy = Math.abs(this.heady - ay);

            var weights = [0, 0, 0, 0]; // n, e, s, w
            var olddir = this._direction_log[this._direction_log.length-1];
            var olddirto = -1;
            if(olddir == NORTH) {olddirto = SOUTH;}
            else if(olddir == EAST) {olddirto = WEST;}
            else if(olddir == SOUTH) {olddirto = NORTH;}
            else if(olddir == WEST) {olddirto = EAST;}
            weights[olddirto] = -10; // weight against previous move heavily

            // weight for the closer axis containing the closer direction
            if(diffx > diffy) {
                weights[EAST] += 1;
                weights[WEST] += 1;
            }
            else {
                weights[NORTH] += 1;
                weights[SOUTH] += 1;
            }

            // weight for the direction the apple is from the snake, and against
            // the opposite direction
            if(ax > this.headx) { weights[EAST] += 1; weights[WEST] -= 2; }
            else if(ax < this.headx) { weights[WEST] += 1; weights[EAST] -= 2 }

            if(ay > this.heady) { weights[SOUTH] += 1; weights[NORTH] -= 2; }
            else if(ay < this.heady) { weights[NORTH] += 1; weights[SOUTH] -= 2; }


            // select the direction based on the weights
            maxindex = 0;
            if(weights[EAST] > weights[maxindex]) {maxindex = EAST;}
            else if(weights[EAST] == weights[maxindex]) { maxindex = (Math.random() > .5) ? EAST : maxindex; }

            if(weights[SOUTH] > weights[maxindex]) {maxindex = SOUTH;}
            else if(weights[SOUTH] == weights[maxindex]) { maxindex = (Math.random() > .5) ? SOUTH : maxindex; }

            if(weights[WEST] > weights[maxindex]) {maxindex = WEST;}
            else if(weights[WEST] == weights[maxindex]) { maxindex = (Math.random() > .5) ? WEST : maxindex; }

            this.direction = maxindex;
        }
    }
    this._started = true;

    if(this.direction == NORTH) {
        this._next.x = this._prev.x;
        this._next.y = this._prev.y - 1;
    }
    else if(this.direction == EAST) {
        this._next.x = this._prev.x + 1;
        this._next.y = this._prev.y;
    }
    else if(this.direction == SOUTH) {
        this._next.x = this._prev.x;
        this._next.y = this._prev.y + 1;
    }
    else if(this.direction == WEST) {
        this._next.x = this._prev.x - 1;
        this._next.y = this._prev.y;
    }

    this._direction_log.push(this.direction);
};
Snake.prototype.update = function(dt) {
    // do we have a next selected position? if not, select one.
    if(this._next.x < 0 || this._next.y < 0) {
        this._select_next();
    }

    // -- UPDATE POSITION ----------------------
    var spd = dt / this.speed;
    var xvel = 0, yvel = 0;
    if(this.direction == NORTH) {yvel = -1*spd;}
    else if(this.direction == EAST) {xvel = spd;}
    else if(this.direction == SOUTH) {yvel = spd;}
    else if(this.direction == WEST) {xvel = -1*spd;}

    this.headx += xvel;
    this.heady += yvel;

    // have we gone past the next selected position? if so, then move back.
    var nx = this._next.x * BOARD_SEP + BOARD_LINE_OFFSET;
    var ny = this._next.y * BOARD_SEP + BOARD_LINE_OFFSET;
    if(this.direction == NORTH && ny > this.heady) {this.heady = ny;}
    else if(this.direction == EAST && nx < this.headx) {this.headx = nx;}
    else if(this.direction == SOUTH && ny < this.heady) {this.heady = ny;}
    else if(this.direction == WEST && nx > this.headx) {this.headx = nx;}

    // if we've reached the next position, select the next position
    if(this.headx == nx && this.heady == ny) {
        this._prev.x = this._next.x;
        this._prev.y = this._next.y;
        this._select_next();
    }
};
Snake.prototype.draw = function() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.headx, this.heady, this.headradius, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fill();
};
// set the snake to the specified board position
Snake.prototype.set_pos = function(x, y) {
    this.headx = x * BOARD_SEP + BOARD_LINE_OFFSET;
    this.heady = y * BOARD_SEP + BOARD_LINE_OFFSET;
    this._prev.x = x;
    this._prev.y = y;
};

function get_snake() {
    for(var i; i < SNAKE_POOL.length; i++) {
        if(!SNAKE_POOL[i].active) {
            SNAKE_POOL[i].reset();
            return i;
        }
    }

    SNAKE_POOL.push(new Snake());
    return SNAKE_POOL.length-1;
}

function put_snake_in_play() {
    var s = SNAKE_POOL[get_snake()];
    var x, y; // board coords
    if(Math.random() > .5) {
        x = randIntBetween(BOARD_DIM[0]-1, 1);
        if(Math.random() > .5) {
            y = 0;
            s.direction = SOUTH;
        }
        else {
            y = BOARD_DIM[1];
            s.direction = NORTH;
        }
    }
    else {
        y = randIntBetween(BOARD_DIM[1]-1, 1);
        if(Math.random() > .5) {
            x = 0;
            s.direction = EAST;
        }
        else {
            x = BOARD_DIM[0];
            s.direction = WEST;
        }
    }
    s.set_pos(x, y);
    s.enabled = true;
}


function add_barricade(dir_pointing) {
    if(SELECTED_COORDS.x < 0 || SELECTED_COORDS.y < 0) {
        return;
    }
    var obj = OBJECTS[SELECTED_COORDS.x][SELECTED_COORDS.y];
    var x, y;
    x = SELECTED_COORDS.x * BOARD_SEP + BOARD_LINE_OFFSET;
    y = SELECTED_COORDS.y * BOARD_SEP + BOARD_LINE_OFFSET;
    obj.render = function(){drawBarricade(dir_pointing, x, y);};
    obj.active = true;
    obj.t = OBJT_BARRICADE;
    obj.dir = dir_pointing;
}



function calcRelCoords(ev) {
    var x, y;

    // chrome
    if(ev.offsetX !== undefined && ev.offsetY !== undefined){
        x = ev.offsetX;
        y = ev.offsetY;
    }
    // ff
    else if(ev.layerX !== undefined && ev.layerY !== undefined){
        x = ev.layerX;
        y = ev.layerY;
    }
    // gen solution
    else {
        var toffx = 0;
        var toffy = 0;
        var curel = this;

        do {
            toffx = curel.offsetLeft - curel.scrollLeft;
            toffy = curel.offsetTop - curel.scrollTop;
        } while(curel = curel.offsetParent);

        x = ev.pageX - toffx + document.body.scrollLeft;
        y = ev.pageY - toffy + document.body.scrollTop;
    }
    
    MCOORDS.x = x;
    MCOORDS.y = y;
    MCLICK_HANDLED = false;
}
HTMLCanvasElement.prototype.calcRelCoords = calcRelCoords;
canvas.addEventListener("click", calcRelCoords, false);


function setSelectedCoords() {
    SELECTED_COORDS.x = Math.floor(MCOORDS.x / BOARD_SEP);
    SELECTED_COORDS.y = Math.floor(MCOORDS.y / BOARD_SEP);
    if(MCOORDS.x % BOARD_SEP > BOARD_HALF_SEP) { SELECTED_COORDS.x += 1; }
    if(MCOORDS.y % BOARD_SEP > BOARD_HALF_SEP) { SELECTED_COORDS.y += 1; }

    var illegal =
            // selecting any of the outside edge is an 'illegal' selection
            SELECTED_COORDS.x == 0 || SELECTED_COORDS.x == BOARD_DIM[0]
            || SELECTED_COORDS.y == 0 || SELECTED_COORDS.y == BOARD_DIM[1]
            // select the apple isn't allowed
            || (APPLE.visible && SELECTED_COORDS.x == APPLE.x && SELECTED_COORDS.y == APPLE.y);

    if(illegal) {
        SELECTED_COORDS.x = SELECTED_COORDS.y = -1;
    }
}

function update(dt) {
    if(!MCLICK_HANDLED) {
        setSelectedCoords()
        MCLICK_HANDLED = true;
    }

    if(!APPLE.visible) {
        var minx, miny, maxx, maxy;
        minx = miny = 2;
        maxx = BOARD_DIM[0]-2;
        maxy = BOARD_DIM[1]-2;
        APPLE.x = randIntBetween(maxx, minx);
        APPLE.y = randIntBetween(maxy, miny);
        APPLE.visible = true;
    }

    var snake;
    for(var i = 0; i < SNAKE_POOL.length; i++) {
        snake = SNAKE_POOL[i];
        if(!snake.active || !snake.enabled) {continue;}
        snake.update(dt);
    }
}


function drawBarricade(dir_pointing, cx, cy) {
    var minx = cx-BARRICADE_SIZE;
    var maxx = cx+BARRICADE_SIZE;
    var miny = cy-BARRICADE_SIZE;
    var maxy = cy+BARRICADE_SIZE;
    ctx.fillStyle = BARRICADE_COLOR;
    ctx.beginPath();
    if(dir_pointing == NORTH) {
        ctx.moveTo(cx, miny);
        ctx.lineTo(maxx, cy);
        ctx.lineTo(minx, cy);
        ctx.lineTo(cx, miny);
    }
    else if(dir_pointing == EAST) {
        ctx.moveTo(maxx, cy);
        ctx.lineTo(cx, maxy);
        ctx.lineTo(cx, miny);
        ctx.lineTo(maxx, cy);
    }
    else if(dir_pointing == SOUTH) {
        ctx.moveTo(cx, maxy);
        ctx.lineTo(minx, cy);
        ctx.lineTo(maxx, cy);
        ctx.lineTo(cx, maxy);
    }
    else if(dir_pointing == WEST) {
        ctx.moveTo(minx, cy);
        ctx.lineTo(cx, miny);
        ctx.lineTo(cx, maxy);
        ctx.lineTo(minx, cy);
    }
    ctx.closePath();
    ctx.fill();
}

function drawObjects() {
    for(var x = 0; x < OBJECTS.length; x++) {
        for(var y = 0; y < OBJECTS[x].length; y++) {
            if(OBJECTS[x][y].active && OBJECTS[x][y].render !== -1) {
                OBJECTS[x][y].render();
            }
        }
    }
}


function drawBoard() {
    ctx.fillStyle = BOARD_LINE_COLOR;
    ctx.strokeStyle = BOARD_LINE_COLOR;
    ctx.lineWidth = BOARD_LINE_WIDTH;
    ctx.beginPath();
    var tx, ty;
    for(var x = 1; x < BOARD_DIM[0]; x++) {
        tx = x * BOARD_SEP + BOARD_LINE_OFFSET;
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, canvas.height);
    }
    for(var y = 1; y < BOARD_DIM[1]; y++ ) {
        ty = y * BOARD_SEP + BOARD_LINE_WIDTH;
        ctx.moveTo(0, ty);
        ctx.lineTo(canvas.width, ty);
    }
    for(var x = 1; x < BOARD_DIM[0]; x++) {
        for(var y = 1; y < BOARD_DIM[1]; y++) {
            tx = x * BOARD_SEP + BOARD_LINE_OFFSET;
            ty = y * BOARD_SEP + BOARD_LINE_WIDTH;
            ctx.moveTo(tx, ty);
            ctx.arc(tx, ty, BOARD_PEBBLE_RADIUS, 0, 2 * Math.PI, false);
        }
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
}

function drawMouseHighlight() {
    if(SELECTED_COORDS.x < 0 || SELECTED_COORDS.y < 0) {return;}
    ctx.fillStyle = MOUSE_HIGHLIGHT_COLOR;
    ctx.beginPath();
    ctx.arc(SELECTED_COORDS.x*BOARD_SEP+BOARD_LINE_OFFSET, SELECTED_COORDS.y*BOARD_SEP+BOARD_LINE_OFFSET, MOUSE_HIGHLIGHT_RADIUS, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fill();
}

function drawApple() {
    if(!APPLE.visible) {return;}
    ctx.fillStyle = APPLE.color;
    ctx.beginPath();
    ctx.arc(APPLE.x*BOARD_SEP+BOARD_LINE_OFFSET, APPLE.y*BOARD_SEP+BOARD_LINE_OFFSET, APPLE.radius, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fill();
}

function render() {
    // clear the canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // -- tmp background --
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    drawBoard();
    drawObjects();
    drawMouseHighlight();
    drawApple();

    var snake;
    for(var i = 0; i < SNAKE_POOL.length; i++) {
        snake = SNAKE_POOL[i];
        if(!snake.active || !snake.enabled) {continue;}
        snake.draw();
    }

    //drawBarricade(NORTH, 2*BOARD_SEP+BOARD_LINE_OFFSET, 2*BOARD_SEP+BOARD_LINE_OFFSET);
    //drawBarricade(EAST, 3*BOARD_SEP+BOARD_LINE_OFFSET, 2*BOARD_SEP+BOARD_LINE_OFFSET);
    //drawBarricade(SOUTH, 4*BOARD_SEP+BOARD_LINE_OFFSET, 2*BOARD_SEP+BOARD_LINE_OFFSET);
    //drawBarricade(WEST, 5*BOARD_SEP+BOARD_LINE_OFFSET, 2*BOARD_SEP+BOARD_LINE_OFFSET);
}


function loop() {
    window.requestAnimationFrame(loop);

    var real_time = getTimeStamp();
    while(SIM_TIME < real_time) {
        SIM_TIME += TIME_STEP;
        update(TIME_STEP);
    }
    render();
}

put_snake_in_play();

// handle user keyboard input
document.addEventListener('keydown', function(ev) {
    if(ev.keyCode == 49) { // '1'
        add_barricade(NORTH);
    }
    else if(ev.keyCode == 50) { // '2'
        add_barricade(EAST);
    }
    else if(ev.keyCode == 51) { // '3'
        add_barricade(SOUTH);
    }
    else if(ev.keyCode == 52) { // '4'
        add_barricade(WEST);
    }
});

// generate object positions for every position on the board
var col;
for(var x = 0; x < BOARD_DIM[0]; x++) {
    OBJECTS.push([]);
    col = OBJECTS[OBJECTS.length-1];
    for(var y = 0; y < BOARD_DIM[1]; y++) {
        col.push({t:OBJT_NONE, active:false, render:-1});
    }
}

SIM_TIME = getTimeStamp();
loop();

})();
