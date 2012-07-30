//
// PhotoWorld.js
//
// PhotoWorld application, Backbone-based.
//
// ============================================================================
//
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

	// Photoworld classes holder
	var Photoworld = {};


	///////////////////////////////////////////////////////////////////////////
	// $PHOTO

	// Model
	Photoworld.PhotoModel = Backbone.Model.extend({});

	// Collection
	Photoworld.PhotoCollection = Backbone.Collection.extend({});

	// View
	Photoworld.PhotoView = Backbone.View.extend({});


	///////////////////////////////////////////////////////////////////////////
	// $AREA

	// Model
	Photoworld.AreaModel = Backbone.Model.extend({});

	// Collection
	Photoworld.AreaCollection = Backbone.Collection.extend({});

	// View
	Photoworld.AreaView = Backbone.View.extend({});


	///////////////////////////////////////////////////////////////////////////
	// $WORLD

	// Model
	Photoworld.WorldModel = Backbone.Model.extend({
		defaults: {},
		initialize: function() {}
	});

	// View
	Photoworld.WorldView = Backbone.View.extend({
		el: "#js-page",
		events: {},
		initialize: function() {},
		render: function() {}
	});


	///////////////////////////////////////////////////////////////////////////
	// $ROUTER

	Photoworld.Router = Backbone.Router.extend({
		routes: {
			"*args": "index"
		},
		index: function(args) {
			console.log("> /index");
		}
	});


	///////////////////////////////////////////////////////////////////////////
	// $APPLICATION

	Photoworld.init = function(){
		console.log("Hello PhotoWorld!");

		var renderObjects = function() {
			var gl = Photoworld.renderer.view.gl;

			// Projection matrix
			var pMatrix = mat4.create();
			mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

			// Get objects
			var triangle = Photoworld.renderer.get("objects").where({ name: "triangle" })[0];
			var square = Photoworld.renderer.get("objects").where({ name: "square" })[0];

			// Triangle's ModelView matrix
			var values = triangle.get("values");
			var mvMatrix = mat4.create();
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);
			values["uPMatrix"] = pMatrix;
			values["uMVMatrix"] = mvMatrix;
			triangle.set("values", values);

			// Square's ModelView matrix
			values = square.get("values");
			var mvMatrix2 = mat4.create();
			mat4.identity(mvMatrix2);
			mat4.translate(mvMatrix2, [1.5, 0.0, -7.0]);
			values["uPMatrix"] = pMatrix;
			values["uMVMatrix"] = mvMatrix2;
			square.set("values", values);

			// Render all
			Photoworld.renderer.view.render();
		};

		RendererBB.ready(Photoworld, { baseURL: config.url + "/app" }, renderObjects);


		// Start router
		//Photoworld.router = new Photoworld.Router();
		//Backbone.history.start({ pushState: true });
	};


	window.Photoworld = Photoworld;
	$(document).ready(Photoworld.init);

})(this, jQuery);
