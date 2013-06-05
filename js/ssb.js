var players = [];
var platforms = [];

var cubeVertexPositionBuffer;
var cubeVertexNormalBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;

var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var mvStack = [];

var xRot = 0;

var pitch = 0;
var pitchRate = 0;

var yaw = 0;
var yawRate = 0;

var xPos = 0;
var yPos = 20;
var zPos = 80;

var speed = 0;
var xspeed = 0;
var yspeed = 0;

var currentlyPressedKeys = {};

function handleKeys() {

   if(currentlyPressedKeys[87]) {
      console.log('w');
      speed = 0.1;
   } else if(currentlyPressedKeys[83]){
      speed = -0.1;
   } else {
      speed = 0.0;
   }

   if(currentlyPressedKeys[65]) {
      console.log('a');
      xspeed = 0.1;
   } else if (currentlyPressedKeys[68]) {
      xspeed = -0.1;
   } else {
      xspeed = 0.0;
   }
   
   if(currentlyPressedKeys[38]) {
      yspeed = -0.1;
   } else if (currentlyPressedKeys[40]) {
      yspeed = 0.1;
   } else {
      yspeed = 0.0;
   }

   if(currentlyPressedKeys[80]) {
      players[0].jump();
   }
   
   if(currentlyPressedKeys[76]) {
      players[0].moveLeft();
   }
   
   if(currentlyPressedKeys[222]) {
      players[0].moveRight();
   }
}

function drawCube() {
   gl.uniform3f( shaderProgram.ambientUniform, 0.7, 0.8, 0.2);
   gl.uniform3f( shaderProgram.diffuseUniform, 1.0, 1.0, 1.0 );

   gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
   gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
   gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

   //gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
   //gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
   setMatrixUniforms();
   gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function handleKeyDown(event) {
   console.log(event.keyCode);
   currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
   currentlyPressedKeys[event.keyCode] = false;
}

function mvPushMatrix() {
   var copy = mat4.create();
   mat4.set( mvMatrix, copy );
   mvStack.push( copy );
}

function mvPopMatrix() {
   if ( mvStack.length == 0 ) {
      throw "invalid popMatrix";
   }
   mvMatrix = mvStack.pop();
}

function setMatrixUniforms() {
   gl.uniformMatrix4fv( shaderProgram.pMatrixUniform, false, pMatrix );
   gl.uniformMatrix4fv( shaderProgram.mvMatrixUniform, false, mvMatrix );

   var nMatrix = mat3.create();
   mat4.toInverseMat3(mvMatrix, nMatrix);
   mat3.transpose(nMatrix);
   gl.uniformMatrix3fv( shaderProgram.nMatrixUniform, false, nMatrix );

}

function degToRad( degrees ) {
   return degrees * Math.PI / 180;
}

function Platform(left, right, y, height, depth) {
   this.left = left;
   this.right = right;
   this.y = y;
   this.height = height;
   this.depth = depth;

   function draw() {
      var x = (this.right + this.left) / 2.0;
      var width = (this.right - this.left);
      
      mvPushMatrix();
      mat4.translate(mvMatrix, [x, y - (this.height), 0]);
      mat4.scale(mvMatrix, [width/2, this.height/2, this.depth/2]); 
      drawCube();
      mvPopMatrix();
   }
   this.draw = draw;
}

function Player(color, x, bottom) {
   this.color = color;
   this.bottom = bottom;
   this.x = x;
   this.velocity = [0,0,0];

   this.jumps = 2;
   this.jumptimer = 0;

   function draw() {
      var y = this.bottom + 1; //cube is height 2
      mvPushMatrix();
      mat4.translate(mvMatrix, [this.x, y, 0]);
      drawCube();
      mvPopMatrix();
   }
   this.draw = draw;

   function checkDeath() {
      if(this.bottom < -10) {
         this.bottom = 10;
         this.x = 0;
      }
   }
   this.checkDeath = checkDeath;

   function gravity(elapsed) {
      this.velocity[1] += (-0.001*elapsed);
   }
   this.gravity = gravity;

   function jump() {
      if(this.jumps > 0 && this.jumptimer <= 0) {
         this.velocity[1] = 0.5;
         this.jumps--;
         this.jumptimer = 400;
      }
   }
   this.jump = jump;

   function moveLeft() {
      this.x -= 0.2;
   }
   this.moveLeft = moveLeft;
   
   function moveRight() {
      this.x += 0.2;
   }
   this.moveRight = moveRight;

   function checkPlatforms(platforms) { //if platform.y < p.bottom && platform.y > p.bottom + velocity
   
      for (var i = 0; i < platforms.length; i++) {

         if(this.x > platforms[i].left && this.x < platforms[i].right) {
            
            if(this.bottom >= platforms[i].y && (this.bottom + this.velocity[1]) <= platforms[i].y) {
               this.velocity = [0,0,0];
               this.jumps = 2;
               this.bottom = platforms[i].y;
               return;
            }
         }
      }

      this.bottom += this.velocity[1];
      return;
   }
   this.checkPlatforms = checkPlatforms;

}

function drawPlayers() {

   for(var i = 0, len=players.length; i < len; i++) {
      players[i].draw();
   }
}

function drawPlatforms() {

   for(var i = 0, len=platforms.length; i < len; i++) {
      platforms[i].draw();
   }
}

function initPlayers() {
   players.push(new Player([1.0, 0.0, 0.0], -5, 30));
   players.push(new Player([0.0, 1.0, 0.0], 5, 30));
}

function initPlatforms() {
   platforms.push(new Platform(-10, 0, 0, 0.5, 5));
   platforms.push(new Platform(-5, 5, 10, 0.5, 5));
   platforms.push(new Platform(0, 10, 20, 0.5, 5));
}



function drawScene() {
   gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   var lightingPosition = [5, 10, 0];
   gl.uniform3fv( shaderProgram.lightPositionUniform, lightingPosition);

   mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, pMatrix);

   mat4.identity(mvMatrix);

   mat4.rotate(mvMatrix, degToRad(-pitch), [1,0,0]);
   mat4.rotate(mvMatrix, degToRad(-yaw), [0,1,0]);
   mat4.translate(mvMatrix, [-xPos, -yPos, -zPos]);

   drawPlatforms();
   drawPlayers();
}


var lastTime = 0;

function animate() {
   var timeNow = new Date().getTime();
   if (lastTime != 0) {
      var elapsed = timeNow - lastTime;

      zPos -= Math.cos(degToRad(yaw)) * speed * elapsed;
      //xPos -= Math.sin(degToRad(yaw)) * speed * elapsed;
      yPos -= yspeed * elapsed;
      xPos -= xspeed * elapsed;

      movePlayers(elapsed);
   }
   lastTime = timeNow;
}


function movePlayers(elapsed) {

   for(var i = 0, len = players.length; i < len; i++)
   {
      if(players[i].jumptimer > 0) {
         players[i].jumptimer -= elapsed;
      }

      players[i].gravity(elapsed);
      players[i].checkPlatforms(platforms);
      players[i].checkDeath();
   }

}


function tick() {
   requestAnimFrame(tick);
   handleKeys();
   drawScene();
   animate();
}
