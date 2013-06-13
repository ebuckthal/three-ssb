var players = [];
var platforms = [];
var score = [0,0];

var cubeVertexPositionBuffer;
var cubeVertexNormalBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;

var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var mvStack = [];

var pitch = 0;
var yaw = 0;

var currentlyPressedKeys = {};

var ctx;
var c;

function drawScore() {
   c = document.getElementById("text");
   ctx = c.getContext("2d");
   ctx.font="50px 'Geo'";
   
   ctx.clearRect(0,0, c.width, c.height);
   
   ctx.fillStyle = "#FF0000";
   ctx.fillText("damage: " + players[0].knockback, 90, 580);
   ctx.fillText("score: " + score[1], 90, 600);
   
   ctx.fillStyle = "#FF0000";
   ctx.fillText("damage: " + players[1].knockback, 90, 90);
   ctx.fillText("score: " + score[0], 90, 110);
}


function drawReset() {

}

function drawCube() {

   setMatrixUniforms();
   gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
   gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
   gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

   //gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
   //gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
   gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function handleKeys() {

   if(currentlyPressedKeys[87]) { //w
      players[0].jump();
   } else {
   }

   if(currentlyPressedKeys[65]) { //a
      players[0].moveLeft();
   } else {
   }

   if (currentlyPressedKeys[68]) { //d
      players[0].moveRight();
   } else {
   }

   if(currentlyPressedKeys[83]) {
      players[0].moveDown();
   } else {
   }

   if(currentlyPressedKeys[70]) { //f
      players[0].attack(dir_enum.UP);
   } else if(currentlyPressedKeys[67]) { //c
      players[0].attack(dir_enum.LEFT);
   } else if(currentlyPressedKeys[86]) { //v
      players[0].attack(dir_enum.DOWN);
   } else if(currentlyPressedKeys[66]) { //b
      players[0].attack(dir_enum.RIGHT);
   }

   if(currentlyPressedKeys[73]) { //i
      players[1].jump();
   } else {
   }

   if(currentlyPressedKeys[74]) { //j
      players[1].moveLeft();
   } else {
   }

   if (currentlyPressedKeys[76]) { //k
      players[1].moveRight();
   } else {
   }

   if(currentlyPressedKeys[75]) { //l
      players[1].moveDown();
   } else {
   }

   if(currentlyPressedKeys[186]) { //;
      players[1].attack(dir_enum.UP);
   } else if(currentlyPressedKeys[188]) { //,
      players[1].attack(dir_enum.LEFT);
   } else if(currentlyPressedKeys[190]) { //.
      players[1].attack(dir_enum.DOWN);
   } else if(currentlyPressedKeys[191]) { ///
      players[1].attack(dir_enum.RIGHT);
   }
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
   
   var lightingPosition = [-3, 5 , 10];
   gl.uniform3fv( shaderProgram.lightPositionUniform, lightingPosition);

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
      var x = (this.right + this.left) / 2;
      var width = (this.right - this.left);

      mvPushMatrix();
      gl.uniform3f( shaderProgram.diffuseUniform, 203/256, 75/256, 22/256);
      gl.uniform3f( shaderProgram.ambientUniform, 0.1, 0.1, 0.1);
      mat4.translate(mvMatrix, [x, y - (this.height/2), 0]);
      mat4.scale(mvMatrix, [width, this.height, this.depth]); 
      drawCube();
      mvPopMatrix();
   }
   this.draw = draw;

   function animate(elapsed) {

   }
   this.animate = animate;
}

function distance(a1, a2) {
   return Math.sqrt((a1[0]-a2[0])*(a1[0]-a2[0]) + (a1[1]-a2[1])*(a1[1]-a2[1]));
}

function direction(a1, a2) {
   var d = distance(a1, a2);
   return ([(a1[0]-a2[0]) / d, (a1[1]-a2[1]) / d]);
}

state_enum = {
   STANDING : { code : "S", dcolor : [1.0, 1.0, 0.0] },
   INAIR : { code : "A", dcolor: [0.0, 0.0, 1.0] },
   KNOCKBACK : { code : "K", dcolor : [1.0, 0.0, 0.0] },
   RECOVERY: { code : "R", dcolor : [0.0, 1.0, 0.0] }
}

dir_enum = { NONE : -1, UP : 0, RIGHT : 1, DOWN : 2, LEFT: 3 }


function Player(id, color, x, y) {
   this.id = id;
   this.state = state_enum.INAIR;
   this.dcolor = color;
   this.velocity = [0, 0];
   this.position = [x, y];

   this.vmod = [0,0];

   this.jumps = 2;

   this.jumptimer = 0;
   this.dashtimer = 0;
   this.adtimer = 0; //attack draw timer
   this.artimer= 0; //attack recovery timer //attack recovery timer
   this.rtimer = 0;
   this.ktimer = 0;

   this.dirAttack = dir_enum.NONE; 

   this.knockback = 1;
   this.deathPos = [0,0];

   function draw() {
      mvPushMatrix();
      mat4.translate(mvMatrix, [this.position[0], this.position[1] + 1, 0]);
      mat4.scale(mvMatrix, [2, 2, 2]);

      gl.uniform3f( shaderProgram.ambientUniform, 0.05, 0.05, 0.05);
      if(this.state == state_enum.KNOCKBACK) {
         gl.uniform3f( shaderProgram.diffuseUniform, 220/256, 50/256, 47/256);
      } else {
         gl.uniform3f( shaderProgram.diffuseUniform, this.dcolor[0], this.dcolor[1], this.dcolor[2]);
      }

      if(this.adtimer > 0) { //if we should be drawing
         var r = (this.adtimer / 200) * 2 * Math.PI - Math.PI;
         var s = Math.min((this.adtimer / 200) * 2, 1 - (this.adtimer / 200) * 2);
         switch(this.dirAttack) {
            case dir_enum.UP:
               mat4.rotate(mvMatrix, r, [1, 0, 0]);
               mvPushMatrix();
               mat4.translate(mvMatrix, [0, 1, 0]);
               mat4.scale(mvMatrix, [1.5, 2, 1.5]);
               drawCube();
               mvPopMatrix();
               break;
            case dir_enum.LEFT:
               mat4.translate(mvMatrix, [-1, 0, 0]);
               mat4.scale(mvMatrix, [2, 2, 2]);
               break;
            case dir_enum.RIGHT:
               mat4.translate(mvMatrix, [1, 0, 0]);
               mat4.scale(mvMatrix, [2, 2, 2]);
               break;
            case dir_enum.DOWN:
               mat4.translate(mvMatrix, [0, -1, 0]);
               mat4.scale(mvMatrix, [2, 2, 2]);
               break;
            default:
               break;
         }
      } else if (this.deathtimer > 0) {
         this.drawPlayerDeath(this.deathPos);
      } else {
      }

      drawCube();
      mvPopMatrix();
   }
   this.draw = draw;

   function drawPlayerDeath(pos, deathtimer) {

   }
   this.drawPlayerDeath = drawPlayerDeath;

   function attack(direction) {
      if(this.artimer > 0) {
         return
      }
      this.adtimer = 200;
      this.artimer = 800;
      switch(this.state) {
         case state_enum.STANDING:
            this.dirAttack = direction;
            break;
         case state_enum.INAIR:
            this.dirAttack = direction;
            break;
         case state_enum.KNOCKBACK:
            break;
         case state_enum.RECOVERY:
            break;
         default:
            break;
      }
   }
   this.attack = attack;

   function moveLeft() {
      switch(this.state) {
         case state_enum.STANDING:
            this.vmod[0] = -0.3;

            var i = this.checkForPlatforms();

            if(i == -1) {
               this.state = state_enum.INAIR;
            }

            break;
         case state_enum.INAIR:
            this.vmod[0] = -0.3;
            this.velocity[0] = 0;
            break;
         case state_enum.KNOCKBACK:
            break;
         case state_enum.RECOVERY:
            break;
         default:
            break;
      }
   }
   this.moveLeft = moveLeft;

   function moveRight() {
      switch(this.state) {
         case state_enum.STANDING:
            this.vmod[0] = 0.3;

            var i = this.checkForPlatforms();

            if(i == -1) {
               this.state = state_enum.INAIR;
            }
            break;
         case state_enum.INAIR:
            this.vmod[0] = 0.3;
            this.velocity[0] = 0;
            break;
         case state_enum.KNOCKBACK:
            break;
         case state_enum.RECOVERY:
            break;
         default:
            break;
      }
   }
   this.moveRight = moveRight;

   function moveDown() {
      switch(this.state) {
         case state_enum.STANDING:
            //move thru platform
            this.position[1] -= 0.01;
            this.state = state_enum.INAIR;
            break;
         case state_enum.INAIR:
            //fastfall
            this.vmod[1] = -0.4;
            this.velocity[1] = Math.min(this.velocity[1], 0);
            break;
         case state_enum.KNOCKBACK:
            break;
         case state_enum.RECOVERY:
            break;
         default:
            break;
      }
   }
   this.moveDown = moveDown;

   function jump() {
      switch(this.state) {
         case state_enum.STANDING:
            this.velocity[1] = 0.7;
            this.jumps--;
            this.jumptimer = 400;
            this.state = state_enum.INAIR;
            break;
         case state_enum.INAIR:

            if(this.jumps > 0 && this.jumptimer <= 0) {
               this.velocity[1] = 0.7;
               this.jumps--;
               this.jumptimer = 400;
            }
            break;
         case state_enum.KNOCKBACK:
            break;
         case state_enum.RECOVERY:
            break;
         default:
            break;
      }
   }
   this.jump = jump;

   function tick(elapsed) {
      if(this.jumptimer > 0) {
         this.jumptimer -= elapsed;
      }

      if(this.adtimer > 0) {
         this.adtimer -= elapsed;
      }
      if(this.artimer > 0) {
         this.artimer -= elapsed;
      }
      if(this.rtimer > 0) {
         this.rtimer -= elapsed;
      }

      switch(this.state) {
         case state_enum.STANDING:

            var j = this.checkForHit(); //j[0] = player number, j[1] = direction of knockback

            if(j[0] > -1) {
               console.log("hit by: " + j[0]);
               console.log(j[1]);
               this.state = state_enum.KNOCKBACK;
               this.velocity[0] = (j[1][0]) * 1.2 * this.knockback;
               this.velocity[1] = (j[1][1]) * 1.2 * this.knockback;
               this.rtimer = 400 * 1.2 * this.knockback;
               this.knockback += 1;
               
               drawScore();
               break;
            }

            this.position[1] += this.velocity[1] + this.vmod[1];
            this.position[0] += this.velocity[0] + this.vmod[0];
            this.vmod = [0,0];
            break;
         case state_enum.INAIR:

            //gravity
            this.velocity[1] += (-0.001*elapsed);
            this.velocity[0] /= 1.01;

            var k = this.checkForDeath();
            if(k[0] > -1) {
               console.log("death");
               this.knockback = 1;
               this.state = state_enum.INAIR;
               this.position = [0, 30];
               this.velocity = [0, 0];

               score[this.id] += 1;
               this.deathtimer = 1000;
               drawScore();
               break;
            }

            var j = this.checkForHit(); //j[0] = player number, j[1] = direction of knockback
            if(j[0] > -1) {
               console.log("hit by: " + j[0]);
               console.log(j[1]);
               this.state = state_enum.KNOCKBACK;
               this.velocity[0] = (j[1][0]) * 1.2 * this.knockback;
               this.velocity[1] = (j[1][1]) * 1.2 * this.knockback;
               this.rtimer = 400 * 1.2 * this.knockback;
               this.knockback += 1;
               
               drawScore();
               break;
            }

            var i = this.checkForPlatforms();
            if(i > -1) {
               console.log(i);
               this.state = state_enum.STANDING;
               this.jumps = 2;
               this.position[1] = platforms[i].y;
               this.velocity[1] = 0;
               this.velocity[0] = 0;
            }

            this.position[1] += this.velocity[1] + this.vmod[1];
            this.position[0] += this.velocity[0] + this.vmod[0];
            this.vmod = [0,0];
            break;
         case state_enum.KNOCKBACK:

            //gravity
            this.velocity[1] += (-0.001*elapsed);

            if(this.rtimer > 0) {
               this.rtimer -= elapsed;
            } else {
               this.state = state_enum.INAIR;
               break;
            }

            var k = this.checkForDeath();
            if(k[0] > -1) {
               console.log("death");
               this.knockback = 1;
               this.state = state_enum.INAIR;
               this.position = [0, 30];
               this.velocity = [0, 0];
               
               this.deathtimer = 1000;
               score[this.id] += 1;
               drawScore();
               break;
            }

            var i = this.checkForPlatforms();

            if(i > -1) {
               if(Math.abs(this.velocity[0]) + Math.abs(this.velocity[1]) > 0.5) { //bounce!
                  this.velocity[1] = -this.velocity[1];
                  this.velocity[0] /= 2;
                  this.vmod[0,0];
               } else { //stand
                  this.state = state_enum.RECOVERY;
                  this.jumps = 2;
                  this.position[1] = platforms[i].y;
                  this.velocity[1] = 0;
                  this.velocity[0] = 0;
                  this.vmod[0,0];
               }
            }

            this.position[1] += this.velocity[1] + this.vmod[1];
            this.position[0] += this.velocity[0] + this.vmod[0];
            this.vmod = [0,0];
            this.dirAttack = dir_enum.NONE;
            this.adtimer = 0;
            break;
         case state_enum.RECOVERY:
            if(this.rtimer > 0) {
               this.rtimer -= elapsed;
            } else {
               this.state = state_enum.INAIR;
            }

            break;
         default:
            break;
      }
   }
   this.tick = tick;

   function checkForDeath() {
      if(this.position[1] < -50 || this.position[1] > 150 || this.position[0] < -150 || this.position[0] > 150) {
         return [1, 0];
      }
      return [-1, 0];
   }
   this.checkForDeath = checkForDeath;

   function checkForHit() {

      for(var i = 0; i < players.length; i++) {
         if(players[i].id == this.id) {
            continue;
         }

         if(players[i].adtimer <= 0) {
            continue;
         }

         var offset; 

         switch(players[i].dirAttack) {
            case dir_enum.UP:
               offset = [0,1]; 
               break;
            case dir_enum.LEFT:
               offset = [-1,0]; 
               break;
            case dir_enum.RIGHT:
               offset = [1,0]; 
               break;
            case dir_enum.DOWN:
               offset = [0,-1]; 
               break;
            default:
               continue;
               break;
         }

         var tempx = players[i].position[0] + offset[0];
         var tempy = players[i].position[1] + offset[1];

         if(distance(this.position, [tempx, tempy]) < 2) {
            return [i, direction(this.position, [tempx, tempy])];
         }

      }

      return [-1, 0];
   }
   this.checkForHit = checkForHit;

   function checkForPlatforms() {
      for(var i = 0; i < platforms.length; i++) {
         if(this.position[0] >= platforms[i].left && 
               this.position[0] <= platforms[i].right &&
               this.position[1] >= platforms[i].y &&
               this.position[1] + this.velocity[1] + this.vmod[1] <= platforms[i].y) {
                  return i; //return platform number
               }
      } 
      return -1;
   }
   this.checkForPlatforms = checkForPlatforms;
}

function initScore() {
   drawScore();
}

function initPlayers() {
   players.push(new Player(0, [181/256, 137/256, 0/256], -5, 30));
   players.push(new Player(1, [108/256, 113/256, 196/256], 5, 30));
}

function initPlatforms() {
   platforms.push(new Platform(-10, 0, 0, 0.5, 5));
   platforms.push(new Platform(-5, 5, 10, 0.5, 5));
   platforms.push(new Platform(0, 10, 20, 0.5, 5));
}

function setupCamera() {

   var minZ = 30;

   var min = [Math.min(players[0].position[0], players[1].position[0]), 
       Math.min(players[0].position[1], players[1].position[1])];
   var max = [Math.max(players[0].position[0], players[1].position[0]), 
       Math.max(players[0].position[1], players[1].position[1])];


   xPos = (min[0] + max[0]) / 2;
   yPos = (min[1] + max[1]) / 2;

   zPos = Math.max(max[0]-min[0], max[1]-min[1]) * 1.5 + 20;

   zPos = Math.max(30, zPos);
   

   mat4.perspective(60, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, pMatrix);
   mat4.identity(mvMatrix);
   
   
   
   mat4.rotate(mvMatrix, degToRad(-pitch), [1,0,0]);
   mat4.rotate(mvMatrix, degToRad(-yaw), [0,1,0]);
   mat4.translate(mvMatrix, [-xPos, -yPos, -zPos]);
   
   
}

function drawScene() {
   
   setupCamera();

   for(var i = 0, len=players.length; i < len; i++) {
      players[i].draw();
   }

   for(var i = 0, len=platforms.length; i < len; i++) {
      platforms[i].draw();
   }
}


var lastTime = 0;

function animate() {
   var timeNow = new Date().getTime();
   if (lastTime != 0) {
      var elapsed = timeNow - lastTime;

      for(var i = 0; i < players.length; i++) {
         players[i].tick(elapsed);
      }

      for(var i = 0; i < platforms.length; i++) {
         platforms[i].animate(elapsed);
      }
   }
   lastTime = timeNow;
}

function tick() {
   requestAnimFrame(tick);
   handleKeys();
   animate();
   drawScene();
   
}
