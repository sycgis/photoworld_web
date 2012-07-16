//
// PhotoWorld.js
//
// PhotoWorld application, Backbone-based.
//
// ============================================================================
//
// TOOLS
// TEMPLATE
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
		url: "http://127.0.0.1:1337",
		extension: ".json"
	};

	// Namespace
	var RC = {};

	// Tools functions holder
	RC.tools = {};

	// Template classes holder
	RC.template = {};

	// WebGL renderer classes holder
	RC.renderer = {};

	// Photoworld classes holder
	RC.photoworld = {};


	///////////////////////////////////////////////////////////////////////////
	// $TOOLS

	// HTML encode
	RC.tools.htmlEncode = function(value) {
		return $("<div/>").text(value).html();
	};

	// HTML decode
	RC.tools.htmlDecode = function(value) {
		return $("<div/>").html(value).text();
	};


	///////////////////////////////////////////////////////////////////////////
	// $TEMPLATE

	// Model
	RC.template.TemplateModel = Backbone.Model.extend({
		defaults: {
			_name: "error",
			markup: "<h1><%= lang.title %></h1><h3><%= lang.error %></h3>",
			localization: { title: "Error !", error: "Template couldn't be loaded." },
			data: {},
			html: "",
			hasMarkup: false,
			hasLocalization: false,
			dirty: true
		},
		// Build html out of template and template data
		build: function() {
			// Build the html only if required
			if (this.get("dirty")) {
				// Create underscore template
				var template = _.template(this.get("markup"));

				// Build html from template and update flag
				this.set("html", template({ lang: this.get("localization"), data: this.get("data") }));
				this.set("dirty", false);
			}
		}
	});

	// Collection
	RC.template.TemplateCollection = Backbone.Collection.extend({
		lang: "en",
		isReady: false,
		baseURL: config.url + "/app/templates",
		model: RC.template.TemplateModel,
		// Initialize parameters
		initialize: function(args, options) {
			// Extend/Overwrite the parameters with the options passed in arguments
			_.extend(this, options);
		},
		// Parse the data returned by fetch()
		parse: function(data) {
			// Make sure valid data is returned
			if (!_.isUndefined(data) && data.length >= 1) {
				// Loop through templates
				for (var index in data) {
					// Markup was returned
					if (!_.isUndefined(data[index].markup)) {
						// Decode markup and update flag
						data[index].markup = RC.tools.htmlDecode(data[index].markup);
						data[index].hasMarkup = true;
					}
					// Localization was returned
					if (!_.isUndefined(data[index].localization)) {
						// Parse and decode localization and update flag
						data[index].localization = $.parseJSON(RC.tools.htmlDecode(data[index].localization));
						data[index].hasLocalization = true;
					}
				}
			}

			return data;
		},
		// Fetching markup and localization duplicates templates, this merges them
		merge: function(callback) {
			// Templates are already ready, no need for merging
			if (this.isReady) {
				return;
			}

			// No templates mean they are ready
			if (this.models.length === 0) {
				this.isReady = true;
			}
			else {
				// Get template names and avoid duplicates
				var names = _.uniq(this.pluck("_name"));

				// Loop through available names
				for (var index in names) {
					// Get the templates matching the name
					var models = this.where({ _name: names[index]});

					// Merge them if they are two
					if (2 === models.length) {
						this.isReady = true;

						// 1 has markup -> set 0's markup with 1's markup and get rid of 1
						if (models[1].get("hasMarkup")) {
							models[0].set("markup", models[1].get("markup"));
							models[0].set("hasMarkup", models[1].get("hasMarkup"));
							this.remove(models[1]);
						}
						// 1 has localization -> set 0's localization with 1's localization and get rid of 1
						if (models[1].get("hasLocalization")) {
							models[0].set("localization", models[1].get("localization"));
							models[0].set("hasLocalization",  models[1].get("hasLocalization"));
							this.remove(models[1]);
						}
					}
				}
			}

			// Templates are ready, execute callback
			if (this.isReady) {
				if (_.isFunction(callback)) {
					callback();
				}
			}
		},
		// Fetch the markup only and try to merge it once it's received
		fetchMarkup: function(callback) {
			var that = this;
			this.isReady = false;
			this.url = this.baseURL + "/html.json";
			this.fetch({ add: true }).done(function() { that.merge(callback); });
		},
		// Fetch the localization only and try to merge it once it's received
		fetchLocalization: function(callback) {
			var that = this;
			this.isReady = false;
			this.url = this.baseURL + "/" + this.lang + ".json";
			this.fetch({ add: true }).done(function() { that.merge(callback); });
		},
		// Fetch both markup and localization
		fetchAll: function(callback) {
			this.fetchMarkup(callback);
			this.fetchLocalization(callback);
		},
		// Change all templates' language (fetch and apply)
		setLanguage: function(lang, callback) {
			var that = this;
			this.lang = lang;
			this.fetchLocalization(function() {
				// Rebuild template once the localization has been updated
				_.each(that.models, function(template) {
					template.set("dirty", true);
					template.build();
				});
				// Execute callback
				if (_.isFunction(callback)) {
					callback();
				}
			});
		}
	});

	// View
	RC.template.TemplateView = Backbone.View.extend({
		events: {},
		// Render the template -> build it if necessary and return element's html
		render: function() {
			this.model.build();
			return this.model.get("html");
		}
	});

	// Ready, execute the callback once the templates are loaded
	RC.template.ready = function(holder, options, callback) {
		// Make sure templates are loaded
		if (!_.isUndefined(holder.templates) && holder.templates.isReady) {
			// Templates have already been fetched...
			if (_.isFunction(callback)) {
				callback();
			}
		}
		else {
			holder.templates = new RC.template.TemplateCollection(null, options);
			holder.templates.fetchAll(function() {
				// All the templates have been fetched, let's get to business...
				if (_.isFunction(callback)) {
					callback();
				}
			});
		}
	};


	///////////////////////////////////////////////////////////////////////////
	// $RENDERER

	// Shader Model
	RC.renderer.ShaderModel = Backbone.Model.extend({
		defaults: {
			_name: "error",
			fsh: "",
			vsh: "",
			loc: {},
			fragmentShader: null,
			vertexShader: null,
			program: null
		},
		initialize: function(args, options) {
			var gl = options.collection.gl;

			this.compile(gl);
			this.link(gl);
			this.bind(gl);
		},
		compile: function(gl) {
			// Fragment
			var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

			gl.shaderSource(fragmentShader, this.get("fsh"));
			gl.compileShader(fragmentShader);

			if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
				console.log(gl.getShaderInfoLog(fragmentShader));
				return null;
			}
			this.set("fragmentShader", fragmentShader);

			// Vertex
			var vertexShader = gl.createShader(gl.VERTEX_SHADER);

			gl.shaderSource(vertexShader, this.get("vsh"));
			gl.compileShader(vertexShader);

			if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
				console.log(gl.getShaderInfoLog(vertexShader));
				return null;
			}
			this.set("vertexShader", vertexShader);
		},
		link: function(gl) {
			var program = gl.createProgram();

			gl.attachShader(program, this.get("fragmentShader"));
			gl.attachShader(program, this.get("vertexShader"));
			gl.linkProgram(program);

			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				console.log("Could not initialise shaders");
			}
			this.set("program", program);
		},
		bind: function(gl) {
			var locations = this.get("loc");
			var program = this.get("program");
			gl.useProgram(program);

			// Attrib
			if (!_.isUndefined(locations.attrib)) {
				for (var attrib in locations.attrib) {
					if (-1 !== locations.attrib[attrib]) {
						// Bind attribute location
						//gl.bindAttribLocation(program, locations.attrib[attrib], attrib);
						locations.attrib[attrib] = gl.getAttribLocation(program, attrib);
					}
					else {
						// Get attribute location
						locations.attrib[attrib] = gl.getAttribLocation(program, attrib);
					}
					gl.enableVertexAttribArray(locations.attrib[attrib]);
				}
			}

			// Uniform
			if (!_.isUndefined(locations.uniform)) {
				for (var uniform in locations.uniform) {
					// Get uniform location
					locations.uniform[uniform] = gl.getUniformLocation(program, uniform);
				}
			}
		},
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
					if (!_.isUndefined(data[index].fsh)) {
						// Decode fragment source
						data[index].fsh = RC.tools.htmlDecode(data[index].fsh);
					}
					// Vertex source was returned
					if (!_.isUndefined(data[index].vsh)) {
						// Decode vertex source
						data[index].vsh = RC.tools.htmlDecode(data[index].vsh);
					}
					// Locations were returned
					if (!_.isUndefined(data[index].loc)) {
						// Parse and decode locations of attribs and uniforms
						data[index].loc = $.parseJSON(RC.tools.htmlDecode(data[index].loc));
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
			_name: "error",
			shader: null
		},
		initialize: function(args, options) {
/*			var gl = options.collection.gl;

			if (this.get("_name") === "triangle") {
				this.triangleVertexPositionBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexPositionBuffer);
				var vertices = [
					0.0, 1.0, 0.0,
					-1.0, -1.0, 0.0,
					1.0, -1.0, 0.0
				];
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
				this.triangleVertexPositionBuffer.itemSize = 3;
				this.triangleVertexPositionBuffer.numItems = 3;
			}

			if (this.get("_name") === "square") {
				this.squareVertexPositionBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
				var vertices = [
					1.0, 1.0, 0.0,
					-1.0, 1.0, 0.0,
					1.0, -1.0, 0.0,
					-1.0, -1.0, 0.0
				];
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
				this.squareVertexPositionBuffer.itemSize = 3;
				this.squareVertexPositionBuffer.numItems = 4;
			}

			this.shader = RC.renderer.shaders.where({ _name: "simple" })[0];

			var pMatrix = mat4.create();
			mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
			gl.uniformMatrix4fv(this.shader.get("loc").uniform["uPMatrix"], false, pMatrix);
*/		}
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

			// HACK
			this.add(new RC.renderer.ObjectModel({ _name: "triangle", shader: "" }));
			this.add(new RC.renderer.ObjectModel({ _name: "square", shader: "" }));
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
			RC.renderer.objects = new RC.renderer.ObjectCollection(null, options);
			RC.renderer.objects.fetch().done(function() {
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

			//initBuffers();
			this.triangleVertexPositionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexPositionBuffer);
			var vertices = [
				0.0, 1.0, 0.0,
				-1.0, -1.0, 0.0,
				1.0, -1.0, 0.0
			];
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			this.triangleVertexPositionBuffer.itemSize = 3;
			this.triangleVertexPositionBuffer.numItems = 3;

			this.squareVertexPositionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
			vertices = [
				1.0, 1.0, 0.0,
				-1.0, 1.0, 0.0,
				1.0, -1.0, 0.0,
				-1.0, -1.0, 0.0
			];
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			this.squareVertexPositionBuffer.itemSize = 3;
			this.squareVertexPositionBuffer.numItems = 4;


			this.shader = RC.renderer.shaders.where({ _name: "simple" })[0];


			var pMatrix = mat4.create();
			mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
			gl.uniformMatrix4fv(this.shader.get("loc").uniform["uPMatrix"], false, pMatrix);


			var mvMatrix = mat4.create();

			//drawScene();
			gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			mat4.identity(mvMatrix);

			mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexPositionBuffer);
			gl.vertexAttribPointer(this.shader.get("loc").attrib["aVertexPosition"], this.triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.uniformMatrix4fv(this.shader.get("loc").uniform["uMVMatrix"], false, mvMatrix);
			gl.drawArrays(gl.TRIANGLES, 0, this.triangleVertexPositionBuffer.numItems);

			mat4.translate(mvMatrix, [3.0, 0.0, 0.0]);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
			gl.vertexAttribPointer(this.shader.get("loc").attrib["aVertexPosition"], this.squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.uniformMatrix4fv(this.shader.get("loc").uniform["uMVMatrix"], false, mvMatrix);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.squareVertexPositionBuffer.numItems);
		}
	});

	// Ready, execute the callback once the shaders and the objects are loaded
	RC.renderer.ready = function(holder, options, callback) {
		holder.renderer = new RC.renderer.RendererModel(null, options);
		holder.renderer.view = new RC.renderer.RendererView({ model: RC.renderer.renderer });

		var whenReady = function() {
			if (!_.isUndefined(RC.renderer.shaders) && RC.renderer.shaders.isReady) {// && !_.isUndefined(RC.renderer.buffers) && RC.renderer.buffers.isReady) {
				// Execute callback
				if (_.isFunction(callback)) {
					callback();
				}
				// Render the scene
				holder.renderer.view.render();
			}
		};

		// Make sure shaders are loaded
		RC.renderer.shadersReady({ gl: holder.renderer.view.gl }, whenReady);

		// Make sure objects are loaded
		RC.renderer.objectsReady({ gl: holder.renderer.view.gl }, whenReady);
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
