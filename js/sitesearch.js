$.fn.shake = function(intShakes, intDistance, intDuration) {
	this.each(function() {
        $(this).css("position","relative"); 
        for (var x=1; x<=intShakes; x++) {
        $(this).animate({left:(intDistance*-1)}, (((intDuration/intShakes)/4)))
    .animate({left:intDistance}, ((intDuration/intShakes)/2))
    .animate({left:0}, (((intDuration/intShakes)/4)));
    }
  });
return this;
};

var Settings = {
	pairedFields : {
		'data-from':'data-from-years',	// 'field_name' requires 'other_field_name'
		'keyword-fields':'keyword'
	}
}

$(function(){

//$('body').mouseTracker();
//$('body').mouseTracker('startRecording');


///////////
// Views //
///////////

var FilterView = Backbone.View.extend({

    el: '#filter',
    
    events: {
        //'focus #keyword, #people, #region, #precipitation, #ta, #elevation, #data-from-years' : 'listenForChange',
        //'blur #keyword, #people, #region, #precipitation, #ta, #elevation, #data-from-years' : 'stopListening',
        'change select' : 'processVars',
		'keydown input[type=text], textarea' : 'keydown',
        'click input[type=radio]' : 'processVars',
        'click #clear-all-filters': 'clearAllFilters',
        'click .fa-filter':'stopRecording',
		'click .panel .panel-heading':'togglePanelCollapse',
        //megha testing new functions
        'click .filter-btn': 'initiateFilter',
        'click .clear-input-btn': 'clearInputField',
        'click #submit-btn': 'processVars',
        'focus .control-with-clear': 'showClearBtn',
        'mouseover .control-with-clear': 'showClearBtn',
        'blur .control-with-clear': 'hideClearBtn',
        'mouseout .control-with-clear': 'hideClearBtn'
    },
    
    initialize: function (options) {
        var self = this;
        this.ignoreFields = ['year-span'];
        this.router = options.router;

        this.getRegionList({callback: function() { self.render(options); }});

        this.listenTo(this.collection, 'remove', function(model){
			self.addSiteIdFilter(model.decodeLookup('SITE_ID'));
        });

        this.listenToOnce(this.collection, 'sync', function(model){
            self.processVars();
        });

        //this.render(); 
    },
    
    render: function (options) {
        var self = this;
        
		// Setup Accordion
	    $(this.el).find('.panel').on('show.bs.collapse', function(e){
			$(this).find('.panel-heading > a > i').removeClass('fa-caret-right').addClass('fa-caret-down');
        });
        $(this.el).find('.panel').on('hide.bs.collapse', function(e){
            $(this).find('.panel-heading > a > i').removeClass('fa-caret-down').addClass('fa-caret-right');
        });
                
        //
        // Set up Type Ahead
        //
        
        // People
        //$(this.el).find('input[name=people]').typeahead({source:People});
        
        // Geographic Regions
        //$(this.el).find('input[name=region]').typeahead({source:self.regionList});
                
        //
        // Set up validation
        //
        $(this.el).find("input,select,textarea").not("[type=submit]").jqBootstrapValidation();
                        
        this.setInputValues(options.query);
        //this.processVars();                        

        return this;
    },
    
	togglePanelCollapse: function(e) {
		$(e.target).closest('.panel').find('.panel-collapse').collapse('toggle');
	},
	
    getRegionList: function(options) {
        var self = this;
        
        this.regionList = [];
                
        // Set up Global Variable for Country Code Lookup

        CountryNames = {};
        StateNames = {};
        		
        // Countries
        $.getJSON('http://wile.lbl.gov:8080/AmeriFlux/SiteSearch.svc/SiteSearchDisplayCV/COUNTRY/', function(data) {
            _.each(data, function(country){
				self.regionList.push(country.description);
                // Set global Country Name lookup
                CountryNames[country.description] = country;                	
                CountryNames[country.shortname] = country;                	
            });

	        // States/Provinces
	        $.getJSON('http://wile.lbl.gov:8080/AmeriFlux/SiteSearch.svc/SiteSearchDisplayCV/STATE_PROVINCE/', function(data) {
	            _.each(data, function(state){
					self.regionList.push(state.description);
	                StateNames[state.description] = state;                	
	                StateNames[state.shortname] = state;                	
	            });
				// Call the callback
                options.callback();
	        });
        });        
        
    },
    
    // NOT CURRENTLY IN USE
	// LEFT FOR POSTERITY
	listenForChange: function(event) {
        
        if (this.changeTimer) {
            clearTimeout(this.changeTimer);
        }
        
        this.oldValue = false;
        var targetInput = $(event.target);
        this.checkIfChanged(this, targetInput);        
    },

    // NOT CURRENTLY IN USE
	// LEFT FOR POSTERITY
    stopListening: function(event) {
        
        if (this.changeTimer) {
            clearTimeout(this.changeTimer);
        }
        
    },
    
	keydown: function(event) {
        var self = this;
		// Wait for key down event to be registered by the input
		// TO DO: There's got to be a better way to do this

        //megha testing change behavior

        if(event.keyCode == 13) {
    		setTimeout(function(){
    			var targetInput = $(event.target);
    			self.checkIfValid(self, targetInput);
        	},5);
        }
	},
	
    checkIfValid: function(self, targetInput) {
        //megha testing change behavior
		//if ((_.indexOf(['precipitation', 'ta', 'elevation', 'data-from-years'], $(targetInput).attr('id')) > -1 && $(targetInput).attr('aria-invalid') == 'false') || 
		//	_.indexOf(['precipitation', 'ta', 'elevation', 'data-from-years'], $(targetInput).attr('id')) == -1) {
			this.processVars();                	
        //}
    },
    
    clearAllFilters: function(event) {
		event.preventDefault();
		event.stopPropagation();
        this.setInputValues(null);
        this.processVars();
    },
    
    setInputValues: function(variables) {
        var self = this;
        
        var setValue = function(name, value){
            var $input = $(self.el).find('#' + name);
            if ($input.length > 0) {
				if ($input.is('select') && $input.attr('multiple', true)) {
					var values = value.split(',');
					_.each(values, function(thisValue){
						$input.find('option').filter(function() { 
				    		return ($(this).attr('value') == thisValue);
						}).prop('selected', true); 
					});
				} else {
	                $input.val(value);					
				}
            } else {
                var $radios = $(self.el).find('[name=' + name + ']');
				if (name != 'filter-type' || name == 'filter-type' && value != null) {
	                _.each($radios, function(radio){
						if ($(radio).val() == value) {
	                        $(radio).attr({'checked':'checked'});
	                    } else {
	                        $(radio).attr({'checked':false});                    
	                    }
	                });     					
				}
            }
        }
        
        var clearValue = function(input) {
            if ($(input).attr('type') == 'radio') {
                $(input).attr({'checked':false});                    
            } else {
                $(input).val('');
            }
        }
        // Reset Variables to Defaults
        _.each($(this.el).find('input, select').not('[name=filter-type],[name=data-from],[name=keyword-fields]'), function(input){
            clearValue(input);
        });
        
        if (variables) {
            var vars = variables.split('&');
            _.each(vars, function(keyValuePair, index) {
                var keyValueList = keyValuePair.split('=');
                var inputName = decodeURIComponent(keyValueList[0]);
                var value = decodeURIComponent(keyValueList[1]);
                setValue(inputName, value);           
            });
        }
    },
    
    processVars: function() {
        var self = this;
        		
		// Show loading
		this.collection.trigger('showLoading');

		this.ignore = [];
        var hasErrors = $(this.el).find("input,select,textarea").not("[type=submit]").jqBootstrapValidation("hasErrors");
        if (hasErrors) {
            var errors = $(this.el).find("input,select,textarea").not("[type=submit]").jqBootstrapValidation("collectErrors");
            _.each(errors, function(error, key){
                 //megha adding extra validation
               
                 self.ignore.push(key);

            });

            _.each(errors, function(error, key){
                if($('input[name='+key+']').hasClass('control-with-clear') && $('input[name='+key+']').val()) {
                    //$('input[name='+key+']').nearest('form-group').find('input-message').show();
                    //console.log('here');
                    $('input[name='+key+']').closest('.form-group').find('.input-message').show();
                }
            });
        }

        //megha adding extra validation for range specification

        //extra validation end

        if(!hasErrors) {
            var vars = $(this.el).find('#filter-form').find('input, select, textarea').serializeArray();
            this.updateResults({vars: vars});
        }
        else {
            this.collection.trigger('hideLoading');
        }
    },
    

    //range validator function - megha
    //needs more work
    validateRange: function(rangeInputs) {
        var rangePattern = /^[\-\+]?[0-9]+ *[to\-]+ *[\-\+]?[0-9]+$/;

        $(rangeInputs).each(function() {
            var rangeValues;

            if($(this).val().search(rangePattern) != -1) {

                var matches = $(this).val().match(/[\-\+]?\d+/);
                console.log(matches);

                if($(this).val().indexOf('to') != -1) {
                    rangeValues = $(this).val().split('to');
                }
                else {
                    rangeValues = $(this).val().split('-');
                }

                console.log(rangeValues);
            }
        });

    },

    updateResults: function(options) {        
		var params = this.collection.createParamsFromSerializedArray({vars: options.vars, ignore: this.ignore});
        this.updateURI(params);
        this.updateFilterLabelDisplay(options);
		
		if (!options.silent) {
			this.collection.filterBy({'params':params});			
		}
		// TO DO:
        // This function needs to be overhaulled (takes tooooo lloooonnggg)
		//this.updateFilters();
    },
    
    updateURI: function(params) {
        var vars = [];
        _.each(params, function(value, key) {
            vars.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        });
        
        this.router.navigate('/' + vars.join('&'));
    },
    
    updateFilters: function() {
        var self = this;
        
        // DEMO NOTE: This would probably be quicker as a REST service
        
        _.each($(this.el).find('select'), function(input){
            var potentialFormVars = $(self.el).find('form').serializeArray();
            var thisValueSet = _.find(potentialFormVars, function(object) {
                return object.name == $(input).attr('name');
            });
            
            // If the value set is not in the serialized array then make it
            if (!thisValueSet) {
                thisValueSet = {'name':$(input).attr('name')};
                potentialFormVars.push(thisValueSet);
            }
            
            _.each($(input).find('option'), function(option){
                thisValueSet.value = $(option).attr('value');
                var params = self.collection.createParamsFromSerializedArray({vars: potentialFormVars, ignore: this.ignore});
                var numResults = self.collection.filterBy({'params':params, 'returnNumResultsOnly': true});
                if (numResults > 0) {
                    $(option).html($(option).attr('data-original-text') + ' (' + numResults + ')');
                    //$(option).attr({disabled: false});
                    //$(option).show();
                } else {
                    $(option).html($(option).attr('data-original-text') + ' (' + numResults + ')');
                    //$(option).attr({disabled: 'disabled'});
                    //$(option).hide();
                }
                
            });
            //$(input).trigger("liszt:updated");
        });
        
    },
    
    updateFilterLabelDisplay: function(options) {
        var self = this;
        var labels = [];
        
        // Create a new FilterLabelListView & collection if necessary
        if (!this.filterLabelsCollection) {
            this.filterLabelsCollection = new FilterLabelsCollection();
            this.filterLabelListView = new FilterLabelListView({ collection: this.filterLabelsCollection});
            this.filterLabelListView.filterView = this;
        }

        // Otherwise just update the labels in the collection
        this.filterLabelsCollection.resetLabelsFromFormVars({vars: options.vars, ignore: this.ignore});
    },
    
    removeFilter: function(inputName, value) {
        if (inputName == 'site_id') {
            this.removeSiteIdFilter(value);
        } else if (inputName == 'active') {
            var input = $(this.el).find('[name=active]');
            input.attr('checked', false);        
            this.processVars();
        } else if (inputName == 'data-from') {
            var input = $(this.el).find('[name=data-from]');
            input.attr('checked', false);        
            this.processVars();
        } else {
            var input = $(this.el).find('#' + inputName);        
            if (input.is('select') && input.attr('multiple', true)) {
				input.find('option').filter(function() { 
				    return ($(this).attr('value') == value);
				}).prop('selected', false);            	
            } else {
				// Reset input to default value
	            input.val('');
	            // Process the resulting form variables            	
            }
            this.processVars();
        }
        
        
    },
    
    addSiteIdFilter: function(siteId) {
        var self = this;
        var value = this.$el.find('#site_id').val();
        var values = value == '' ? [] : value.split(', ');
        values.push(siteId);
        this.$el.find('#site_id').val(values.join(', '));
        
        self.filterLabelsCollection.add(new FilterLabelModel({label: 'NOT', value: siteId, name: 'site_id'}));
        //this.updateFilters(); // Takes tooooooo loooonnngggg
        
        // Process the resulting form variables
        //this.processVars();            

        var vars = $(this.el).find('#filter-form').find('input, select, textarea').serializeArray();
        this.updateResults({vars: vars, silent: true});

    },
    
    removeSiteIdFilter: function(siteId) {
        var value = this.$el.find('#site_id').val();
        var values = value.split(', ');
        values.splice(_.indexOf(siteId), 1);
        this.$el.find('#site_id').val(values.join(', '));

        // Process the resulting form variables
        this.processVars();
    },

     //megha testing new functions
    initiateFilter: function(e) {
        //alert('Bang!');
        //any other preprocessing to be done here?
        this.processVars();
    },

    clearInputField: function(e) {
        $(e.currentTarget).parent().find('input').val('');
    },

    showClearBtn: function(e) {
        $(e.currentTarget).parent().siblings('.clear-input-btn').show();
    },

    hideClearBtn: function(e) {
        var clearBtn = $(e.currentTarget).parent().siblings('.clear-input-btn');

        //if current input field is not in focus and the mouse is not hovering over the clear button
        //hide the clear button

        if(!$(e.currentTarget).is(':focus') && !$(clearBtn).is(':hover')) {
            $(clearBtn).hide();
        }
    }

});

var FilterLabelListView = Backbone.View.extend({

    el: '#filter-read-out',
    
    initialize: function () {
        this.listenTo(this.collection, 'reset', this.render);        
        this.listenTo(this.collection, 'add', this.addLabelModel);        
    },
    
	render: function() {
        var self = this;
        $(this.el).empty();
        this.labelViews = [];
        this.labelListItems = [];
        _.each(this.collection.models, function(label) {
            if (Settings.pairedFields.hasOwnProperty(label.get('name'))) {
            	if (self.collection.where({'name':Settings.pairedFields[label.get('name')]}).length > 0) {
					self.addLabel(label, false);            	            		
            	}				
            } else {
				self.addLabel(label, false);            	
            }
        });
        
        if (this.labelListItems.length > 0 ) {
            $(this.el).append(this.labelListItems);
        } else {
            $(this.el).append(ich.noFilters());
        }
        
        return this;
	},
	
	addLableModel: function(model, collection, options) {
		this.addLabel(model, true);
	},
	
	addLabel: function(label, append) {
        var labelView = this.createLabel(label);
        labelView.render();
        this.labelListItems.push(labelView.el);
		if (append) {
            $(this.el).append(labelView.el);
		}
	},
			
	createLabel: function(labelModel) {
	    var labelView = new FilterLabelView({model: labelModel});
	    labelView.listView = this;
	    this.labelViews.push(labelView);
	    return labelView;
	},
	
	removeFilter: function(labelModel) {
        this.collection.remove(labelModel);
        this.filterView.removeFilter(labelModel.get('name'), labelModel.get('value'));
        
    }
    
});


var FilterLabelView = Backbone.View.extend({
    
    tagName: 'span',
    className: 'label label-default',
    
    events: {
        'click .fa-times' : 'removeFilter'
    },

    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'destroy', this.destroy);
        this.listenTo(this.model, 'shake', this.shake);
    },
    
    render: function() { 
		var name = this.model.get('name');
		var label = this.model.get('label');
		var value = this.model.get('value');
		var remove = true;
		if (Settings.pairedFields.hasOwnProperty(name) || name == 'filter-type') {
			value = $('[name='+ name +']:checked').closest('label').text().trim();
			remove = false;
		}

        this.$el.append(ich.filterLabel({label: label, value: value, remove:remove}).html());
		return this;
    },
	
	shake: function() {
        this.$el.shake(1,2,200);		
	},
    
    removeFilter: function() {
        this.listView.removeFilter(this.model);
    },
    
    destroy: function() {
		this.remove();
        this.unbind();
    }
});

var SitesListView = Backbone.View.extend({

    el: '#sites',
	
	events: {
		'click .all-start-toggle' : 'toggleShowAllStartYears',
		'click #list-copied-alert .close': 'hideListCopiedAlert',
		'click #sites-table th.sortable' : 'sortList',
        //megha testing downloads
        'click .download-all-btn': 'downloadSites',
        'click .download-site': 'addToDownloadSites',
        'click .site-download-btn': 'downloadSites',
        'click .remove-download-site': 'removeFromDownloadSites',
        'click .download-option': 'toggleButtons'
	},
    
    initialize: function () {
        this.$list = this.$el.find('table#sites-table');
        //this.listenTo(Results, 'add', this.addOne);
        this.listenTo(this.collection, 'reset', this.render);
        this.listenTo(this.collection, 'showLoading', this.showLoading);
        //add extra listener to control loading spinner - megha
        this.listenTo(this.collection, 'hideLoading', this.hideLoading);
		this.listenToOnce(this.collection, 'reset', this.setUpCopyToClipboard)
		this.allYearsShown = -1;
        this.siteListItems = [];
        this.downloadSiteList = {};
    },
    
	render: function(collection) {
        var models = collection ? collection.models : Results.models;
        var self = this;
        
		this.hideListCopiedAlert();
		
		// Remove all SiteListItems & Reset Header
		this.reset();
        
		// Load table into copy as text variable
		this.refreshDataAsText();

		//this.siteViews = [];
        _.each(models, function(site) {
            var siteView = self.createSite(site);
            siteView.render();
            //self.siteListItems.push(siteView);
        });
        
        if (this.siteListItems.length > 0 ) {
            var siteListItemsEls = []
			_.each(self.siteListItems, function extractElForEfficientDOMManipulation(siteListItemView){
				siteListItemsEls.push(siteListItemView.el);
			});
			this.$list.find('td').closest('tr').remove();
			this.$list.append(siteListItemsEls);
        } else {
            this.$list.find('td').closest('tr').remove();
			this.$list.append(ich.noSitesRow());
        }
		
		// Make sure years shown is correct
		if (this.allYearsShown > 0) {
			// Reset Show All/Show Start Years Toggle
			this.resetShowAllStartYears();
			this.toggleShowAllStartYears();
		}
		
        this.updateTotal(this.siteListItems.length);
        
		this.hideLoading();
		
        return this;
	},
	
	reset: function() {
		_.each(this.siteListItems, function destroyListItemView(siteListItemView) {
			siteListItemView.destroy();
		});
		
        this.siteListItems = [];
	},
	
	updateTotal: function(totalSites) {
	    var sites = totalSites == 1 ? 'site' : 'sites';
	    var totalSitesHTML = ich.totalSitesHTML({numberSites: totalSites, sites: sites}).html();
	    this.$el.find('#total-sites').html(totalSitesHTML)
	},
	
	showLoading: function() {
		this.$el.find('#sites-loading').show();
	},
	
	hideLoading: function() {
		this.$el.find('#sites-loading').hide();		
	},
	
	createSite: function(siteModel) {
	    var siteView = new SiteListItemView({model: siteModel});
	    siteView.listView = this;
	    this.siteListItems.push(siteView);
	    return siteView;
	},
    
    scrollToSite: function(siteView){

		var scrollable = this.$list.closest('#sites-table-container');
		var totalsTable = this.$el.find('#totals');
		scrollable.animate({
            scrollTop: scrollable.scrollTop() + $(siteView.el).offset().top - (totalsTable.offset().top + totalsTable.outerHeight()),
            easing: 'easeInExpo'
        }, 2000)
    },
	
	toggleShowAllStartYears: function(event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();			
		}
		this.$el.find('.start-year').toggle();
		this.$el.find('.all-years').toggle();
		this.allYearsShown = this.allYearsShown * -1;
	},
	
	resetShowAllStartYears: function() {
		this.$el.find('.start-year').show();
		this.$el.find('.all-years').hide();
		this.allYearsShown = -1;
	},
	
	refreshDataAsText: function() {
		var self = this;
		
		// disable copy button while this process happens
		this.disableCopyList();
		
		this.dataAsText = '';
		var rows = [];
		var columns = [
			{
				'title': 'Site Id',
				'key': 'SITE_ID'
			},
			{
				'title': 'Name',
				'key': 'SITE_NAME'
			},
			{
				'title': 'Principal Investigator',
				'key': 'GRP_TEAM_MEMBER'
			},
			{
				'title': 'Vegetation Abbreviation (IGBP)',
				'key': 'IGBP'
			},
			{
				'title': 'Vegetation Description (IGBP)',
				'key': 'IGBP',
				'description': true
			},
			{
				'title': 'Climate Class Abbreviation (Koeppen)',
				'key': 'CLIMATE_KOEPPEN'
			},
			{
				'title': 'Climate Class Description (Koeppen)',
				'key': 'CLIMATE_KOEPPEN',
				'description': true
			},
			{
				'title': 'Mean Average Precipitation (mm)',
				'key': 'MAP'
			},
			{
				'title': 'Mean Average Tempurature (degrees C)',
				'key': 'MAT'
			},
			{
				'title': 'Country',
				'key': 'COUNTRY'
			},
			{
				'title': 'Latitude (degrees)',
				'key': 'LOCATION_LAT'
			},
			{
				'title': 'Longitude (degrees)',
				'key': 'LOCATION_LONG'
			},
			{
				'title': 'Elevation (m)',
				'key': 'LOCATION_ELEV'
			},
			{
				'title': 'Years of Data',
				'key': 'GRP_PUBLISH_L2'
			}
		]

		_.each(this.collection.models, function addRow(site, index){
			if (index == 0) {
				// Add Header Row
				var headers = []
				_.each(columns, function addHeaderRow(column){
					headers.push(column.title);
				})
				rows.push(headers.join('\t'));
			}
			
			var data = [];
			_.each(columns, function addColumn(column){
				var value = site.decodeLookup(column.key);
				var value = value == false ? '' : value;
				if (column.key == 'GRP_TEAM_MEMBER') {
					var PI = site.getPI();
                    if(PI) {
    					value = PI.TEAM_MEMBER_NAME + ' ('+ PI.TEAM_MEMBER_EMAIL +')';					
                    }
				} else if (_.isArray(value)){
					value = value.join(', ');
				} else if (value && column.hasOwnProperty('description') && column.description === true) {
					var collection = null;
					switch(column.key) {
						case 'IGBP':
							collection = iGBPCollection;
							break;
						case 'CLIMATE_KOEPPEN':
							collection = climateKoeppenCollection;
							break;
						default:
							break;
					}
					if (collection != null) {
						value = collection.getModelFromShortName(value).get('description');						
					}
				}
				
				data.push(value);
			})
			rows.push(data.join('\t'));			
		});
		
		this.dataAsText = rows.join('\n');

		// enable copy button while this process happens
		this.enableCopyList();
		
	},
	
	disableCopyList: function() {
		$("#global-zeroclipboard-html-bridge").hide();
		this.$el.find(".copy-list").hide();
	},
	
	enableCopyList: function() {
		$("#global-zeroclipboard-html-bridge").show();		
		this.$el.find(".copy-list").show();
	},
	
	setUpCopyToClipboard: function() {
		var self = this;
		//var clip = new ZeroClipboard(this.$el.find(".copy-list")[0], { moviePath: "js/vendor/ZeroClipboard.swf", allowScriptAccess: 'always'});
		var clip = new ZeroClipboard(this.$el.find(".copy-list")[0], { moviePath: "/_CONTROLTEMPLATES/15/AmFluxData/SiteSearch/js/vendor/ZeroClipboard.swf", allowScriptAccess: 'always'});
		
		clip.on('dataRequested', function (client, args) {
			client.setText(self.dataAsText);
		});
		
		clip.on('complete',function(client, args){
			self.showListCopiedAlert();
		});
		
	},
	
	showListCopiedAlert: function() {
		var self = this;
		
		if (this.hasOwnProperty('hideListCopiedAlrertTimeout')) {
			clearTimeout(this.hideListCopiedAlrertTimeout);			
		}
		
		var alert = this.$el.find('#list-copied-alert');
		
		if (alert.is(":visible")) {
			// Pulse alert to tell you it's been done again
			alert.fadeOut().fadeIn();
		} else {
			// Just Show it.
			alert.show();
		}
		
		this.hideListCopiedAlrertTimeout = setTimeout(function(){
			self.hideListCopiedAlert();
		}, 5000);
	},

	hideListCopiedAlert: function() {
		var alert = this.$el.find('#list-copied-alert');
		alert.fadeOut();
	},
	
	sortList: function(event) {
		var tableHeader = $(event.target).closest('th');
		var variableName = tableHeader.data('variable-name');
		var desc = tableHeader.data('desc') == '' || tableHeader.data('desc') == 'false' || tableHeader.data('desc') == false ? true : false;
		tableHeader.data('desc', desc);
		this.updateSortIcons(tableHeader, desc);
		this.collection.sortBy(variableName, desc)
	},
		
	updateSortIcons: function(tableHeader, desc) {
		var tableHeaders = tableHeader.closest('tr').find('.sortable');
		var tableHeaderIcons = tableHeaders.find('i.fa-sort-up, i.fa-sort-down, i.fa-sort');
		tableHeaderIcons.removeClass('fa-sort-up').removeClass('fa-sort-down').addClass('fa-sort');
		
		var iconClass = desc ? 'fa-sort-down' : 'fa-sort-up';
		tableHeader.find('i.fa-sort').removeClass('fa-sort').addClass(iconClass)
	},

    //megha adding download routine

    downloadSites: function () {
        var siteIDs = [];
        
        for(var prop in this.downloadSiteList) {
            siteIDs.push(this.downloadSiteList[prop]);
        }
    
        $.redirect('site_data_download.php', {'files[]': siteIDs, 'download_url': this.model.url, 'file_suffix': this.model.fileSuffix });

    },
    
    addToDownloadSites: function(e) {
        var siteId = e.target.attributes['data-site-id'].value;
        this.downloadSiteList[siteId] = siteId;
        var siteIdSize = Object.keys(this.downloadSiteList).length;
        
        $('.sites-count').html(siteIdSize);
        
        if(siteIdSize > 0) {
            $('.download-sites-text').show();
        }
        else {
            $('.download-sites-text').hide();
        }    
        
    },
    
    removeFromDownloadSites: function(e) {
        var siteId = e.target.attributes['data-site-id'].value;
        delete this.downloadSiteList[siteId];
        
        var siteIdSize = Object.keys(this.downloadSiteList).length;
        
        $('.sites-count').html(siteIdSize);
        
        if(siteIdSize > 0) {
            $('.site-download-btn').show();
        }
        else {
            $('.site-download-btn').hide();
        }
        
    },
    
    toggleButtons: function(e) {
        $(e.target).toggle();
        $(e.target).siblings('.download-option').toggle();
    }
	    
});

// Contains DOM elements and logic for the list item
var SiteListItemView = Backbone.View.extend({
    
    tagName: 'tbody',
    
    events: {
        'click': 'onClick',
        'mouseover' : 'mouseover',
        'mouseout' : 'mouseout',
        'click .zoom-to-site' : 'zoomToSiteToggle',
        'click .trash-this-site' : 'trashIt'
        //'click .site-thumbnail img' : 'zoomImage',
    },
    
    initialize: function () {
        //this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'change:zoomed', this.changeZoomIcon);
        this.listenTo(this.model, 'destroy', this.destroy);
        this.listenTo(this.model, 'highlight', this.highlight);
        this.listenTo(this.model, 'unHighlight', this.unHighlight);
        this.listenTo(this.model, 'focus', this.focus);
        this.listenTo(this.model, 'change:open', this.openCloseDrawer);
        this.listenTo(this.model.collection, 'closeDrawer', this.closeDrawer);
    },

    render: function () {
        var self = this;
        var htmlVars = this.model.toJSON();
        htmlVars.index = this.model.getIndex();
		var years = this.model.decodeLookup('GRP_PUBLISH_L2');
		htmlVars['HAS_YEARS'] = (years.length > 0);
		htmlVars['FIRST_YEAR'] = years[0];
		htmlVars['PI'] = this.model.getPI();
		var climateKoeppen = this.model.decodeLookup('CLIMATE_KOEPPEN');
		if (htmlVars.hasOwnProperty('GRP_CLIM_AVG')) {
			htmlVars['GRP_CLIM_AVG']['CLIMATE_KOEPPEN_DESCRIPTION'] = climateKoeppen ? climateKoeppenCollection.getModelFromShortName(climateKoeppen).get('description') : false;
		}
		var iGBP = this.model.decodeLookup('IGBP');
		if (htmlVars.hasOwnProperty('GRP_IGBP')) {
			htmlVars['GRP_IGBP']['IGBP_DESCRIPTION'] = iGBP ? iGBPCollection.getModelFromShortName(iGBP).get('description') : false;			
		}
		
		// Render 0 as "0" (mustache js treats 0 as false and displays nothing)
		if (htmlVars.hasOwnProperty('GRP_LOCATION')) {
			if (htmlVars.GRP_LOCATION.hasOwnProperty('LOCATION_ELEV') && htmlVars.GRP_LOCATION.LOCATION_ELEV == 0) {
				htmlVars.GRP_LOCATION.LOCATION_ELEV = "0";
			}
		}

		if (htmlVars.hasOwnProperty('GRP_CLIM_AVG')) {
			if (htmlVars.GRP_CLIM_AVG.hasOwnProperty('MAP') && htmlVars.GRP_CLIM_AVG.MAP == 0) {
				htmlVars.GRP_CLIM_AVG.MAP = "0";
			}
			if (htmlVars.GRP_CLIM_AVG.hasOwnProperty('MAT') && htmlVars.GRP_CLIM_AVG.MAT == 0) {
				htmlVars.GRP_CLIM_AVG.MAT = "0";
			}
		}
		
        this.$el.html(ich.siteTableRow(htmlVars));
        
        //
        // Set up Tool Tips
        //
        $(this.el).find('[data-toggle=tooltip]').tooltip({trigger: 'hover', placement: 'bottom'});

        var options = {
            html: true,
            content: this.$el.find('.site-thumbnail').html(),
            trigger: 'hover',
            placement: 'left',
            container: 'body'
        };
       this.$el.find('.site-thumbnail img').popover(options);
                        
        return this;
    },
	
    hide: function() {
        $(this.el).addClass('hidden');
    },

    show: function() {
        $(this.el).removeClass('hidden');
    },
	
	toggleDrawer: function() {
		this.model.collection.trigger('closeDrawer');
        this.model.set({'open':!this.model.get('open')});  
	},
	
	openCloseDrawer: function() {
		if (this.model.get('open') === true) {
			this.openDrawer();			
		} else {
			this.closeDrawer();			
		}
	},
	
	closeDrawer: function() {
		this.$el.find('.drawer').hide();		
		this.$el.find('.site-more-info-icon').removeClass('fa-caret-down').addClass('fa-caret-right');			
	},
	
	openDrawer: function() {
		this.$el.find('.drawer').show();
		this.$el.find('.site-more-info-icon').removeClass('fa-caret-right').addClass('fa-caret-down');			
	},
    
    highlight: function() {
        $(this.el).addClass('highlight');
        $(this.el).closest('.media-table').addClass('lowlight');
    },
    
    unHighlight: function() {
        $(this.el).removeClass('highlight');        
        $(this.el).closest('.media-table').removeClass('lowlight');
    },

    focus: function() {
        this.listView.scrollToSite(this);
    },
    
    //click: function() {
    //    this.model.trigger('list:click');
   // },
    
    mouseover: function() {
        this.model.trigger('highlight');
        this.highlight();
    },

    mouseout: function() {
        this.model.trigger('unHighlight');
        this.unHighlight();
    },
    
    onClick: function(event) {
		//this.zoomToSiteToggle(event);
		this.toggleDrawer();
    },
	
    zoomToSiteToggle: function(event) {                
		event.stopPropagation();
        this.model.set({'zoomed':!this.model.get('zoomed')});  
    },
    
    changeZoomIcon: function() {
        // render the appropriate zoom icon
        var icon = this.$el.find('.zoom-to-site');
        if (this.model.get('zoomed')) {
            icon.removeClass('fa-search-plus');
            icon.addClass('fa-search-minus');
        } else {
            icon.removeClass('fa-search-minus');
            icon.addClass('fa-search-plus');
        }
    },
    
    zoomImage: function(event) {
        var target = event.target;
        var options = {
            content: $(target).clone(),
            trigger: 'mouseover'
        };
        $(event.target).popover(options);
        $(event.target).popover('show');    
    },
    
    trashIt: function(event) {
		if (event) {
			event.stopPropagation();			
		}
        this.model.collection.remove(this.model);
    },
    
    destroy: function() {
        this.remove();
        this.unbind();
    }
    
});

var SiteMapItemView = Backbone.View.extend({

    initialize: function () {
        //this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'destroy', this.remove);
        this.listenTo(this.model, 'highlight', this.highlight);
        this.listenTo(this.model, 'unHighlight', this.unHighlight);
        //this.listenTo(this.model, 'list:click', this.showInfoBox);
        this.listenTo(this.model, 'change:zoomed', this.zoomToSiteToggle);
        
        //_.bindAll(this);
    },

    render: function () {
        var self = this;
		
        this.location = new Microsoft.Maps.Location(Decode.getValueFromSiteModel(this.model, 'LOCATION_LAT'), Decode.getValueFromSiteModel(this.model, 'LOCATION_LONG'));
        
        this.pin = new Microsoft.Maps.Pushpin(this.location, {
            typeName: 'map-pin',
            htmlContent: ich.pushPin({'site_id':this.model.decodeLookup('SITE_ID')}).html(),
            icon: '/static/img/map-icon.png', // Don't know why we need to set something here, but if you don't it'll use the default icon (not no icon)
            width: 50,
            height: 28 // Set to 1px shorter than intended to account for padding
        });

        this.infobox = new Microsoft.Maps.Infobox(this.location, {
            title: this.model.decodeLookup('SITE_ID'), 
            description: this.model.decodeLookup('SITE_NAME'), 
            pushpin: this.pin,
            showCloseButton: true
        });

        // Add Event Handlers to the Pin
        Microsoft.Maps.Events.addHandler(this.pin, 'mouseover', function() {
            self.model.trigger('highlight');
        }); 

        Microsoft.Maps.Events.addHandler(this.pin, 'mouseout', function() {
            self.model.trigger('unHighlight');
        });
        

        Microsoft.Maps.Events.addHandler(this.pin, 'click', function() {
            self.model.trigger('focus');
        }); 
        
        return this;
    },
    
    hide: function() {
        this.pin.setOptions({visible: false});
    },

    show: function() {
        this.pin.setOptions({visible: true});
    },
    
    highlight: function() {
        this.pin.setOptions({typeName: 'map-pin-on'});
    },
    
    unHighlight: function() {
        this.pin.setOptions({typeName: 'map-pin'});
    },
    
    zoomToSiteToggle: function() {
        if (this.model.get('zoomed')) {
            this.SiteMapView.zoomToLocation(this);
        } else {
            this.SiteMapView.centerMapOnPins();
        }
    },
    
    setZoomed: function(options) {
        this.model.set({'zoomed':options.value, silent: options.silent});
    },
    
    showInfoBox: function() {
        //this.infobox.setOptions({visible:true, typeName: Microsoft.Maps.InfoboxType.standard, showPointer: true});
    }
        
});

var SiteMapView = Backbone.View.extend({

    el: '#map',
    
    events: {
        //'click' : 'clearSites',
        //megha testing new events

        'click #map-attr': 'showMapAttributes',
        'click #set-map-attr': 'setMapAttributes'
    },

    initialize: function () {
        var self = this;
        this.sites = [];
        this.locations = [];
        this.locationLookup = {};
        this.centerMap = true;
        Microsoft.Maps.loadModule('Microsoft.Maps.Themes.BingTheme', { callback: function() {self.render();} });
    },
    
    render: function() {
        this.listenTo(this.collection, 'reset', this.renderSites);

        var self = this;

		this.setHeightOfContainer();
		
        this.mapOptions = {
            credentials: "AghHpzU7wYkeKsnYG4xkJ07cp1SvpZI36eh3ZGQRSOnAcUUgsCxfskqytlhjUF04",
            mapTypeId: Microsoft.Maps.MapTypeId.aerial,
            theme: new Microsoft.Maps.Themes.BingTheme(),
            showBreadcrumb: false
        }
        
        this.mapObject = new Microsoft.Maps.Map($(this.el)[0], this.mapOptions);


        //centers map on the Americas - megha
        
        this.setMapView();

        this.alignMapControls();
		
		Microsoft.Maps.Events.addHandler(this.mapObject, 'mousewheel', function(e) {
		    e.handled = true;
		    return true;
		});
		        this.renderSites();
        
        return this;
    },
    
	setHeightOfContainer: function() {
		var height = $(window).height() - this.$el.offset().top -20; // Height of viewport minus top offset of container
		if (height < 800) {
			height = 800;
		}
		this.$el.css({'height': height + 'px'});
	},

    //megha adding new functions

    alignMapControls: function() {
        $('#map .MicrosoftNav .NavBar_zoomControlContainer').css('right', '250px');
        $('#map .MicrosoftNav .NavBar_compassControlContainer').css('right', '0px');
    },

    setMapView: function() {

        var height = $(window).height() - this.$el.offset().top - 20,
        width = $(window).width(),
        zoom = 3;

        if(height < 900 || width < 1400) {
            zoom = 2;    
        }

        this.viewOptions = {
            zoom: zoom,
            center: {latitude: 18.5794462098367, longitude: -86.38311875}
        };

        this.mapObject.setView(this.viewOptions);

    },

    //megha extra functions end
	
    updateResults: function(vars) {
        var params = this.collection.createParamsFromSerializedArray(vars);
        var list = this.collection.filterBy(params);
        this.renderSites(list);
    },
    
    renderSite: function(site) {
        var self = this;
        
        var entityCollection = new Microsoft.Maps.EntityCollection();
        var siteView = self.createSite(site);
        siteView.render();
        
        entityCollection.push(siteView.pin);
        //entityCollection.push(siteView.infobox);

        // Add locations to the list for use later
        self.locations.push(siteView.location);
        self.locationLookup[site.decodeLookup('SITE_ID')] = index;

        // Add the Object to the map
        this.mapObject.entities.push(entityCollection);

        //megha testing better zooming behavior
        //this.centerMapOnPins();        
        
    },
    
    renderSites: function() {
        var self = this;
        this.clearSites();
        this.siteViews = [];
        this.locations = [];

        var entityCollection = new Microsoft.Maps.EntityCollection();

        _.each(this.collection.models, function(site, index){
            var siteView = self.createSite(site);
            siteView.render();
            
            entityCollection.push(siteView.pin);
            //entityCollection.push(siteView.infobox);

            // Add locations to the list for use later
            self.locations.push(siteView.location);
            self.locationLookup[site.decodeLookup('SITE_ID')] = index;
        });
        
        if (entityCollection.getLength() > 0) {
            // Add the Objects to the map
            this.mapObject.entities.push(entityCollection);
            //megha testing better zooming behavior
            //dont need to center on pins as we will be specifying the viewport of the map pretty tightly - megha
            /*if(this.centerMap === true) {
                //after the initial map render, do not zoom the map in or out - megha
                this.centerMapOnPins();
                this.centerMap = false;
            }*/
        }      
    },
    
    createSite: function(siteModel) {
	    var siteView = new SiteMapItemView({model: siteModel});
	    siteView.SiteMapView = this;
	    this.siteViews.push(siteView);
	    return siteView;
    },
    
    centerMapOnPins: function() {
        // Center the map on the sites
        var locationRectangle = new Microsoft.Maps.LocationRect.fromLocations(this.locations);
        this.mapObject.setView({ bounds: locationRectangle});        
        
        //
        // Add padding to each side of the map so as not to cover the sites with the map filter and site list
        // Pixel to degrees conversion according to Microsoft
        // http://msdn.microsoft.com/en-us/library/bb259689.aspx
        //

        var zoomLevel = this.mapObject.getTargetZoom();
        var paddingPixels = 80 * 2;
        var earthCircumfrence = 6378137; // in meters
        var centerLatitude = locationRectangle.center.latitude;
        var mapWidth = $(this.el).width();

        // ground resolution = cos(latitude * pi/180) * earth circumference / map width (METERS PER PIXEL)
        //var testGroundResolution = Math.cos(centerLatitude * (Math.PI/180)) * (earthCircumfrence / mapWidth); // Meters/Pixel
        var groundResolution = this.mapObject.getTargetMetersPerPixel();
        //console.log(groundResolution);
        //console.log(testGroundResolution);
        
        var degreesPerPixel = (360 * (groundResolution/earthCircumfrence));
        var paddingDegrees = paddingPixels * degreesPerPixel;
        
        // Add the padding
        locationRectangle.width += paddingDegrees;
        
        // Reset the map
        this.mapObject.setView({ bounds: locationRectangle});        
        
    },
    
    clearSites: function() {
        this.mapObject.entities.clear();
    },
    
    clearSite: function(site) {
        this.mapObject.entities.remove(site.get('pin'));
        this.mapObject.entities.remove(site.get('infobox'));
    },
    
    zoomToLocation: function(siteView) {
        if (this.previouslyZoomed && this.previouslyZoomed.model.decodeLookup('SITE_ID') != siteView.model.decodeLookup('SITE_ID')) {
            this.previouslyZoomed.setZoomed({value: false, silent: true});
        }
        this.previouslyZoomed = siteView;
        this.mapObject.setView({ zoom: 10, center: siteView.location});
    },

    //megha testing map positioning

    showMapAttributes: function(){
        var self = this;
        //console.log(this.mapObject.getZoom());
        //console.log(this.mapObject.getHeight());
        console.log(this.mapObject.getCenter());
    },

    setMapAttributes: function(){
        var self = this;
        
    }    
});

var SiteSearch = Backbone.View.extend({
	
	el: '#map',
	
    initialize: function () {
        this.render();   
    },
    
    render: function () {
        var self = this;
                
        var router = new Router();
        Backbone.history.start();

        //
        // Set up Tool Tips
        //
        $(this.el).find('[data-toggle=tooltip]').tooltip({trigger: 'hover', placement: 'bottom'});

        return this;
    }
			    
});

var SelectView = Backbone.View.extend({

    initialize: function (options) {
		this.template = options.template;
        this.listenToOnce(this.collection, 'sync', this.render);
    },
    
    render: function () {
        var self = this;  
		this.$el.html(this.template({'options': this.collection.toJSON()}));
        return this;
    }
			    
});


////////////
// Router //
////////////

var Router = Backbone.Router.extend({

    routes: {
        ":query": "search",
        "": "search"
    },

    search: function(query) {
		climateKoeppenCollection = new ClimateKoeppenCollection();
		climateKoeppenCollection.fetch();
        var climateKoeppenSelectView = new SelectView({collection: climateKoeppenCollection, el: '#climate_koeppen-select', template: ich.climateClassSelect});

		iGBPCollection = new IGBPCollection();
		iGBPCollection.fetch();
        var IGBPSelectView = new SelectView({collection: iGBPCollection, el: '#igbp-select', template: ich.igbpSelect});

        var results = new ResultsCollection();
        
        var downloadModel = new DownloadModel();
		
		Decode = new DecodeModel();				
		Decode.fetch({
			error: function(model, response, options){
				console.log(response);
			},
			success: function(model, response, options){

				results.fetch({
					data: JSON.stringify({}), //include no params to get all flux sites
					type: 'POST',
					contentType: "application/json; charset=utf-8",
					dataType: 'json',
					error: function(collection, response, options){
						console.log(collection);
					}
				});				
			}
		});
				
        var filterView = new FilterView({collection: results, query: query, router: this});
        var sitesListView = new SitesListView({collection: results, model: downloadModel});
        var siteMapView = new SiteMapView({collection: results});
    }

});

var App = new SiteSearch();

    
});
