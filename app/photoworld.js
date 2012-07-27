//
// PhotoWorld.js
//
// PhotoWorld application, Backbone-based.
//
// ============================================================================
//
// SHADER
// WEBGL
// PHOTO
// AREA
// WORLD
// ROUTER
// APPLICATION
//
// ============================================================================
//


(function(window, $) {

	// Global configuration
	var config = {
		url: "http://127.0.0.1:1337"
	};

	// Namespace
	var RC = {};

	// WebGL renderer classes holder
	RC.renderer = {};

	// Photoworld classes holder
	RC.photoworld = {};


	///////////////////////////////////////////////////////////////////////////
	// $RENDERER

	// Shader Model
	RC.renderer.ShaderModel = Backbone.Model.extend({
		defaults: {
			name: null, // Required
			locations: null, // Optional
			program: null,
			bound: false
		},
		// Initialize and build the shader's program
		initialize: function(args, options) {
			if (!this.get("bound")) {
				var gl = options.collection.gl;

				// Compile the shader's source
				this.compile(gl);
				// Link the fragment and the vertex shaders
				this.link(gl);
				// Bind the program and the locations
				this.bind(gl);
			}
		},
		// Compile the shader's source
		compile: function(gl) {
			if (_.isUndefined(this.get("fragmentObject")) && _.isUndefined(this.get("vertexObject"))) {
				// Fragment
				var fragmentObject = gl.createShader(gl.FRAGMENT_SHADER);

				// Compile fragment shader
				gl.shaderSource(fragmentObject, this.get("fragment"));
				gl.compileShader(fragmentObject);

				// Check for errors and set attributes
				if (!gl.getShaderParameter(fragmentObject, gl.COMPILE_STATUS)) {
					console.log(gl.getShaderInfoLog(fragmentObject));
					return null;
				}
				this.unset("fragment");
				this.set("fragmentObject", fragmentObject);

				// Vertex
				var vertexObject = gl.createShader(gl.VERTEX_SHADER);

				// Compile vertex shader
				gl.shaderSource(vertexObject, this.get("vertex"));
				gl.compileShader(vertexObject);

				// Check for errors and set attributes
				if (!gl.getShaderParameter(vertexObject, gl.COMPILE_STATUS)) {
					console.log(gl.getShaderInfoLog(vertexObject));
					return null;
				}
				this.unset("vertex");
				this.set("vertexObject", vertexObject);
			}
		},
		// Link the fragment and the vertex shaders
		link: function(gl) {
			if (_.isNull(this.get("program"))) {
				// Create program
				var program = gl.createProgram();

				// Attach and link shaders
				gl.attachShader(program, this.get("fragmentObject"));
				gl.attachShader(program, this.get("vertexObject"));
				gl.linkProgram(program);

				// Check for errors and set attributes
				if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
					console.log("Could not initialise shaders");
				}
				this.unset("fragmentObject");
				this.unset("vertexObject");
				this.set("program", program);
			}
		},
		// Bind the program and the locations
		bind: function(gl) {
			if (!this.get("bound")) {
				var locations = this.get("locations");
				var program = this.get("program");
				gl.useProgram(program);

				for (var name in locations) {
					if ("a" === name[0]) {
						// Attribute
						if (-1 !== locations[name]) {
							// Bind attribute location
							gl.bindAttribLocation(program, locations[name], name);
						}
						else {
							// Get attribute location
							locations[name] = gl.getAttribLocation(program, name);
						}
						gl.enableVertexAttribArray(locations[name]);
					}
					else {
						// Uniform
						if ("u" === name[0]) {
							// Get uniform location
							locations[name] = gl.getUniformLocation(program, name);
						}
					}
				}

				// Set the shader as being bound and ready
				this.set("bound", true);
			}
		},
		// Set this program as current
		use: function(gl) {
			gl.useProgram(this.get("program"));
		}
	});

	// Shader Collection
	RC.renderer.ShaderCollection = Backbone.Collection.extend({
		gl: null,
		isReady: false,
		url: config.url + "/app/shaders/shaders.json",
		model: RC.renderer.ShaderModel,
		// Initialize parameters
		initialize: function(args, options) {
			// Extend/Overwrite the parameters with the options in arguments
			_.extend(this, options);
		},
		// Parse the data returned by fetch()
		parse: function(data) {
			// Make sure valid data is returned
			if (!_.isUndefined(data) && data.length >= 1) {
				// Loop through shaders
				for (var index in data) {
					// Fragment source was returned
					if (!_.isUndefined(data[index].fragment)) {
						// Decode fragment source
						data[index].fragment = $("<div/>").html(data[index].fragment).text();
					}
					// Vertex source was returned
					if (!_.isUndefined(data[index].vertex)) {
						// Decode vertex source
						data[index].vertex = $("<div/>").html(data[index].vertex).text();
					}
					// Locations were returned
					if (!_.isUndefined(data[index].locations)) {
						// Parse and decode locations of attribs and uniforms
						data[index].locations = $.parseJSON($("<div/>").html(data[index].locations).text());
					}
				}
			}

			return data;
		}
	});

	// Ready, execute the callback once the shaders are loaded
	RC.renderer.shadersReady = function(options, callback) {
		// Make sure shaders are loaded
		if (!_.isUndefined(RC.renderer.shaders) && RC.renderer.shaders.isReady) {
			// Shaders have already been fetched...
			if (_.isFunction(callback)) {
				callback();
			}
		}
		else {
			// Create and load shaders
			RC.renderer.shaders = new RC.renderer.ShaderCollection(null, options);
			RC.renderer.shaders.fetch().done(function() {
				RC.renderer.shaders.isReady = true;

				// All the shaders have been fetched, let's get to business...
				if (_.isFunction(callback)) {
					callback();
				}
			});
		}
	};


	// Object Model
	RC.renderer.ObjectModel = Backbone.Model.extend({
		defaults: {
			name: null, // Required
			shader: null, // Optional
			values: null, // Optional
			buffer: null, // Optional
			size: null, // Optional
			count: null // Optional
		},
		// Initialize with parameters
		initialize: function(args, options) {
			var gl = options.collection.gl;

			this.set("buffer", gl.createBuffer());
			gl.bindBuffer(gl.ARRAY_BUFFER, this.get("buffer"));
			var vertices = [
				0.0, 1.0, 0.0,
				-1.0, -1.0, 0.0,
				1.0, -1.0, 0.0
			];
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.get("vertices")), gl.STATIC_DRAW);
			this.unset("vertices");

			this.set("shader", RC.renderer.shaders.where({ name: this.get("shader_name") })[0]);
			this.unset("shader_name");

			this.set("values",  $.extend(true, {}, this.get("shader").get("locations")));

			// HACK
			var pMatrix = mat4.create();
			mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
			gl.uniformMatrix4fv(this.get("shader").get("locations")["uPMatrix"], false, pMatrix);

			var mvMatrix = mat4.create();
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [0.0, 0.0, 0.0]);
			gl.uniformMatrix4fv(this.get("shader").get("locations")["uMVMatrix"], false, mvMatrix);

			this.on(
				"change:values",
				function() {
					// HACK
					gl.uniformMatrix4fv(this.get("shader").get("locations")["uMVMatrix"], false, this.get("values")["uMVMatrix"]);
				}
			);
		},
		render: function(gl) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.get("buffer"));
			gl.vertexAttribPointer(this.get("shader").get("locations")["aVertexPosition"], this.get("size"), gl.FLOAT, false, 0, 0);
			gl.drawArrays(gl.TRIANGLES, 0, this.get("count"));
		}
	});

	// Object Collection
	RC.renderer.ObjectCollection = Backbone.Collection.extend({
		gl: null,
		isReady: false,
		url: config.url + "/app/objects/objects.json",
		model: RC.renderer.ObjectModel,
		// Initialize parameters
		initialize: function(args, options) {
			// Extend/Overwrite the parameters with the options in arguments
			_.extend(this, options);
		},
		// Parse the data returned by fetch()
		parse: function(data) {
			// Make sure valid data is returned
			if (!_.isUndefined(data) && data.length >= 1) {
				// Loop through objects
				for (var index in data) {
					// GL context
					data[index].gl = this.gl;
				}
			}

			return data;
		}
	});

	// Ready, execute the callback once the objects are loaded
	RC.renderer.objectsReady = function(options, callback) {
		// Make sure objects are loaded
		if (!_.isUndefined(RC.renderer.objects) && RC.renderer.objects.isReady) {
			// Objects have already been fetched...
			if (_.isFunction(callback)) {
				callback();
			}
		}
		else {
			// Create and load objects
			RC.renderer.objects = new RC.renderer.ObjectCollection(null, options);
			// HACK: We're not fetching the objects yet so set the add option
			RC.renderer.objects.fetch({ add: true }).done(function() {
				// All the objects have been fetched, let's get to business...
				if (_.isFunction(callback)) {
					callback();
				}
			});
		}
	};


	// Renderer Model
	RC.renderer.RendererModel = Backbone.View.extend({
		defaults: {
			shaders: {},
			objects: {}
		},
		initialize: function() {}
	});

	// Renderer View
	RC.renderer.RendererView = Backbone.View.extend({
		el: "canvas",
		gl: null,
		events: {},
		initialize: function(args, options) {
			// Extend/Overwrite the parameters with the options passed in arguments
			_.extend(this, options);

			var gl;

			// Get canvas
			var canvas = this.$el[0];
			if (_.isNull(canvas)) {
				console.log("Canvas not available!");
				return;
			}

			// Initialize WebGL
			try {
				gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
				gl.viewportWidth = canvas.width;
				gl.viewportHeight = canvas.height;
			}
			catch (e) {}

			if (_.isNull(gl)) {
				console.log("WebGL not available!");
				return;
			}

			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.enable(gl.DEPTH_TEST);
			this.gl = gl;
		},
		render: function() {
			var gl = this.gl;

			gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			var triangle = RC.renderer.objects.where({ name: "triangle" })[0];
			var values = triangle.get("values");

			var mvMatrix = mat4.create();
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);
			values["uMVMatrix"] = mvMatrix;
			triangle.set("values", values);
console.log(triangle.get("values"));
			// Why do I need to trigger the event myself?
			triangle.trigger("change:values");
			triangle.render(gl);


			var square = RC.renderer.objects.where({ name: "square" })[0];
			values = square.get("values");

			var mvMatrix2 = mat4.create();
			mat4.identity(mvMatrix2);
			mat4.translate(mvMatrix2, [1.5, 0.0, -7.0]);
			values["uMVMatrix"] = mvMatrix2;
			square.set("values", values);
console.log(square.get("values"));
			// Why do I need to trigger the event myself?
			square.trigger("change:values");
			square.render(gl);
		}
	});

	// Ready, execute the callback once the shaders and the objects are loaded
	RC.renderer.ready = function(holder, options, callback) {
		// Build renderer
		holder.renderer = new RC.renderer.RendererModel(null, options);
		holder.renderer.view = new RC.renderer.RendererView({ model: RC.renderer.renderer });

		// Make sure shaders are loaded first
		var whenShadersReady = function() {
			// Then make sure the objects are loaded
			var whenObjectsReady = function() {
				// Execute callback
				if (_.isFunction(callback)) {
					callback();
				}
				// Render the scene
				holder.renderer.view.render();
			};

			// Load objects
			RC.renderer.objectsReady({ gl: holder.renderer.view.gl }, whenObjectsReady);
		};

		// Load shaders
		RC.renderer.shadersReady({ gl: holder.renderer.view.gl }, whenShadersReady);
	};


	///////////////////////////////////////////////////////////////////////////
	// $PHOTO

	// Model
	RC.photoworld.PhotoModel = Backbone.Model.extend({});

	// Collection
	RC.photoworld.PhotoCollection = Backbone.Collection.extend({});

	// View
	RC.photoworld.PhotoView = Backbone.View.extend({});


	///////////////////////////////////////////////////////////////////////////
	// $AREA

	// Model
	RC.photoworld.AreaModel = Backbone.Model.extend({});

	// Collection
	RC.photoworld.AreaCollection = Backbone.Collection.extend({});

	// View
	RC.photoworld.AreaView = Backbone.View.extend({});


	///////////////////////////////////////////////////////////////////////////
	// $WORLD

	// Model
	RC.photoworld.WorldModel = Backbone.Model.extend({
		defaults: {},
		initialize: function() {}
	});

	// View
	RC.photoworld.WorldView = Backbone.View.extend({
		el: "#js-page",
		events: {},
		initialize: function() {},
		render: function() {}
	});


	///////////////////////////////////////////////////////////////////////////
	// $ROUTER

	RC.photoworld.Router = Backbone.Router.extend({
		routes: {
			"*args": "index"
		},
		index: function(args) {
			console.log("> /index");
		}
	});


	///////////////////////////////////////////////////////////////////////////
	// $APPLICATION

	RC.photoworld.init = function(){
		console.log("Hello PhotoWorld!");

		RC.renderer.ready(RC.photoworld);

		// Start router
		//RC.photoworld.router = new RC.photoworld.Router();
		//Backbone.history.start({ pushState: true });
	};


	window.RC = RC;
	$(document).ready(RC.photoworld.init);

})(this, jQuery);
