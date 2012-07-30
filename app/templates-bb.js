//
// templates-bb.js
//
// Javascript templating library using Backbone.
//
// ============================================================================
//
// MODEL - SIMPLE
// MODEL - DOUBLE PASS
// COLLECTION
// READY
//
// ============================================================================
//


(function() {

	TemplatesBB = {};


	///////////////////////////////////////////////////////////////////////////
	// $MODEL - SIMPLE

	TemplatesBB.TemplateModel = Backbone.Model.extend({
		defaults: {
			name: null, // Required
			markup: null, // Required
			localization: null, // Optional
			html: null
		},
		initialize: function() {
			// Reset html if attributes change
			this.on("change:markup", function() { this.set("html", null); });
			this.on("change:localization", function() { this.set("html", null); });
		},
		// Build html out of template and template data
		build: function(data) {
			// Build the html only if required
			if (_.isNull(this.get("html"))) {
				// Create template using the markup
				// Combine localization and data object
				// Execute the templating with the resulting object
				// Set result as html
				this.set("html", _.template(this.get("markup"))(_.extend(this.get("localization"), data)));
			}
		},
		// Render the template -> build it if necessary and return element's html
		render: function(data) {
			this.build(data);
			return this.get("html");
		}
	});


	///////////////////////////////////////////////////////////////////////////
	// $MODEL - DOUBLE PASS

	TemplatesBB.DoublePassTemplateModel =  TemplatesBB.TemplateModel.extend({
		// Build html out of template and template data
		build: function(data) {
			// Build the html only if required
			if (_.isNull(this.get("html"))) {
				// First pass: the data
				// Create template using the markup
				// Execute the templating with the data object
				var template = _.template(this.get("markup"))(data);

				// Adapt template settings to localization pass
				_.templateSettings = {
					interpolate: /\<\@\=(.+?)\@\>/gim,
					evaluate: /\<\@(.+?)\@\>/gim
				};

				// Second pass: the localization
				// Create template using the result of the data pass
				// Execute the templating with the localization object
				// Set result as html
				this.set("html", _.template(template)(this.get("localization")));

				// Reset template settings
				_.templateSettings = {
					interpolate: /\<\%\=(.+?)\%\>/gim,
					evaluate: /\<\%(.+?)\%\>/gim
				};
			}
		}
	});


	///////////////////////////////////////////////////////////////////////////
	// $COLLECTION

	TemplatesBB.TemplateCollection = Backbone.Collection.extend({
		baseURL: null, // Required
		lang: "en",
		isReady: false,
		model: function(attrs, options) {
			// Choose which model to instanciate according to the data
			if (!_.isUndefined(attrs.double_pass) && attrs.double_pass) {
				return new  TemplatesBB.DoublePassTemplateModel(attrs, options);
			}

			return new  TemplatesBB.TemplateModel(attrs, options);
		},
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
						// Decode markup
						data[index].markup = $("<div/>").html(data[index].markup).text();
					}
					// Localization was returned
					if (!_.isUndefined(data[index].localization)) {
						// Parse and decode localization
						data[index].localization = $.parseJSON($("<div/>").html(data[index].localization).text());
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
				var names = _.uniq(this.pluck("name"));

				// Loop through available names
				for (var index in names) {
					// Get the templates matching the name
					var models = this.where({ name: names[index]});

					// Merge them if they are two
					if (2 === models.length) {
						this.isReady = true;

						// 1 has markup -> set 0's markup with 1's markup and get rid of 1
						if (!_.isNull(models[1].get("markup"))) {
							models[0].set("markup", models[1].get("markup"));
							this.remove(models[1]);
						}
						// 1 has localization -> set 0's localization with 1's localization and get rid of 1
						if (!_.isNull(models[1].get("localization"))) {
							models[0].set("localization", models[1].get("localization"));
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
			this.fetchLocalization(callback);
		}
	});


	///////////////////////////////////////////////////////////////////////////
	// $READY

	TemplatesBB.ready = function(holder, options, callback) {
		// Make sure templates are loaded
		if (!_.isUndefined(holder.templates) && holder.templates.isReady) {
			// Templates have already been fetched...
			if (_.isFunction(callback)) {
				callback();
			}
		}
		else {
			holder.templates = new  TemplatesBB.TemplateCollection(null, options);
			holder.templates.fetchAll(function() {
				// All the templates have been fetched, let's get to business...
				if (_.isFunction(callback)) {
					callback();
				}
			});
		}
	};

}).call(this);