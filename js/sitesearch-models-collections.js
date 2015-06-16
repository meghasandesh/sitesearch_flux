////////////
// Models //
////////////

var FilterModel = Backbone.Model.extend({
});    

var MapModel = Backbone.Model.extend({
});    

var ResultsModel = Backbone.Model.extend({
});

var DownloadModel = Backbone.Model.extend({ 
    initialize: function() {
        this.url = 'http://cdiac.ornl.gov/ftp/ameriflux/data/Level2/AllSites/biological_data/';
        this.fileSuffix = "_CADM_LATEST.xls";
    }
});

var SiteModel = Backbone.Model.extend({   
    initialize: function() {
         // DEMO ONLY: Choose a random image to show with this site
        this.set({'imageNum' : Math.floor(Math.random() * (5 - 0))});
        
        this.bind("remove", function() {
          this.destroy();
        });
    },
    
    getIndex: function() { 
        return this.collection.indexOf(this) + 1;
    },
	
	decodeLookup: function(key) {
		return Decode.getValueFromSiteModel(this,key);
	},
	
	getPI: function() {
		var teamMembers = this.decodeLookup('GRP_TEAM_MEMBER')
		var PI = undefined;
		_.each(teamMembers, function(teamMember){
			if (teamMember.TEAM_MEMBER_ROLE == "PI") {
				PI = teamMember
			}
		})
		return PI;
	}
});

var FilterLabelModel = Backbone.Model.extend({   
    
    initialize: function() {        
        this.bind("remove", function() {
          this.destroy();
        });
    }
});

var DecodeModel = Backbone.Model.extend({
	url: 'http://wile.lbl.gov:8080/AmeriFlux/SiteSearch.svc/SiteSearchDisplayDecode/',
	parse: function(response){

		// Make this a lookup table
		var collection = {
			'groups': {},
			'parameters': {}
		};
		_.each(response, function(variableData){
			
			if (variableData.hasOwnProperty('groupString')) {
				variableData['groups'] = _.compact(variableData['groupString'].split('*'));
			}
			
			if (variableData.hasOwnProperty('paramString')) {
				variableData['siblings'] = _.compact(variableData['paramString'].split('*'));
			}
			
			collection.parameters[variableData.rowtext] = variableData;
			
			if (variableData.groupString) {
				var groups = variableData.groupString.split('*');
				_.each(groups, function(group){
					if (group){
						if (!collection.groups[group]) {
							collection.groups[group] = []
						}
						collection.groups[group].push(variableData.rowtext)						
					}
				
				});				
			}
		});
		return collection;
	},
	
	getValueFromSiteModel: function(siteModel, variableName) {
		// Will return a value or list of values
		
		var parameters = this.get('parameters');
		var value = siteModel.get(variableName);
		
		var returnValueOrFalse = function(theValue) {
			if (theValue != undefined && theValue != null && !_.isNaN(theValue)) {
				return theValue;
			} else {
				return false;
			}
		};
		
		if (value) {
			// just look for it at the top level
			return returnValueOrFalse(value);
		} else if (parameters.hasOwnProperty(variableName)) {
			var variableParameters = parameters[variableName];
			if (variableParameters.hasOwnProperty('groups')) {
				var groupName = variableParameters['groups'][0];
				var group = siteModel.get(groupName);
				if (group) {
					if (_.isArray(group)) {
						var list = [];
						_.each(group, function(item){
							list.push(item[variableName]);
						});
						return returnValueOrFalse(list);
					} else {
						return returnValueOrFalse(group[variableName]);											
					}
				} else {
					//console.log('didnt find the group :' + groupName)
					return false;
				}
			} else {
				return returnValueOrFalse(siteModel.get(variableName));				
			}
		
		} else {
			//console.log(variableName + ' not found');
			return false;
		}
	}
});

/////////////////
// Collections //
/////////////////
var CVCollection = Backbone.Collection.extend({
	getModelFromShortName: function(shortname) {
		return _.filter(this.models, function(model){
			return model.get('shortname').toLowerCase() == shortname.toLowerCase();
		})[0];		
	}
	
});

var IGBPCollection = CVCollection.extend({
	url: 'http://wile.lbl.gov:8080/AmeriFlux/SiteSearch.svc/SiteSearchDisplayCV/IGBP/',
});

var ClimateKoeppenCollection = CVCollection.extend({
	url: 'http://wile.lbl.gov:8080/AmeriFlux/SiteSearch.svc/SiteSearchDisplayCV/CLIMATE_KOEPPEN/',
});

var ResultsCollection = Backbone.Collection.extend({
    model: SiteModel,
	
	url: 'http://wile.lbl.gov:8080/AmeriFlux/SiteSearch.svc/SiteSearchDisplay',
	
    initialize: function () {
      var self = this;
      this.ignoreFields = ['year-span'];
      
      this.on('remove', function() {
          self.reset(self.models);
      });
    },
    
	parse: function(response) {
		var self = this;
		var parameters = Decode.get('parameters');
		var groups = Decode.get('groups');
		
		var makeReal = function(key, value) {
			var keyParameters = parameters[key];
			if (keyParameters) {
				var dataType = keyParameters.dataType;
				switch (dataType) {
					case 'REAL':
						value = parseFloat(value);
						break;
					case 'DATE':
						if (keyParameters.units == 'YYYYMMDD'){
							value = Date(parseInt(value.substr(0,3)), parseInt(value.substr(4,5), parseInt(value.subst(6,7))));
						}
						break;
					default:
						break;
				}
			}
			return value;
		};
			
		//not exactly mandatory for the all the flux sites, but keeping the name until a better one can be found - megha 6/10/15		
		var mandatoryFields = {
			'SITE_ID': [],
			'SITE_NAME': [],
			'STATE': [],
			'COUNTRY': [],
			'URL_AMERIFLUX': [],
			//'GRP_LOCATION' : ['LOCATION_LAT', 'LOCATION_LONG'],
		};
		
		var badResultIndicies = [];
		
		for(i = 0; i < response.length; i++) {
			
			var processResults = function (result, index){
			
				var hasMandatoryFields = true;
				// Ensure mandatory fields
				_.each(mandatoryFields, function ensureMandatoryFields(variables, groupName){
					if (hasMandatoryFields) {
						result.URL = 'http://fluxdata.org:8080/SitePages/siteInfo.aspx?' + result.SITE_ID ;
						
						// Check for group
						if (!result.hasOwnProperty(groupName)) {
							hasMandatoryFields = false;
						} else {
							// Check for variables in group
							_.each(variables, function checkForVariablesInGroup(variable){
								if (hasMandatoryFields && !result[groupName].hasOwnProperty(variable)) {
									hasMandatoryFields = false;
								}
							});
						}
					}
				});

				if (!hasMandatoryFields) {
					// If it doesn't have all the mandatory fields, remove it from the results set
					//console.log('bad result ' + index);
					response.splice(index, 1);	
				} else {
					_.each(result, function fixUpResults(variableGroup, key){

						// Make Real Numbers
						var group = groups[key];
						if (group){
							_.each(group, function(variableName){
								
								if (_.isArray(variableGroup)) {
									// Handle lists of results
									_.each(variableGroup, function(item){
										item[variableName] = makeReal(variableName, item[variableName]);																			
									});
								} else {
									variableGroup[variableName] = makeReal(variableName, variableGroup[variableName]);									
								}
							});
						} else {
							variableGroup = makeReal(key, variableGroup);
						}

						// Order years asc.
						if (key == 'GRP_PUBLISH_L2') {
							variableGroup.sort();
						}
					});
					
							
				}

			}
			
			processResults(response[i], i);
		}
		
		
		// Save the final response for reseting later
		this.originalResponse = response;
	    return response;
	},
	      // DEMO ONLY: override the .fetch function to get sites from hard coded JSON Sites
    /*fetch: function() {
        var sites = this.getSites();
        this.reset(sites);     
    },
    
    getSites: function() {
        var sitesList = [];
        _.each(Sites, function(site, index){
            sitesList.push(new SiteModel(site));
        });
        
        return sitesList;
    },*/
	
	resetModelsToOriginalResponse: function() {
		this.reset(this.originalResponse, {silent: true});
	},
    
    createParamsFromSerializedArray: function(options){
        var self = this;
        var params = {};
		
		var findValue = function(vars, name) {
			var value = '';
			_.each(vars, function(theVar) {
				if (theVar.name == name) {
					value = theVar.value
				}
			});
			return value;
		}
		
        // Format the variables for filtering the collection
        _.each(options.vars, function(object, index){
            var addField = true;
			
			// Do not add fields whose pairs are not present
			if (Settings.pairedFields.hasOwnProperty(object.name)) {
            	var valueOfPair = findValue(options.vars, Settings.pairedFields[object.name]);
				if (valueOfPair == '' || valueOfPair == false) {
					addField = false;
				}
            }
			
			if (addField == true) {
				if (
	                object.value != "" && 
	                _.indexOf(self.ignoreFields, object.name) == -1 
	                && (
	                    (!_.isUndefined(options.ignore) && _.indexOf(options.ignore, object.name) == -1) || 
	                    _.isUndefined(options.ignore)
	                    )
	                ) {
	                if (!_.isUndefined(params[object.name])) {
	                    if (!_.isArray(params[object.name])) {
	                        params[object.name] = [params[object.name]];
	                    }
	                    params[object.name].push(object.value);
	                } else {
	                    params[object.name] = object.value;
	                }
	            }				
			}
			
        });
		
        return params;      
    },

    // options = {'params': [OBJECT], 'returnNumResultsOnly': BOOLEAN}
    filterBy: function(options) {
        
		// Reset the models if necessary
		if (this.models.length != this.originalResponse.length) {
			this.resetModelsToOriginalResponse();			
		}
		
        var sites = this.models;
		        
        if (!_.isUndefined(options['params']) && !_.isEmpty(options.params)) {
            var results = sites;
			var finalResults = [];
			var filterType = options['params']['filter-type'];
			var onlyFilterType = function() {
				if (_.size(options['params']) == 1) {
					if(options['params'].hasOwnProperty('filter-type')) {
						return true						
					} else {
						return false
					}
				} else {
					return false
				}
			}
			_.each(options.params, function(val, key){

                if (key != 'filter-type' && key != 'keyword-fields' && key != 'data-from') {

					if (filterType == 'any') {
						results = sites;
					}

					if (typeof val !== 'object') {
	                     val = [ val ];
	                }
					
	                
					results = _.filter(results, function(model) {
					
						if (val.length == 1) {
                        
	                        // Format search string
	                        val[0] = $.trim(val[0]);
							var keywords = $.map(val[0].split(','), $.trim);
							var searchString = '(' + keywords.join('|') + ')';
	                        searchString = new RegExp(searchString,'gi');
                        
	                        // Handle keyword searches
							if (key == 'keyword' || key == 'keyword-fields') {
								var keywordFields = options.params.hasOwnProperty('keyword-fields') ? options.params['keyword-fields'] : 'SITE_NAME,SITE_DESC,SITE_ID';
								keywordFields = keywordFields.split(',');
								
								var haystack = [];
								_.each(keywordFields, function decodeLookupKeywordFields(keywordField){
									haystack.push(model.decodeLookup(keywordField));
								});
								
								haystack = haystack.join('*');

								if (haystack.toLowerCase().search(searchString) >= 0) {
	                                return true;
	                            } else {
	                                return false;
	                            }
								                        
	                        // Handle people searches
	                        } else if (key == 'people') {
	                            var people = [];
								_.each(model.decodeLookup('TEAM_MEMBER_NAME'), function combinePeople(person){
									people.push(person);								
								});
								people = people.join(', ');
							
	                            return people.search(searchString) >= 0;                            
                        
	                        // Handle site status search
	                        } else if (key == 'active') {
	                            var trueFalse = val[0] == 'Active' ? true : false;
	                            return model.decodeLookup(key) === trueFalse;

	                        // Handle number range searches (precipitation, air temp, or elevation)
	                        } else if (key == 'precipitation' || key == 'ta' || key == 'elevation') {

								var precip = Decode.getValueFromSiteModel(model, 'MAP');
	                            if (key == 'ta') {
									var precip = Decode.getValueFromSiteModel(model, 'MAT');
	                            } else if (key == 'elevation') {
									var precip = Decode.getValueFromSiteModel(model, 'LOCATION_ELEV');                            	
	                            }
							
								if (precip) {
		                            // interperet input value
		                            var regEx = /^([\-\+]?[0-9]+)* ?([to\-<>]+) ?([\-\+]?[0-9]+)$/;
		                            var matches = regEx.exec(val[0]);

		                            if (matches && matches.length > 0) {
                                
										if (matches[2] == '<' || matches[2] == '>') {
		                                    // Deal with greater than or less than
		                                    var value = Number(matches[3]);                                
		                                    if (matches[2] == '<') {
		                                        return precip < value;
		                                    } else {
		                                        return precip > value;
		                                    }
		                                } else {
		                                    // Deal with a range
		                                    var min = Number(matches[1]);
		                                    var max = Number(matches[3]);                                
		                                    return precip >= min && precip <= max;
		                                }
		                            } else {
		                                // if the value is not valid for some reason just return true for everybody
		                                return true;
		                            }
  								
								}
                      
	                        // Handle geographic region search
	                        } else if (key == 'region') {
								var regionKeyword = val[0];

								var country = CountryNames.hasOwnProperty(regionKeyword) ? CountryNames[regionKeyword] : false;
								var state = StateNames.hasOwnProperty(regionKeyword) ? StateNames[regionKeyword] : false;
								var modelCountryDescription = model.decodeLookup('COUNTRY');
								var modelCountryShortName = CountryNames.hasOwnProperty(modelCountryDescription) ? CountryNames[modelCountryDescription].shortname : false;
								var modelStateShortName = model.decodeLookup('STATE');
								var modelStateDescription = StateNames.hasOwnProperty(modelStateShortName) ? StateNames[modelStateShortName].description : false;

								if (country || state) {
									var returnValue = false;
									if (country) {
										if (modelCountryDescription == country.description) {
											returnValue = true;
										}
									}
							
									if (state) {
										if (modelStateShortName == state.shortname) {
											returnValue = true;
										}
									}
									return returnValue;

								} else {
									// Do a dumb keyword search
		                            var regions = [
										modelCountryDescription, 
										modelCountryShortName,
										modelStateShortName,
										modelStateDescription									
									];
									regions = regions.join(', ');
		                            return regions.search(searchString) >= 0;                            
								}
                        
	                        // Handle Site ID exclusion
	                        } else if (key == 'site_id') {
                            
	                            return _.indexOf(val[0].split(', '), model.decodeLookup(key.toUpperCase())) == -1;                            
							// Handle Year Search
							} else if (key == 'data-from-years') {
								var years = model.decodeLookup('GRP_PUBLISH_L2');
								if (years && years.length > 0) {
		                            // interperet input value
									var regEx = /^([0-9]+)* ?([to\-]*) ?([0-9]+)$/;
		                            var matches = regEx.exec(val[0]);

		                            if (matches && matches.length > 0) {
										if (matches[2] == 'to' || matches[2] == '-') {
		                                    // Deal with a range
		                                    var min = Number(matches[1]);
		                                    var max = Number(matches[3]);
											var allYears = [];
											for (var i = min; i <= max; i++) {
											    allYears.push(i);
											}
											var anyAll = options.params.hasOwnProperty('data-from') ? options.params['data-from'] : 'all';
											switch (anyAll) {
												case 'all':
													return _.difference(allYears, years).length == 0
													break;
												case 'any':
													return _.intersection(allYears, years).length > 0
													break;
												default:
													return _.difference(allYears, years).length == 0
													break;
											}     
		                                } else {
		                                    // Deal with one year
		                                    var value = Number(matches[0]);                                
		                                    return _.indexOf(years, value) >= 0;
		                                }
		                            } else {
		                                // if the value is not valid for some reason just return true for everybody
		                                return true;
		                            }
  								}								
	                        } else {
	                            // Otherwise handle the rest
	                            return _.indexOf(val, model.decodeLookup(key.toUpperCase())) !== -1;                            
	                        }
                    
	                    } else {
                        	var modelValue = model.decodeLookup(key.toUpperCase());
							if (!_.isArray(modelValue)) {
								modelValue = [modelValue];
							}
							if (filterType == 'all') {
	                        	return _.difference(val, modelValue).length === 0;
							} else {
								return _.intersection(val, modelValue).length > 0;
							}
	                    }
	                }, this);
					
					if (filterType == 'any') {
						finalResults = _.union(finalResults, results);
					}
				}
	        }, this);
			
			if (filterType == 'all' || onlyFilterType() === true) {
				finalResults = results;
			}
			
            if (options.returnNumResultsOnly) {
                return finalResults.length;
            } else {
                if (finalResults.length > 0 ) {
                    this.reset(finalResults);
                } else {
                    this.reset();
                }
            }


        } else {
            if (options.returnNumResultsOnly) {
                return sites.length;
            } else {
				this.reset(sites);
            }
        }
		
		// Put everything back in order
		if (this.hasOwnProperty('sortSettings')) {
			this.sortBy(this.sortSettings[0], this.sortSettings[1]);			
		}
    },
	
	sortBy: function(variableName, desc) {
        var results = this.models;
		this.sortSettings = [variableName, desc];
		
		if (variableName == 'START_YEAR') {
			// Deal with Start Year Search
            results.sort(function (siteModelA, siteModelB) {
				var variableA = siteModelA.decodeLookup('GRP_PUBLISH_L2');
				var variableB = siteModelB.decodeLookup('GRP_PUBLISH_L2');
                variableA = !_.isArray(variableA) ? -100000 : variableA[0];
                variableB = !_.isArray(variableB) ? -100000 : variableB[0];
				if (!desc) {
                    return Number(variableA) - Number(variableB);
                } else {
                    return Number(variableB) - Number(variableA);
                }
            });
			
		} else {
			var alpha = Decode.get('parameters')[variableName]['dataType'] == 'TEXT';
		
	        if (!alpha) {
				// Sort numbers asc
	            results.sort(function (siteModelA, siteModelB) {
					var variableA = siteModelA.decodeLookup(variableName);
					var variableB = siteModelB.decodeLookup(variableName);
					if (variableA === false || variableB === false) {
						variableA = variableA === false ? -100000 : variableA;
	                    variableB = variableB === false ? -100000 : variableB;
	                }
	                if (!desc) {
	                    return Number(variableA) - Number(variableB);
	                } else {
	                    return Number(variableB) - Number(variableA);
	                }
	            });
	        } else {
	            // Sort strings asc
	            results.sort(function (siteModelA, siteModelB) {
					var variableA = siteModelA.decodeLookup(variableName);
					var variableB = siteModelB.decodeLookup(variableName);
					variableA = variableA == false ? '' : variableA.toUpperCase();
					variableB = variableB == false ? '' : variableB.toUpperCase();
	                if (!desc) {
	                    return (variableA < variableB) ? -1 : (variableA > variableB) ? 1 : 0;
	                } else {
	                    return (variableB < variableA) ? -1 : (variableB > variableA) ? 1 : 0;
	                }
	            });
	        }
		
		}
		// reset the collection
        this.reset(results);		
	}
  
});

var FilterLabelsCollection = Backbone.Collection.extend({
    model: FilterLabelModel,

    initialize: function () {
      var self = this;
      this.ignoreFields = ['year-span'];
      
      this.on('remove', function() {
          self.reset(self.models);
      });
    },
    
    resetLabelsFromFormVars: function(options) {
        var self = this;
        var models = [];
        _.each(options.vars, function(values) {
            if (values.value != "" && _.indexOf(self.ignoreFields, values.name) == -1 && _.indexOf(options.ignore, values.name) == -1) {
                // Deal with Site_ID differently
                if (values.name == 'site_id') {
                    _.each(values.value.split(', '), function(siteId){
                        models.push(new FilterLabelModel({label: 'NOT', value: siteId, name: values.name}));                
                     });
                } else {                    
                    var label = $('label[for=' + values.name + ']').text();
                    models.push(new FilterLabelModel({label: label, value: values.value, name: values.name}));
                }
            }
        });
        		
        this.reset(models);
    }
          
});
