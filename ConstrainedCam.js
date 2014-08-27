/* OhScee CameraControls

27 August, 2014

*/

THREE.ConstrainedCamera = function(camera, domElement){

    domElement = (domElement !== undefined) ? domElement : document;
    
    //api
    //
    //if set functions are available USE THEM TO SET VALUES
    //do not just go controls.zoomMax = whatever;
    //use the set function if one is provided so that changes are immediately updated
    //so... controls.setZoomMax(whatever);
    //
    this.enabled = true;
    
    this.target = new THREE.Vector3();
    
    //distance from target
    //this.radius = 10;   //should be based off of how far in  the user is zoomed
    this.rotateEnabled = true;
    
    this.zoomEnabled = true;
    this.zoomMin =  (this.target !== new THREE.Vector3(0,0,0)) ? this.target.z + 10 : 0;
    this.setZoomMin = function(value){
        if (value < this.zoomMax){
            this.zoomMin = this.target.z + value;
            update();
        }
        else{
            console.warn("Minimum value for zoom cannot be greater than the maximum value");
            console.log("Max value is: ", this.zoomMax);
        }
    };

    this.zoomMax = (this.target !== new THREE.Vector3(0,0,0)) ? this.target.z + 300 : 600;
    this.setZoomMax = function(value){
        if(value >  this.zoomMin){
            this.zoomMax = this.target.z + value;
        }
        else{
            console.warn("Maximum value for zoom cannot be less than the minimum value");
            console.log("Min value is: ", this.zoomMin);
        }
    };
    this.zoomSpeed = 1.63;
   
    this.panEnabled = true;
    //up = -
    this.panMax = (this.target !== new THREE.Vector3(0,0,0)) ? this.target.y + 10 : 10;
    this.panMin = (this.target !== new THREE.Vector3(0,0,0)) ? -1*(this.target.y + 10) : -10;

    this.rotateSpeed =1.5;
    this.zoomSpeed = 1.0;
    this.panSpeed = 0.001;
    this.slideSpeed = 1; // rate in which camera transitions from one point to another

    //internals
    var changeEvent = {type: 'change'};
    
    var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
    var state = STATE.NONE;

    var normalMatrix = new THREE.Matrix3();
    var mouse = new THREE.Vector2();
    var mouseOld = new THREE.Vector2();

    var vector = new THREE.Vector3();
    var scope = this;

    var rotateStart = new THREE.Vector3(),
        rotateEnd   = new THREE.Vector3();

    var fov = camera.fov;

    var pM = this.panMax * -1, pm = this.panMin * -1;
    var zm = new THREE.Vector3().copy(this.target).add(new THREE.Vector3(0,0,this.zoomMin));
    var zM = new THREE.Vector3().copy(this.target).add(new THREE.Vector3(0,0,this.zoomMax));

    this.minTrack = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshLambertMaterial({color: 0xB80022}));

    // for slideto function
    //
    var camOld = new THREE.Vector3().copy(camera.position);
    var place = new THREE.Vector3(); // stores place where camera should be in relation to given location

    //called when target is changed and at beggining of control implimentation
    this.initCamera = function(){
        camera.position.y = this.target.y;

        if(camera.position.z < zm.z || camera.position.z > zM.z){
            camera.position.z = (zM.z-zm.z)/2;
        }

        if(-1*camera.position.y < pM || -1*camera.position.y + camera.position.z/2 > pm){
            camera.position.y = this.target.y;
        }

        scope.statReport();
        update();

    };

    //if(camera.position.y){}

    //use this way to change target
    this.newTarget = function(object){
        this.target.copy(object.position);
        camera.position.copy(this.target);
        camera.lookAt(this.target);
        update();
    };

    //errlog purposes
    this.statReport = function(){
        console.warn('STATUS UPDATE:')
        console.log(state);
        console.log("camera", camera.position);
        console.log("target", this.target);
        console.log("zoom vals", this.zoomMin, this.zoomMax);
        console.log("pan vals", this.panMin, this.panMax);
    };

    this.pan = function(distance){
        if(this.panEnabled === false) return;

        normalMatrix.getNormalMatrix(camera.matrix);

        distance.applyMatrix3(normalMatrix);

        distance.x = 0;

        distance.multiplyScalar(vector.copy(this.target).sub(camera.position).length() * this.panSpeed);

        var tmp = new THREE.Vector3().copy(camera.position).add(distance);
        if(-1*tmp.y > pM && -1*tmp.y + camera.position.y/2 < pm){   //testing min value against lowest obeservable portion of screen, as opposed to the center
            camera.position.y += distance.y;
            this.target.y += distance.y;
        }
        else
            console.warn('Trying to exceed min or max pan value!');

        update();
    };

    this.zoom = function(distance){
        if(this.zoomEnabled === false) return;

        normalMatrix.getNormalMatrix(camera.matrix);

        distance.applyMatrix3(normalMatrix);
        distance.multiplyScalar(vector.copy(this.target).sub(camera.position).length() * 0.001); //<- zoom speed

        var tmp = new THREE.Vector3().copy(distance).add(camera.position);
        if(tmp.distanceTo(this.target) < zM.distanceTo(this.target) && tmp.distanceTo(this.target) > zm.distanceTo(this.target)){
            console.log("zoom is good");
            camera.position.add(distance);
        }
        else
            console.log("zoom is bad");

        update();
    };

    this.rotate = function(distance){
        if(this.rotateEnabled === false) return;

        //distance.y = 0;
        distance.multiplyScalar(vector.copy(this.target).sub(camera.position).length() * this.zoomSpeed);
        distance.x *= .05;
        var x = camera.position.x;
        var z = camera.position.z;

        // //min
        // var ax = zm.x;
        // var az = zm.z;

        // //max
        // var bx = zM.x;
        // var bz = zM.z;

        camera.position.x = x * Math.cos(distance.x) + z * Math.sin(distance.x);
        camera.position.z = z * Math.cos(distance.x) - x * Math.sin(distance.x);

        // zm.x = ax * Math.cos(distance.x) + az * Math.sin(distance.x);
        // zm.z = az * Math.cos(distance.x) - ax * Math.sin(distance.x);

        // zM.x = bx * Math.cos(distance.x) + bz * Math.sin(distance.x);
        // zM.z = bz * Math.cos(distance.x) - bx * Math.sin(distance.x);

        camera.lookAt(this.target);

        update();
    };

    function update(){
        camOld.copy(camera.position);

        // var m = (camera.position.z - scope.target.z) / (camera.position.x - scope.target.x);
        // var b = -1*(m*camera.position.x - camera.position.z);
        // var minX = (scope.zoomMin - b) / (m);    //in which zoom values are akin to y on a flat plane, z in this case
        // var maxX = (scope.zoomMax - b) / (m);

        // zm = new THREE.Vector3().copy(scope.target).add(new THREE.Vector3(scope.zoomMin,0,minX));
        // zM = new THREE.Vector3().copy(scope.target).add(new THREE.Vector3(maxX,0,scope.zoomMax));

        var minRetraction = new THREE.Vector3().copy(camera.position).sub((new THREE.Vector3().copy(scope.target).add(new THREE.Vector3(0,scope.zoomMin,scope.zoomMin))));
        zm = new THREE.Vector3().copy(camera.position).sub(minRetraction);
        zm.setY(camera.position.y);
        
        var maxProtrusion = new THREE.Vector3().copy(camera.position).add(new THREE.Vector3(0,scope.zoomMin,scope.zoomMin));

        scope.minTrack.position.copy(zm);


        var pM = scope.panMax * -1, pm = scope.panMin * -1;

        scope.dispatchEvent(changeEvent);
    }

    function retVals(min, max){
        
    }

    this.getTarget = function(){
        console.log("Distance away from target", camera.position.distanceTo(this.target));
        return this.target;
    };
    this.getCamera = function(){
        return camera;
    };

    // pass in a THREE.Vector3
    this.slideTo = function(location){

        normalMatrix.getNormalMatrix(camera.matrix);

        location.applyMatrix3(normalMatrix);

        var xgol = (location.x > camera.position.x) ? -1 : 1;
        var zgol = (location.z > camera.position.z) ? -1 : 1;
        var ygol = (location.y > camera.position.y) ? -1 : 1;

       // var range = (this.zoomEnabled === false) ? new THREE.Vector3().copy(location) : new THREE.Vector3().copy(location).add(new THREE.Vector3(this.zoomMin * xgol, 0 , this.zoomMin * zgol));
        target.y = location.y;
       do{
            camera.position.copy(location);
           // camera.lookAt(location);
            scope.dispatchEvent(changeEvent);
       }while(!camera.position.equals(range));
        update();
    };

    function onMouseDown(event){
        if(scope.enabled === false) return;

        event = event || window.event;

        event.preventDefault();

        if(event.button === 0){
            state = STATE.ROTATE;
        }
         
        else if(event.button === 1){
            state = STATE.ZOOM;
        }

        else if(event.button === 2){
            state = STATE.PAN;
        }

        mouseOld.set(event.clientX, event.clientY);

        domElement.addEventListener( 'mousemove', onMouseMove, false );
        domElement.addEventListener( 'mouseup', onMouseUp, false );
        domElement.addEventListener( 'mouseout', onMouseUp, false );
        domElement.addEventListener( 'dblclick', onMouseUp, false );
    }

    function onMouseMove(event){
        if(!scope.enabled) return;

        event.preventDefault();

        mouse.set(event.clientX, event.clientY);

        //verticle restriction
        var moveX = mouse.x - mouseOld.x;
        var moveY = mouse.y - mouseOld.y;

        if(state === STATE.ROTATE){
            scope.rotate(new THREE.Vector3(moveX * 0.02));
        }
 
        else if(state === STATE.ZOOM){
            scope.zoom(new THREE.Vector3(0, 0, moveY));
        }

        else if(state === STATE.PAN){
            scope.pan(new THREE.Vector3(- moveX, moveY, 0))
        }

        mouseOld.set(event.clientX, event.clientY);
    }

    function onMouseUp(event){
        domElement.removeEventListener( 'mousemove', onMouseMove, false );
        domElement.removeEventListener( 'mouseup', onMouseUp, false );
        domElement.removeEventListener( 'mouseout', onMouseUp, false );
        domElement.removeEventListener( 'dblclick', onMouseUp, false );

        state = STATE.NONE;
    }

    function onMouseWheel(event){
        if(!scope.enabled) return;

        event.preventDefault();
        event.stopPropagation();

        var delta = 0;

        if (event.wheelDelta) { // WebKit / Opera / Explorer 9

            delta =  - event.wheelDelta;
        } 
        else if (event.detail) { // Firefox

            delta = event.detail * 10;
        }

        scope.zoom(new THREE.Vector3(0,0,delta));
    }

    //prevents right click menu
    function contextMenu(event){ event.preventDefault(); }

    this.endCam = function(){
        domElement.removeEventListener('mousedown', onMouseDown, false);
        domElement.removeEventListener('mousewheel', onMouseWheel, false);
        domElement.removeEventListener('contextmenu', contextMenu, false);
    };

    domElement.addEventListener('mousedown', onMouseDown, false);
    domElement.addEventListener('mousewheel', onMouseWheel, false);
    domElement.addEventListener('contextmenu', contextMenu, false);
    
    this.statReport();
    this.initCamera();
};

THREE.ConstrainedCamera.prototype = Object.create(THREE.EventDispatcher.prototype);