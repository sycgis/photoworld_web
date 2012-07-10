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

	// Check if variable exist
	RC.tools.exists = function(obj) {
		return ("undefined" !== typeof obj) && (null !== obj);
	};

	// Returns its first argument if this value is false or null; otherwise, returns its second argument
	RC.tools.and = function(obj1, obj2) {
		return (RC.tools.exists(obj1) || obj1) ? obj2 : obj1;
	};

	// Returns its first argument if this value is different from null and false; otherwise, returns its second argument
	RC.tools.or = function(obj1, obj2) {
		return (RC.tools.exists(obj1) && obj1) ? obj1 : obj2;
	};

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
			template: function() {},
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
				this.set("template", _.template(this.get("markup")));

				// Build html from template and update flag
				this.set("html", this.get("template")({ lang: this.get("localization"), data: this.get("data") }));
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
		initialize: function(args) {
			// Extend/Overwrite the parameters with the ones passed in arguments
			_.extend(this, args);
		},
		// Parse the data returned by fetch()
		parse: function(data) {
			// Make sure valid data is returned
			if (RC.tools.exists(data) && data.length >= 1) {
				// Loop through templates
				for (var index in data) {
					// Markup was returned
					if (RC.tools.exists(data[index].markup)) {
						// Decode markup and update flag
						data[index].markup = RC.tools.htmlDecode(data[index].markup);
						data[index].hasMarkup = true;
					}
					// Localization was returned
					if (RC.tools.exists(data[index].localization)) {
						// Parse and decode localization and update flag
						data[index].localization = $.parseJSON(RC.tools.htmlDecode(data[index].localization));
						data[index].hasLocalization = true;
					}
				}
			}
			else {
				// Reset templates
				this.reset();
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
	RC.template.ready = function(holder, args, callback) {
		// Make sure templates are loaded
		if (RC.tools.exists(holder.templates) && holder.templates.isReady) {
			// Templates have already been fetched...
			if (_.isFunction(callback)) {
				callback();
			}
		}
		else {
			holder.templates = new RC.template.TemplateCollection(args);
			holder.templates.fetchAll(function() {
				// All the templates have been fetched, let's get to business...
				if (_.isFunction(callback)) {
					callback();
				}
			});
		}
	};

/*
	///////////////////////////////////////////////////////////////////////////
	// $SHADER

	// Model
	RC.shader.ShaderModel = Backbone.Model.extend({
		defaults: {
			_name: "error",
			fragmentSource: "",
			vertexSource: "",
			locations: {},
			fragmentId: -1,
			vertexId: -1,
			programId: -1
		},
		initialize: function() {
			this.compile();
			this.link();
			this.bind();
		},
		compile: function(type) {
			// Fragment
			var fragmentId = gl.createShader(gl.FRAGMENT_SHADER);

			gl.shaderSource(fragmentId, this.get("fragmentSource"));
			gl.compileShader(fragmentId);

			if (!gl.getShaderParameter(fragmentId, gl.COMPILE_STATUS)) {
				console.log(gl.getShaderInfoLog(fragmentId));
				return null;
			}
			this.set("fragmentId", fragmentId);

			// Vertex
			var vertexId = gl.createShader(gl.VERTEX_SHADER);

			gl.shaderSource(vertexId, this.get("vertexSource"));
			gl.compileShader(vertexId);

			if (!gl.getShaderParameter(vertexId, gl.COMPILE_STATUS)) {
				console.log(gl.getShaderInfoLog(vertexId));
				return null;
			}
			this.set("vertexId", vertexId);
		},
		link: function() {
			var programId = gl.createProgram();

			gl.attachShader(programId, fragmentId);
			gl.attachShader(programId, vertexId);
			gl.linkProgram(programId);

			if (!gl.getProgramParameter(programId, gl.LINK_STATUS)) {
				console.log("Could not initialise shaders");
			}
			this.set("programId", programId);
		},
		bind: function() {
			var locations = this.get("locations");
			gl.useProgram(programId);

			// Attrib
			if (RC.tools.exists(locations.attrib)) {
				// ...
			}

			// Uniform
			if (RC.tools.exists(locations.uniform)) {
				// ...
			}

			shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
			gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

			shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
			shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
		},
		use: function() {
			gl.useProgram(programId);
		}
	});

	// Collection
	RC.shader.ShaderCollection = Backbone.Collection.extend({
		url: config.url + "/app/shaders/shaders.json",
		model: RC.shader.ShaderModel,
		// Initialize parameters
		initialize: function(args) {
			// Extend/Overwrite the parameters with the ones passed in arguments
			_.extend(this, args);

			// Compile shaders
			this.compile(gl.FRAGMENT_SHADER);
			this.compile(gl.VERTEX_SHADER);
		},
		// Parse the data returned by fetch()
		parse: function(data) {
			// Make sure valid data is returned
			if (RC.tools.exists(data) && data.length >= 1) {
				// Loop through shaders
				for (var index in data) {
					// Fragment source was returned
					if (RC.tools.exists(data[index].fsh)) {
						// Decode fragment source
						data[index].fragmentSource = RC.tools.htmlDecode(data[index].fsh);
					}
					// Vertex source was returned
					if (RC.tools.exists(data[index].vsh)) {
						// Decode vertex source
						data[index].vertexSource = RC.tools.htmlDecode(data[index].vsh);
					}
					// Locations were returned
					if (RC.tools.exists(data[index].loc)) {
						// Parse and decode locations of attribs and uniforms
						data[index].locations = $.parseJSON(RC.tools.htmlDecode(data[index].loc));
					}
				}
			}

			return data;
		}
	});

	// Ready, execute the callback once the shader are loaded
	RC.shader.ready = function(holder, args, callback) {
		// Make sure shaders are loaded
		if (RC.tools.exists(holder.shaders)) {
			// Shaders have already been fetched...
			if (_.isFunction(callback)) {
				callback();
			}
		}
		else {
			holder.shaders = new RC.shader.ShaderCollection(args);
			holder.shaders.fetch().done(function() {
				// All the shaders have been fetched, let's get to business...
				if (_.isFunction(callback)) {
					callback();
				}
			});
		}
	};


	///////////////////////////////////////////////////////////////////////////
	// $WEBGL

	// Model
	RC.webgl.RendererModel = Backbone.Model.extend({});

	// View
	RC.webgl.RendererView = Backbone.View.extend({
		el: "canvas",
		events: {},
		initialize: function() {},
		render: function() {}
	});
*/

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
		initialize: function() {
			console.log($("canvas"));
		},
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

			var buildWorld = function() {
				RC.photoworld.world = new RC.photoworld.WorldModel({});
				RC.photoworld.world.view = new RC.photoworld.WorldView({ model: RC.photoworld.world });
				RC.photoworld.world.view.render();
			};

			RC.template.ready(RC.photoworld, {}, buildWorld);
		}
	});


	///////////////////////////////////////////////////////////////////////////
	// $APPLICATION

	RC.photoworld.init = function(){
		console.log("Hello PhotoWorld!");

//		RC.photoworld.renderer = RC.webgl.Renderer({});
//		RC.webgl.shader.ready(RC.photoworld, {}, function() { console.log(RC.photoworld.renderer.shaders); });
/*
		// Check WebGL support
		var canvas = $("canvas").get(0);
		try {
			// Try to grab the standard context. If it fails, fallback to experimental
			RC.photoworld.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		}
		catch (e) {}

		if (!RC.tools.exists(RC.photoworld.gl)) {
			// We don't have GL context, give up now
			console.log("WebGL not available!");
			return;
		}
*/
/*
		var gl;
		function initGL(canvas) {
			try {
				gl = canvas.getContext("experimental-webgl");
				gl.viewportWidth = canvas.width;
				gl.viewportHeight = canvas.height;
			} catch (e) {
			}
			if (!gl) {
				alert("Could not initialise WebGL, sorry :-(");
			}
		}


		function getShader(gl, id) {
			var shaderScript = document.getElementById(id);
			if (!shaderScript) {
				return null;
			}

			var str = "";
			var k = shaderScript.firstChild;
			while (k) {
				if (k.nodeType == 3) {
					str += k.textContent;
				}
				k = k.nextSibling;
			}

			var shader;
			if (shaderScript.type == "x-shader/x-fragment") {
				shader = gl.createShader(gl.FRAGMENT_SHADER);
			} else if (shaderScript.type == "x-shader/x-vertex") {
				shader = gl.createShader(gl.VERTEX_SHADER);
			} else {
				return null;
			}

			gl.shaderSource(shader, str);
			gl.compileShader(shader);

			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				alert(gl.getShaderInfoLog(shader));
				return null;
			}

			return shader;
		}


		var shaderProgram;

		function initShaders() {
			var fragmentShader = getShader(gl, "shader-fs");
			var vertexShader = getShader(gl, "shader-vs");

			shaderProgram = gl.createProgram();
			gl.attachShader(shaderProgram, vertexShader);
			gl.attachShader(shaderProgram, fragmentShader);
			gl.linkProgram(shaderProgram);

			if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
				alert("Could not initialise shaders");
			}

			gl.useProgram(shaderProgram);

			shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
			gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

			shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
			shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
		}


		var mvMatrix = mat4.create();
		var pMatrix = mat4.create();

		function setMatrixUniforms() {
			gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
			gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
		}



		var triangleVertexPositionBuffer;
		var squareVertexPositionBuffer;

		function initBuffers() {
			triangleVertexPositionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
			var vertices = [
				0.0, 1.0, 0.0,
				-1.0, -1.0, 0.0,
				1.0, -1.0, 0.0
			];
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			triangleVertexPositionBuffer.itemSize = 3;
			triangleVertexPositionBuffer.numItems = 3;

			squareVertexPositionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
			vertices = [
				1.0, 1.0, 0.0,
				-1.0, 1.0, 0.0,
				1.0, -1.0, 0.0,
				-1.0, -1.0, 0.0
			];
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			squareVertexPositionBuffer.itemSize = 3;
			squareVertexPositionBuffer.numItems = 4;
		}


		function drawScene() {
			gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

			mat4.identity(mvMatrix);

			mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);
			gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
			setMatrixUniforms();
			gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);


			mat4.translate(mvMatrix, [3.0, 0.0, 0.0]);
			gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
			setMatrixUniforms();
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
		}



		function webGLStart() {
			var canvas = document.getElementById("js-canvas");
			initGL(canvas);
			initShaders();
			initBuffers();

			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.enable(gl.DEPTH_TEST);

			drawScene();
		}

		webGLStart();
*/
		// Start router
		RC.photoworld.router = new RC.photoworld.Router();
		Backbone.history.start({ pushState: true });
	};


	window.RC = RC;
	$(document).ready(RC.photoworld.init);

})(this, jQuery);
