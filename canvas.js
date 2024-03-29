
var canvases = [];

Math.rad = function (degree) {
  return degree / 360 * 2 * Math.PI;
};
Math.norm = function (obj) {
  var sum = 0;
  for (var key in obj) {
    sum += Math.pow(obj[key], 2);
  }
  if (sum == 0) {
    return obj;
  } else {
    for (var key in obj) {
      obj[key] = obj[key] / Math.sqrt(sum);
    }

    return obj;
  }
};
Math.len = function (obj) {
  var sum = 0;
  for (var key in obj) {
    sum += Math.pow(obj[key], 2);
  }

  return Math.sqrt(sum);
};
Math.clamp = function (num, min, max) {
  if (num > max) {
    return max;
  } else if (num < min) {
    return min;
  } else {
    return num;
  }
};

var Axis2 = function (x = 0, y = 0) {
  this.x = x;
  this.y = y;
};
var Axis3 = function (x = 0, y = 0, z = 0) {
  this.x = x;
  this.y = y;
  this.z = z;
};
var Transform = function (vector, angle) {
  this.position = vector;
  this.rotation = angle;
};
Transform.prototype = {
  rotateAroundAxis : function (vector, angle, point = new Axis3()) {
    var x = this.position.x,
          y = this.position.y,
          z = this.position.z;
    var a = point.x,
          b = point.y,
          c = point.z;
    var u = vector.x,
          v = vector.y,
          w = vector.z;
    var u2 = Math.pow(u, 2),
          v2 = Math.pow(v, 2),
          w2 = Math.pow(w, 2);
    var sinTheta = Math.sin(angle),
          cosTheta = Math.cos(angle);

    this.position.x = (a * (v2 + w2) - u * (b*v + c*w - u*x - v*y - w*z)) * (1 - cosTheta) + x * cosTheta + (-c*v + b*w - w*y + v*z) * sinTheta;
    this.position.y = (b * (u2 + w2) - v * (a*u + c*w - u*x - v*y - w*z)) * (1 - cosTheta) + y * cosTheta + (c*u - a*w + w*x - u*z) * sinTheta;
    this.position.z = (c * (u2 + v2) - w * (a*u + b*v - u*x - v*y - w*z)) * (1 - cosTheta) + z * cosTheta + (-b*u + a*v - v*x + u*y) * sinTheta;
  },
  getRelativePosition: function (canvas) {
    this.distance = this.position.z - (canvas.camera.position.z + canvas.camera.offsetZ);

    return new Axis3(this.position.x, this.position.y, this.distance);
  },
  get2D: function (canvas) {
    var point = new Axis3();
    var viewPosition = this.getRelativePosition(canvas);
    var ratio = Math.abs(canvas.camera.position.z) / this.distance;

    point.x = viewPosition.x * ratio;
    point.y = viewPosition.y * ratio;
    point.z = viewPosition.z;

    return point;
  }
};

var Particle = function (canvas, x, y, z, size, color) {
  this.id = 'entity_' + canvas.entities.length;
  this.class = 'Particle';

  this.transform = new Transform(new Axis3(x, y, z));
  this.lastTransform = new Transform(new Axis3(x, y, z));
  this.size = size;
  this.color = color;

  this.init(canvas);
};
Particle.prototype = {
  init : function (canvas) {
    canvas.entities.push(this);
  },
  getPerceivedSize : function (canvas) {
    var ratio = Math.abs(canvas.camera.position.z) / this.transform.distance;
    var size = this.size * ratio;

    return size;
  },
  getVelocity : function () {
    return {
      x: this.transform.position.x - this.lastTransform.position.x,
      y: this.transform.position.y - this.lastTransform.position.y,
      z: this.transform.position.z - this.lastTransform.position.z
    };
  },
  remove : function () {
    for (var i = 0; i < entities.length; i++) {
      if (entities.id == this.id) {
        entities[i] = undefined;
      }
    }
  }
};

var Canvas = function (container, prepend = false) {
  this.$container = $(container);

  this.entities = [];

  this.setup(prepend);
};
Canvas.prototype = {
  setup : function (pre) {
    this.width = this.$container.width();
    this.height = this.$container.height();

    this.$canvas = $('<canvas />').attr({ width: this.width, height: this.height });
    if (pre) {
      this.$canvas.prependTo(this.$container);
    } else {
      this.$canvas.appendTo(this.$container);
    }
    this.context = this.$canvas.get(0).getContext('2d');

    this.camera = {
      position: new Axis3(0, 0, -this.width / 2),
      offsetZ: 0
    };
    this.changeFOV(90);
    this.offset = { x: this.width * 0.5, y: this.height * 0.5 };

    this.background = 'rgba(0, 0, 255, 0)';

    canvases.push(this);
  },
  draw : function () {
    var entitiesCopy = this.entities.slice();
    entitiesCopy.sort(function (a, b) {
      return b.transform.position.z - a.transform.position.z;
    });

    this['drawBackground']();
    for (var i = 0; i < entitiesCopy.length; i++) {
      if (this.entities[i]) {
        for (var key in this.entities[i].transform.position) {
          this.entities[i].lastTransform.position[key] = this.entities[i].transform.position[key];
        }
      }
      if (entitiesCopy[i]) {
        var pos = entitiesCopy[i].transform.get2D(this);
        if (pos.z > 0) {
          this['draw' + entitiesCopy[i].class](entitiesCopy[i], pos);
        }
      }
    }
  }
};
Canvas.prototype.changeFOV = function (fov) {
  this.FOV = fov;

  var tan = Math.tan(Math.rad(fov / 2));
  this.camera.offsetZ = -(tan * this.width / 2 - this.width / 2);
};
Canvas.prototype.drawBackground = function () {
  this.context.fillStyle = this.background;
  this.context.fillRect(0, 0, this.width, this.height);
};
Canvas.prototype.drawParticle = function (entity, pos) {
  var size = entity.getPerceivedSize(this);

  var radialGradient = this.context.createRadialGradient(pos.x + this.offset.x, pos.y + this.offset.y, 0, pos.x + this.offset.x, pos.y + this.offset.y, size / 2);
  radialGradient.addColorStop(0, entity.color);
  radialGradient.addColorStop(0.2, entity.color);
  radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  this.context.beginPath();
  this.context.fillStyle = radialGradient;
  this.context.fillRect(pos.x + this.offset.x - size / 2, pos.y + this.offset.y - size / 2, size, size);
};

var Paint = {
  init : function () {},
  painting : function (canvas) {}
};

var Render = {
  init : function () {
    Paint.init();
    this.frame();
  },
  frame : function () {
    requestAnimationFrame(Render.frame);

    for (var i = 0; i < canvases.length; i++) {
      Paint.painting();
      canvases[i].draw();
    }
  }
};
