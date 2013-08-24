// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function(){var lastTime=0;var vendors=['ms','moz','webkit','o'];for(var x=0;x<vendors.length&&!window.requestAnimationFrame;++x){window.requestAnimationFrame=window[vendors[x]+'RequestAnimationFrame'];window.cancelAnimationFrame=window[vendors[x]+'CancelAnimationFrame']||window[vendors[x]+'CancelRequestAnimationFrame'];}if(!window.requestAnimationFrame){window.requestAnimationFrame=function(callback,element){var currTime = new Date().getTime();var timeToCall=Math.max(0,16-(currTime-lastTime));var id=window.setTimeout(function(){callback(currTime+timeToCall);},timeToCall);lastTime=currTime+timeToCall;return id;};}if(!window.cancelAnimationFrame){window.cancelAnimationFrame=function(id){clearTimeout(id);};}}());


(function(){


var BOARD_DIM = [10, 10]; // w, h
var BOARD_SEP = 40;
var BOARD_HALF_SEP = Math.floor(BOARD_SEP / 2);
var BOARD_LINE_COLOR = '#888';
var BOARD_LINE_WIDTH = 1;
var BOARD_LINE_OFFSET = .5;
var MCOORDS = {x:0, y:0}; // pixel coords
var MCLICK_HANDLED = true;
var SELECTED_COORDS = {x:-1, y:-1}; // board coords
var MOUSE_HIGHLIGHT_COLOR = '#f00';
var MOUSE_HIGHLIGHT_RADIUS = 5; // pixels
var APPLE = {
    x: -1, y: -1, // board coords
    radius: 6, // pixels
    color: '#0a0',
    visible: false
};
var SNAKE_POOL = [];
var SNAKE_SEG_POOL = [];
var SNAKE_MIN_SEGMENTS = 1;
var SNAKE_MAX_SEGMENTS = 5;
var NORTH = 0;
var EAST = 1;
var SOUTH = 2;
var WEST = 3;


var canvas = document.getElementById('gameboard');
var ctx = canvas.getContext('2d');

canvas.width = BOARD_DIM[0] * BOARD_SEP;
canvas.height = BOARD_DIM[1] * BOARD_SEP;


function randIntBetween(max, min) {
    return Math.floor(Math.random() * (max - min) + min);
}

function get_segment() {
    for(var i = 0; i < SNAKE_SEG_POOL.length; i++) {
        if(SNAKE_SEG_POOL[i].available) {
            SNAKE_SEG_POOL[i].available = false;
            return i;
        }
    }

    SNAKE_SEG_POOL.push({x:-1, y:-1, available: false});
    return SNAKE_SEG_POOL.length - 1;
}


function Snake() {
    this._segments = [];
    this.reset();
}
Snake.prototype.reset = function() {
    this.active = true; // so doesn't get snagged as free in pool
    this.enabled = false; // whether or not the snake is updated/drawn
    this.headx = -1;
    this.heady = -1;
    this.direction = -1;
    this.color = '#0ff';
    this.headradius = 5;

    for(var i = 0; i < this._segments.length; i++) {
        SNAKE_SEG_POOL[this._segments[i]].available = true;
    }
    this._segments.length = 0;

    var numsegs = randIntBetween(SNAKE_MAX_SEGMENTS, SNAKE_MIN_SEGMENTS);
    for(var i = 0; i < numsegs; i++) {
        this._segments.push(get_segment());
    }
};
Snake.prototype.set_pos = function(x, y) {
    this.headx = x;
    this.heady = y;
    var seg, prevx = x, prevy = y;
    for(var i = 0; i < this._segments.length; i++) {
        seg = SNAKE_SEG_POOL[this._segments[i]];
        if(this.direction == NORTH) {
            seg.x = prevx;
            seg.y = prevy+1;
            prevy = seg.y;
        }
        else if(this.direction == EAST) {
            seg.x = prevx+1;
            prevx = seg.x;
            seg.y = prevy;
        }
        else if(this.direction == SOUTH) {
            seg.x = prevx;
            seg.y = prevy-1;
            prevy = seg.y;
        }
        else if(this.direction == WEST) {
            seg.x = prevx-1;
            prevx = seg.x;
            seg.y = prevy;
        }
    }
};
Snake.prototype.update = function() {

};
Snake.prototype.draw = function() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.headx*BOARD_SEP+BOARD_LINE_OFFSET, this.heady*BOARD_SEP+BOARD_LINE_OFFSET, this.headradius, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fill();
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
    var x, y;
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

function update() {
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
        snake.update();
    }
}



function drawBoard() {
    ctx.strokeStyle = BOARD_LINE_COLOR;
    ctx.lineWidth = BOARD_LINE_WIDTH;
    ctx.beginPath();
    var t;
    for(var x = 1; x < BOARD_DIM[0]; x++) {
        t = x * BOARD_SEP + BOARD_LINE_OFFSET;
        ctx.moveTo(t, 0);
        ctx.lineTo(t, canvas.height);
    }
    for(var y = 1; y < BOARD_DIM[1]; y++ ) {
        t = y * BOARD_SEP + BOARD_LINE_WIDTH;
        ctx.moveTo(0, t);
        ctx.lineTo(canvas.width, t);
    }
    ctx.closePath();
    ctx.stroke();
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
    drawMouseHighlight();
    drawApple();

    var snake;
    for(var i = 0; i < SNAKE_POOL.length; i++) {
        snake = SNAKE_POOL[i];
        if(!snake.active || !snake.enabled) {continue;}
        snake.draw();
    }
}


function loop() {
    window.requestAnimationFrame(loop);

    update();
    render();
}

put_snake_in_play();

loop();

})();
