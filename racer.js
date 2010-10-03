var game = (function(){
    
    var r = Math.random;
    
    // -----------------------------
    // ---  closure scoped vars  ---
    // -----------------------------
    var canvas;
    var context;
    var keys = [];
    var startTime;
    var lastDelta = 0;
	var lastInputTime = 0;
    var currentTimeString = "";
    
    var roadParam = {
        maxHeight: 900,
        maxCurve:  400,
        length:    12,
        curvy:     0.8,
        mountainy: 0.8,
        zoneSize:  250
    }
        
    var road = [];
    var roadSegmentSize = 5;
    var numberOfSegmentPerColor = 4;
    
    var render = {
        width: 320,
        height: 240,
        depthOfField: 150,
        camera_distance: 30,
        camera_height: 100
    };
    
    var player = {
        position: 10,
        speed: 0,
        acceleration: 0.05,
        deceleration: 0.3,
        breaking: 0.6,
        turning: 5.0,
        posx: 0,
        maxSpeed: 15
    };
    
    var splashInterval;
    var gameInterval;
    
    var car = { 
        x: 0,
        y: 130,
        w: 69,
        h: 38
    };
    var car_4 = { 
        x: 70,
        y: 130,
        w: 77,
        h: 38
    };
    var car_8 = { 
        x: 148,
        y: 130,
        w: 77,
        h: 38
    };
    var carSprite = {
        a: car, 
        x:125, 
        y:190
    };


    var background = {
        x: 0,
        y: 9,
        w: 320,
        h: 120
    };
    
    var tree = {
        x: 321,
        y: 9,
        w: 23,
        h: 50
    };
    var rock = {
        x: 345,
        y: 9,
        w: 11,
        h: 14
    };
    
    var logo = {
        x: 161,
        y: 39,
        w: 115,
        h: 20
    };
    // -----------------------------
    // -- closure scoped function --
    // -----------------------------
    
    //initialize the game
    var init = function(){
        // configure canvas
        canvas = $("#c")[0];
        context = canvas.getContext('2d');
        
        canvas.height = render.height;
        canvas.width = render.width;
        
        resize();
        $(window).resize(resize);    
        
        //register key handeling:
        $(document).keydown(function(e){
            keys[e.keyCode] = true;
        });
        $(document).keyup(function(e){
            keys[e.keyCode] = false;
        });
        generateRoad();
    };
    
	//---------------------------------------------------------------------
	// Constant Game Loop Machine
	//---------------------------------------------------------------------
	var CGLM = (function(){
		var self = {}
			,targetFPS = 30
			,targetInterval = 1000 / targetFPS
			,avgFps = 0
			,currentFps = 0
			,startTime = +new Date()
			,lastTime = +new Date()
			,frames = 0
			,framesDrawn = 0
			,maxFrameSkip = 5
			,lastFrameCount = 0
			,lag = 0
			,timeOutRef = 0
			,running = false
			,tCommands = function(){} // time-dependent callback
			,nCommands = function(){}; // non-time-dependent callback

		self.main = function(){
			var d = +new Date()
				,currentFrameCount = Math.round( (d - startTime) / 1000 * targetFPS )
				,deltaFrames = currentFrameCount - lastFrameCount
				,deltaTimePerFrame = (d - lastTime) / deltaFrames
				,i = 0;

			if(deltaFrames > 0){
				// calculate lag, fps, and avg fps
				lag = Math.round(10 * frames / framesDrawn - 10) / 10;
				avgFps = (1000 / ((d - startTime) / framesDrawn)).toFixed(2);
				currentFps = (1000 / ((d - lastTime) / deltaFrames)).toFixed(2);

				// main time-dependent game commands here, like physics
				for(; i < deltaFrames && i < maxFrameSkip; i++){ tCommands(deltaTimePerFrame); }

				// non-time dependent commands here, like drawing
				nCommands(d - lastTime, currentFps, avgFps, lag);

				// save current date as last date for next round
				lastTime = d;
				// cleanup
				frames += deltaFrames;
				framesDrawn++;
				lastFrameCount = currentFrameCount;
			}
			if(running === true) timeOutRef = setTimeout(self.main, targetInterval);
		}
		self.register = function(timeDependent, normal){
			tCommands = timeDependent !== undefined ? timeDependent : tCommands;
			nCommands = normal !== undefined ? normal : nCommands;
		}
		self.start = function(){ 
			running = true; self.main(); 
			//console.log("beginning execution"); 
		}
		self.stop = function(){ 
			clearTimeout(timeOutRef); running = false;
			//console.log("execution halted"); 
		}

		return self;
	})();

    //renders Splash Frame
    var renderSplashFrame = function(){
        context.fillStyle = "rgb(0,0,0)";
        context.fillRect(0, 0, render.width, render.height);
        
        context.drawImage(spritesheet,  357, 9, 115, 20, 100, 20, 115, 40);
        
        drawString("Instructions:",{x: 100, y: 90});
        drawString("space to start, arrows to drive",{x: 30, y: 100});
        drawString("Credits:",{x: 120, y: 120});
        drawString("code, art: Selim Arsever",{x: 55, y: 130});
        drawString("font: spicypixel.net",{x: 70, y: 140});
        if(keys[32]){
            
			CGLM.register(function(){
				updateInputState();
			}, function(){
				renderGameFrame();
			});

            //window.addEventListener('message', updateInputState, false);
			lastInputTime = +new Date();
			//window.postMessage('input', window.location);

			clearInterval(splashInterval);
            //gameInterval = setInterval(renderGameFrame, 30);
			
			startTime = new Date();
			CGLM.start();
        }
    }
    
	var updateInputState = function(){
		var inputDelta = +new Date() - lastInputTime;
		// --------------------------
        // -- Update the car state --
        // --------------------------
        if(inputDelta > 22){
		
			// 22 is just a tweaked number, no significance
			while(inputDelta >= 22){
				
				inputDelta -= 22;
				
        		if (Math.abs(lastDelta) > 130){
		            if (player.speed > 3) {
		                player.speed -= 0.2;
		            }
		        } else {
		            // read acceleration controls
		            if (keys[38]) { // 38 up
		                //player.position += 0.1;
		                player.speed += player.acceleration;
		            } else if (keys[40]) { // 40 down
		                player.speed -= player.breaking;
		            } else {
		                player.speed -= player.deceleration;
		            }
		        }
		        player.speed = Math.max(player.speed, 0); //cannot go in reverse
		        player.speed = Math.min(player.speed, player.maxSpeed); //maximum speed
		        player.position += player.speed;
        
		        // car turning
		        if (keys[37]) {
		            // 37 left
		            if(player.speed > 0){
		                player.posx -= player.turning;
		            }
		            carSprite = {
		                a: car_4,
		                x: 117,
		                y: 190
		            };
		        } else if (keys[39]) {
		            // 39 right
		            if(player.speed > 0){
		                player.posx += player.turning;
		            }
		            carSprite = {
		                a: car_8,
		                x: 125,
		                y: 190
		            };
		        } else {
		            carSprite = {
		                a: car, 
		                x:125, 
		                y:190
		            };
		        }
			}
			lastInputTime = +new Date();
		}
	}

    //renders one frame
    var renderGameFrame = function(){
        
        // Clean screen
        context.fillStyle = "#dc9";
        context.fillRect(0, 0, render.width, render.height);

        drawBackground(-player.posx);

        var spriteBuffer = [];
        
        // --------------------------
        // --   Render the road    --
        // --------------------------
        var absoluteIndex = Math.floor(player.position / roadSegmentSize);
        
        if(absoluteIndex >= roadParam.length-render.depthOfField-1){
            //clearInterval(gameInterval);
			CGLM.stop();
			//window.removeEventListener('message', updateInputState, false);
            drawString("You did it!", {x: 100, y: 20});
            drawString("Press t to tweet your time.", {x: 30, y: 30});
            $(window).keydown(function(e){ if(e.keyCode == 84) {location.href="http://twitter.com/home?status="+escape("I've just raced through #racer10k in "+currentTimeString+"!")}});
        }
        
        var currentSegmentIndex    = (absoluteIndex - 2) % road.length;
        var currentSegmentPosition = (absoluteIndex - 2) * roadSegmentSize - player.position;
        var currentSegment         = road[currentSegmentIndex];
        
        var lastProjectedHeight     = Number.POSITIVE_INFINITY;
        var probedDepth             = 0;
        var counter                 = absoluteIndex % (2 * numberOfSegmentPerColor); // for alternating color band
        
        var playerPosSegmentHeight     = road[absoluteIndex % road.length].height;
        var playerPosNextSegmentHeight = road[(absoluteIndex + 1) % road.length].height;
        var playerPosRelative          = (player.position % roadSegmentSize) / roadSegmentSize;
        var playerHeight               = render.camera_height + playerPosSegmentHeight + (playerPosNextSegmentHeight - playerPosSegmentHeight) * playerPosRelative;
        
        var baseOffset                 =  currentSegment.curve + (road[(currentSegmentIndex + 1) % road.length].curve - currentSegment.curve) * playerPosRelative;
        
        lastDelta = player.posx - baseOffset*2;
        
        var iter = render.depthOfField;
        while (iter--) {
            // Next Segment:
            var nextSegmentIndex       = (currentSegmentIndex + 1) % road.length;
            var nextSegment            = road[nextSegmentIndex];
            
            var startProjectedHeight = Math.floor((playerHeight - currentSegment.height) * render.camera_distance / (render.camera_distance + currentSegmentPosition));
            var startScaling         = 30 / (render.camera_distance + currentSegmentPosition);
        
            var endProjectedHeight   = Math.floor((playerHeight - nextSegment.height) * render.camera_distance / (render.camera_distance + currentSegmentPosition + roadSegmentSize));
            var endScaling           = 30 / (render.camera_distance + currentSegmentPosition + roadSegmentSize);

            var currentHeight        = Math.min(lastProjectedHeight, startProjectedHeight);
            var currentScaling       = startScaling;
            
            if(currentHeight > endProjectedHeight){
                drawSegment(
                    render.height / 2 + currentHeight, 
                    currentScaling, currentSegment.curve - baseOffset - lastDelta * currentScaling, 
                    render.height / 2 + endProjectedHeight, 
                    endScaling, 
                    nextSegment.curve - baseOffset - lastDelta * endScaling, 
                    counter < numberOfSegmentPerColor, currentSegmentIndex == 2 || currentSegmentIndex == (roadParam.length-render.depthOfField));
            }
            if(currentSegment.sprite){
                spriteBuffer.push({
                    y: render.height / 2 + startProjectedHeight, 
                    x: render.width / 2 - currentSegment.sprite.pos * render.width * currentScaling + /* */currentSegment.curve - baseOffset - (player.posx - baseOffset*2) * currentScaling,
                    ymax: render.height / 2 + lastProjectedHeight, 
                    s: 2.5*currentScaling, 
                    i: currentSegment.sprite.type});
            }
            
            
            lastProjectedHeight    = currentHeight;
            
            probedDepth            = currentSegmentPosition;

            currentSegmentIndex    = nextSegmentIndex;
            currentSegment         = nextSegment;
            
            currentSegmentPosition += roadSegmentSize;
            
            counter = (counter + 1) % (2 * numberOfSegmentPerColor);
        }
        
        while(sprite = spriteBuffer.pop()) {
            drawSprite(sprite);
        }
        
        // --------------------------
        // --     Draw the car     --
        // --------------------------
        drawImage(carSprite.a, carSprite.x, carSprite.y, 1);

        // --------------------------
        // --     Draw the hud     --
        // --------------------------        
        drawString(""+Math.round(absoluteIndex/(roadParam.length-render.depthOfField)*100)+"%",{x: 287, y: 1});
        var now = new Date();
        var diff = now.getTime() - startTime.getTime();
        
        var min = Math.floor(diff / 60000);
        
        var sec = Math.floor((diff - min * 60000) / 1000); 
        if(sec < 10) sec = "0" + sec;
        
        var mili = Math.floor(diff - min * 60000 - sec * 1000);
        if(mili < 100) mili = "0" + mili;
        if(mili < 10) mili = "0" + mili;
        
        currentTimeString = ""+min+":"+sec+":"+mili;
        
        drawString(currentTimeString, {x: 1, y: 1});
        var speed = Math.round(player.speed / player.maxSpeed * 200);
        drawString(""+speed+"mph", {x: 1, y: 10});
    };
    
    
    // Drawing primitive
    var drawImage = function(image, x, y, scale){
        context.drawImage(spritesheet,  image.x, image.y, image.w, image.h, x, y, scale*image.w, scale*image.h);
    };
    var drawSprite = function(sprite){
        //if(sprite.y <= sprite.ymax){
            var destY = sprite.y - sprite.i.h * sprite.s;
            if(sprite.ymax < sprite.y) {
                var h = Math.min(sprite.i.h * (sprite.ymax - destY) / (sprite.i.h * sprite.s), sprite.i.h);
            } else {
                var h = sprite.i.h; 
            }
            //sprite.y - sprite.i.h * sprite.s
            if(h > 0) context.drawImage(spritesheet,  sprite.i.x, sprite.i.y, sprite.i.w, h, sprite.x, destY, sprite.s * sprite.i.w, sprite.s * h);
        //}
    };
    
    var drawSegment = function (position1, scale1, offset1, position2, scale2, offset2, alternate, finishStart){
        var grass     = (alternate) ? "#eda" : "#dc9";
        var border    = (alternate) ? "#e00" : "#fff";
        var road      = (alternate) ? "#999" : "#777";
        var lane      = (alternate) ? "#fff" : "#777";

        if(finishStart){
            road = "#fff";
            lane = "#fff";
            border = "#fff";
        }
        

        //draw grass:
        context.fillStyle = grass;
        context.fillRect(0,position2,render.width,(position1-position2));
        
        // draw the road
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2, -0.5, 0.5, road);
        
        //draw the road border
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2, -0.5, -0.47, border);
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2, 0.47,   0.5, border);
        
        // draw the lane line
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2, -0.18, -0.15, lane);
        drawTrapez(position1, scale1, offset1, position2, scale2, offset2,  0.15,  0.18, lane);
    }
    
    var drawTrapez = function(pos1, scale1, offset1, pos2, scale2, offset2, delta1, delta2, color){
        var demiWidth = render.width / 2;
        
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(demiWidth + delta1 * render.width * scale1 + offset1, pos1);
        context.lineTo(demiWidth + delta1 * render.width * scale2 + offset2, pos2); 
        context.lineTo(demiWidth + delta2 * render.width * scale2 + offset2, pos2); 
        context.lineTo(demiWidth + delta2 * render.width * scale1 + offset1, pos1);
        context.fill();
    }
    
    var drawBackground = function(position) {
        var first = position / 2 % (background.w);
        drawImage(background, first-background.w +1, 0, 1);
        drawImage(background, first+background.w -1, 0, 1);
        drawImage(background, first, 0, 1);
    }
        
    var drawString = function(string, pos) {
        string = string.toUpperCase();
        var cur = pos.x;
        for(var i=0; i < string.length; i++) {
            context.drawImage(spritesheet, (string.charCodeAt(i) - 32) * 8, 0, 8, 8, cur, pos.y, 8, 8);
            cur += 8;
        }
    }    
    var resize = function(){
        if ($(window).width() / $(window).height() > render.width / render.height) {
            var scale = $(window).height() / render.height;
        }
        else {
            var scale = $(window).width() / render.width;
        }
        
        var transform = "scale(" + scale + ")";
        $("#c").css("MozTransform", transform).css("transform", transform).css("WebkitTransform", transform).css({
            top: (scale - 1) * render.height / 2,
            left: (scale - 1) * render.width / 2 + ($(window).width() - render.width * scale) / 2
        });
    };
    
    // -------------------------------------
    // ---  Generates the road randomly  ---
    // -------------------------------------
    var generateRoad = function(){
        var currentStateH = 0; //0=flat 1=up 2= down
        var transitionH = [[0,1,2],[0,2,2],[0,1,1]];
        
        var currentStateC = 0; //0=straight 1=left 2= right
        var transitionC = [[0,1,2],[0,2,2],[0,1,1]];

        var currentHeight = 0;
        var currentCurve  = 0;

        var zones     = roadParam.length;
        while(zones--){
            // Generate current Zone
            var finalHeight;
            switch(currentStateH){
                case 0:
                    finalHeight = 0; break;
                case 1:
                    finalHeight = roadParam.maxHeight * r(); break;
                case 2:
                    finalHeight = - roadParam.maxHeight * r(); break;
            }
            var finalCurve;
            switch(currentStateC){
                case 0:
                    finalCurve = 0; break;
                case 1:
                    finalCurve = - roadParam.maxCurve * r(); break;
                case 2:
                    finalCurve = roadParam.maxCurve * r(); break;
            }

            for(var i=0; i < roadParam.zoneSize; i++){
                // add a tree
                if(i % roadParam.zoneSize / 4 == 0){
                    var sprite = {type: rock, pos: -0.55};
                } else {
                    if(r() < 0.05) {
                        var spriteType = tree;//([tree,rock])[Math.floor(r()*1.9)];
                        var sprite = {type: spriteType, pos: 0.6 + 4*r()};
                        if(r() < 0.5){
                            sprite.pos = -sprite.pos;
                        }
                    } else {
                        var sprite = false;
                    }
                }
                road.push({
                    height: currentHeight+finalHeight / 2 * (1 + Math.sin(i/roadParam.zoneSize * Math.PI-Math.PI/2)),
                    curve: currentCurve+finalCurve / 2 * (1 + Math.sin(i/roadParam.zoneSize * Math.PI-Math.PI/2)),
                    sprite: sprite
                })
            }
            currentHeight += finalHeight;
            currentCurve += finalCurve;
            // Find next zone
            if(r() < roadParam.mountainy){
                currentStateH = transitionH[currentStateH][1+Math.round(r())];
            } else {
                currentStateH = transitionH[currentStateH][0];
            }
            if(r() < roadParam.curvy){
                currentStateC = transitionC[currentStateC][1+Math.round(r())];
            } else {
                currentStateC = transitionC[currentStateC][0];
            }
        }
        roadParam.length = roadParam.length * roadParam.zoneSize;
    };
    
    return {
        start: function(){
            init();
            spritesheet = new Image();
            spritesheet.onload = function(){
                splashInterval = setInterval(renderSplashFrame, 30);
            };
            spritesheet.src = "spritesheet.high.png";
        }
    }
}());
$(function(){
    game.start();
});