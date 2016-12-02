de.is24.umzug.angularjs.componente.leadEngineController = de.is24.umzug.angularjs.componente.leadEngineController ||
    (function ($) {

        var leadEngineController = angular.module('leadEngineController',['ngRoute', 'commonService','leadEngineService']);

        /*-------------------------------------------------------------------------------------------------------------*/
        function LeadEngineMainController( LOCAL_STORAGE_PREFIX, appsteps, LeadEngineService, $rootScope, $scope, $location, getURLParams, $anchorScroll  ) {

            this.LOCAL_STORAGE_PREFIX = LOCAL_STORAGE_PREFIX;
            this.appsteps = appsteps;
            this.LeadEngineService = LeadEngineService;
            this.$location = $location;
            this.$anchorScroll = $anchorScroll;
            this.$scope = $scope;

            $rootScope.isAustria = getURLParams().country === 'at';
            $rootScope.isUmzugde = getURLParams().page === 'umzugde';
            $rootScope.trackingCounternameDomain = $rootScope.isUmzugde? "umzug.de.": $rootScope.isAustria? "is24.at.umzug." : "is24.de.umzug.";
            $rootScope.removalCompaniesCount = $rootScope.isAustria? "500" : "1.000";
            $scope.toAnchor = Function.exportFunction(this, this.toAnchor);

            $rootScope.$on('$locationChangeSuccess', Function.exportFunction(this, function () {
                var url = this.$location.url();
                if (url === this.appsteps.address.path || url.length < 2) {
                    this.LeadEngineService.removeLightboxBackground();
                }
            }));

            $rootScope.backToAddressForm = Function.exportFunction(this, this.backToAddressForm);
        }

        LeadEngineMainController.prototype.backToAddressForm = function () {
            this.LeadEngineService.removeLightboxBackground();
            this.$location.url(this.appsteps.address.path);
            $('#lead-engine-page').css("padding", "0 12px");
            $('body').removeClass("noBodyScroll");
        }

        LeadEngineMainController.prototype.toAnchor = function(anchor){
            var oldhash = this.$location.hash();
            if(anchor) {
                this.$location.hash(anchor);
            }
            this.$anchorScroll();
            this.$location.hash(oldhash);
        }

        leadEngineController.controller('LeadEngineMainController', LeadEngineMainController );

        /*------------------------------------------------------------------------------------------------------------------*/

        function LeadEngineAddressController(LOCAL_STORAGE_PREFIX, appsteps, $scope, TrackingService, EventService, LeadEngineService, $location, modelDefinitions, $timeout) {

            this.LOCAL_STORAGE_PREFIX = LOCAL_STORAGE_PREFIX;
            this.appsteps = appsteps;
            this.$scope = $scope;
            this.TrackingService = TrackingService;
            this.LeadEngineService = LeadEngineService;
            this.$location = $location;
            this.maxDateSaveInfoDay = 25;
            this.maxDaysFor14DaysInfo = 14;
            this.day_milli_sec = 24 * 60 * 60 * 1000;
            this.daysSaveInfoDay = ["Donnerstag", "Freitag", "Samstag"];
            this.modelDefinitions = modelDefinitions;
            this.$timeout = $timeout;

            this.$scope.onlyNumbers = /^[0-9]*$/;

            this.lastShowTipTrackingValue;

            this.$scope.submitted = false;
            this.$scope.toDateStart = 1;

            this.$scope.lastLeadStatus = null;
            this.$scope.submitAddressForm = Function.exportFunction(this, this.submitAddressForm);
            this.$scope.triggerDatepicker = Function.exportFunction(this, this.triggerDatepicker);

            this.initAddressModel();
            this.$scope.showTip = {
                enabled: true,
                show: false
            };
            this.$scope.showTip14Days = {
                enabled: true,
                show: false
            };


            this.checkDateSaveInfo();

            this.$scope.$watch( appsteps.address.modelName + '.vondatum.value'
                , Function.exportFunction(this, function(newDateStr, oldDateStr){

                    var newDate = de.is24.umzug.angularHelperMethods.createDateFromGermanDateString(newDateStr);

                    this.sychronizeToAndFromDate();
                    this.checkDateSaveInfo();

                    if( newDate ) {
                        this.$scope.toDateStart = this.getDaysBetween(de.is24.umzug.angularHelperMethods.createDateFromGermanDateString(newDateStr), new Date());
                    }
                })
            );
            this.$scope.$watch( appsteps.address.modelName + '.nachdatum.value'
                , Function.exportFunction(this, function(newDateStr, oldDateStr){

                    this.sychronizeToAndFromDate();
                    this.checkDateSaveInfo();
                })
            );
            this.$scope.$watch( appsteps.address.modelName + '.qm.value'
                , Function.exportFunction(this, function(newQm,oldQm){
                    this.$scope.qmIntValue = LeadEngineService.getModelFieldAsInteger(appsteps.address.modelName, "qm");
                    this.$scope.qmEmptyOrNotInt = (this.$scope.qmIntValue === null);
                })
            );

            $('body').removeClass("noBodyScroll");

        };


        LeadEngineAddressController.prototype.changeShowTipValue = function(tip, tip14Days) {
            if(this.$scope.showTip.enabled) {
                if (tip && !tip14Days) {
                    this.$scope.showTip.show = true;
                    this.lastShowTipTrackingValue = 'umz_spartipp_weekday';
                } else {
                    this.$scope.showTip.show = false;
                }
            }
            if(this.$scope.showTip14Days.enabled) {
                if (tip14Days && !tip) {
                    this.$scope.showTip14Days.show = true;
                    this.lastShowTipTrackingValue = 'umz_spartipp_14days';
                } else {
                    this.$scope.showTip14Days.show = false;
                }
            }
            if(this.$scope.showTip14Days.enabled && this.$scope.showTip.enabled) {
                if (tip14Days && tip) {
                    this.$scope.showTip14Days.show = true;
                    this.$scope.showTip.show = true;
                    this.lastShowTipTrackingValue = 'umz_spartipp_both';
                }
                if (!tip14Days && !tip) {
                    this.$scope.showTip14Days.show = false;
                    this.$scope.showTip.show = false;
                    this.lastShowTipTrackingValue = 'umz_spartipp_none';
                }
            }
            this.LeadEngineService.tipValue = this.lastShowTipTrackingValue;
        }

        LeadEngineAddressController.prototype.initAddressModel = function () {

            this.LeadEngineService.bindFormModel(this.$scope,this.appsteps.address.modelName,this.modelDefinitions[this.appsteps.address.modelName]);
        }

        LeadEngineAddressController.prototype.submitAddressForm = function () {

            this.$scope.sending = true;

            this.LeadEngineService.createLead(Function.exportFunction(this, function(answer){

                this.$scope.lastLeadStatus = answer.status;
                if( this.$scope.lastLeadStatus === 'success') {
                    this.$location.url(this.appsteps.addressDetails.path);
                } else {
                    this.$scope.submitted = true;
                    this.$scope.fieldErrorMessage = answer.message;
                }
                this.$scope.sending = false;
            }),this.appsteps.address.modelName);
        }

        LeadEngineAddressController.prototype.checkDateSaveInfo = function() {
            var fromDate = this.$scope.addressModel.vondatum.value,
                toDate = this.$scope.addressModel.nachdatum.value,
                dayInMonthFrom,
                dayInMonthTo,
                monthFrom,
                yearFrom,
                monthTo,
                yearTo,
                dateopjFrom,
                dateobjTo,
                showTip,
                showTip14Days = false;


            if( !fromDate && !toDate) {
                return;
            } else {
                dayInMonthFrom = parseInt(fromDate.substring(0, 2), 10);
                dayInMonthTo = parseInt(toDate.substring(0, 2), 10);
                if (dayInMonthFrom > this.maxDateSaveInfoDay || dayInMonthTo > this.maxDateSaveInfoDay) {
                    showTip = true;
                } else {
                    monthFrom = parseInt(fromDate.substring(3, 5), 10);
                    yearFrom = parseInt(fromDate.substring(6, 10), 10);
                    monthTo = parseInt(toDate.substring(3, 5), 10);
                    yearTo = parseInt(toDate.substring(6, 10), 10);
                    dateopjFrom = new Date(yearFrom, monthFrom - 1, dayInMonthFrom);
                    dateobjTo = new Date(yearTo, monthTo - 1, dayInMonthTo);
                    for (var i in this.daysSaveInfoDay) {
                        if (this.daysSaveInfoDay[i] === dateopjFrom.toLocaleDateString('de-DE', {weekday: 'long'}) ||
                            this.daysSaveInfoDay[i] === dateobjTo.toLocaleDateString('de-DE', {weekday: 'long'})) {
                            showTip = true;
                            break;
                        } else {
                            showTip = false;
                        }
                    }

                }
                if ( ( fromDate && this.getDaysBetween(de.is24.umzug.angularHelperMethods.createDateFromGermanDateString(fromDate), new Date()) < this.maxDaysFor14DaysInfo ) ||
                    ( toDate && this.getDaysBetween(de.is24.umzug.angularHelperMethods.createDateFromGermanDateString(toDate), new Date()) < this.maxDaysFor14DaysInfo ) ) {
                    showTip14Days = true;
                }
                this.changeShowTipValue(showTip, showTip14Days);
            }


        }

        LeadEngineAddressController.prototype.getDaysBetween = function (date1, date2) {

            function getMillisecoundsOfDay(date){

                return new Date( date.getFullYear(), date.getMonth(), date.getDate() ).getTime();
            }

            var date1_ms = getMillisecoundsOfDay(date1),
                date2_ms = getMillisecoundsOfDay(date2),
                difference_ms = Math.abs(date1_ms - date2_ms);

            return Math.floor( difference_ms / this.day_milli_sec );
        }


        LeadEngineAddressController.prototype.sychronizeToAndFromDate = function() {

            var toDateModel = this.$scope.addressModel.nachdatum,
                toDate = toDate = de.is24.umzug.angularHelperMethods.createDateFromGermanDateString(toDateModel.value),
                fromDateModel = this.$scope.addressModel.vondatum,
                fromDate = de.is24.umzug.angularHelperMethods.createDateFromGermanDateString(fromDateModel.value);

            if( toDate === null && fromDate !== null ) {
                toDateModel.value = fromDateModel.value;
            } else if( fromDate === null && toDate !== null ) {
                fromDateModel.value = toDateModel.value;
            } else if( fromDate !== null && toDate !== null && toDate < fromDate ) {
                toDateModel.value = fromDateModel.value;
            }
        }

        LeadEngineAddressController.prototype.triggerDatepicker = function(element) {
            $(element).datepicker('show');
        };


        leadEngineController.controller('LeadEngineAddressController', LeadEngineAddressController );

        /*------------------------------------------------------------------------------------------------------------------*/

        function LeadEngineAddressDetailsController( LOCAL_STORAGE_PREFIX, appsteps, $scope, LeadEngineService, $location, modelDefinitions ) {

            this.LOCAL_STORAGE_PREFIX = LOCAL_STORAGE_PREFIX;
            this.appsteps = appsteps;
            this.$scope = $scope;
            this.LeadEngineService = LeadEngineService;
            this.$location = $location;
            this.modelDefinitions = modelDefinitions;

            this.$scope.lastLeadStatus = null;
            this.$scope.submitAddressDetailsForm = Function.exportFunction(this, this.submitAddressDetailsForm);
            this.$scope.tipValue = this.LeadEngineService.tipValue;

            LeadEngineService.prepareLightbox();
            $('body').removeClass("noBodyScroll");

            this.initAddressDetailsModel();

            this.$scope.countRemovalCompanies = this.getRandomNumber(22, 29);

            this.$scope.optionalServiceOpen = true;


        };

        LeadEngineAddressDetailsController.prototype.getRandomNumber = function (min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        }


        LeadEngineAddressDetailsController.prototype.initAddressDetailsModel = function () {

            this.LeadEngineService.bindFormModel(this.$scope,this.appsteps.addressDetails.modelName,this.modelDefinitions[this.appsteps.addressDetails.modelName]);
        }

        LeadEngineAddressDetailsController.prototype.submitAddressDetailsForm = function () {

            this.$scope.sending = true;
            this.LeadEngineService.createLead(Function.exportFunction(this, function(answer){

                this.$scope.lastLeadStatus = answer.status;
                if( this.$scope.lastLeadStatus === 'success') {
                    this.$location.url(this.appsteps.contact.path);
                } else {
                    this.$scope.submitted = true;
                    this.$scope.sending = false;
                    this.$scope.fieldErrorMessage = answer.message;
                }
            }),this.appsteps.addressDetails.modelName);
        }



        leadEngineController.controller('LeadEngineAddressDetailsController', LeadEngineAddressDetailsController );

        /*------------------------------------------------------------------------------------------------------------------*/

        function LeadEngineContactController( LOCAL_STORAGE_PREFIX, appsteps, $scope, $rootScope, LeadEngineService, $location, modelDefinitions, $http,  ABTestFactory, TrackingService) {

            this.LOCAL_STORAGE_PREFIX = LOCAL_STORAGE_PREFIX;
            this.appsteps = appsteps;
            this.$scope = $scope;
            this.LeadEngineService = LeadEngineService;
            this.$location = $location;
            this.$scope.EMAIL_REGEXP = de.is24.umzug.validationRules.email_reg;
            this.modelDefinitions = modelDefinitions;
            this.$http = $http;

            this.$scope.submitted = false;

            this.$scope.leadResultStatus = null;
            this.$scope.submitContactForm = Function.exportFunction(this, this.submitContactForm);
            this.$scope.submitContactFormOrig = Function.exportFunction(this, this.submitContactForm);
            this.$scope.backToAddressDetailsForm = Function.exportFunction(this, this.backToAddressDetailsForm);

            this.TrackingService = TrackingService;

            LeadEngineService.prepareLightbox();
            $('body').removeClass("noBodyScroll");

            this.initContactModel();

            if (this.modelDefinitions[this.appsteps.contact.modelName].kundetel_country_code) {
                this.modelDefinitions[this.appsteps.contact.modelName].kundetel_country_code.value = $rootScope.isAustria?  "+43" : "+49";
            }

            this.$scope.agbLink = $rootScope.isAustria? "//www.immobilienscout24.at/unternehmen/AGB/datenschutz/Datenschutzeinwilligung.html" : "//www.immobilienscout24.de/agb/datenschutz/Datenschutzeinwilligung/";
            this.$scope.supportEmail = $rootScope.isAustria? "support@immobilienscout24.at" : "service@immobilienscout24.de";

            this.emailReg = new RegExp(de.is24.umzug.validationRules.email_reg);
            this.$scope.checkEmail = Function.exportFunction(this, this.checkEmail);
            this.$scope.showEmailSug = false;
            this.$scope.addSugToMailModel = Function.exportFunction(this, this.addSugToMailModel);
            $('body').removeClass("noBodyScroll");
        };

        LeadEngineContactController.prototype.initContactModel = function () {

            this.LeadEngineService.bindFormModel(this.$scope,this.appsteps.contact.modelName,this.modelDefinitions[this.appsteps.contact.modelName]);
        }

        LeadEngineContactController.prototype.submitContactForm = function () {
            $('#lead-engine-page').scrollTop(0);
            this.$scope.sending = true;
            this.LeadEngineService.createLead(Function.exportFunction(this, function(answer){
                this.$scope.leadResultStatus = answer.status;
                this.$scope.submitted = true;
                if( this.$scope.leadResultStatus === 'success') {
                    this.$location.url(this.LeadEngineService.getNextStep( this.appsteps.contact ).path);
                } else if( this.$scope.leadResultStatus === 'invalid' ){
                    this.$scope.sending = false;
                } else {
                    this.$scope.sending = false;
                    this.$scope.fieldErrorMessage = answer.message;
                }
            }));
        }

        LeadEngineContactController.prototype.backToAddressDetailsForm = function () {
            this.$location.url(this.appsteps.addressDetails.path);
        }

        LeadEngineContactController.prototype.checkEmail = function () {
            if (this.emailReg.test(this.LeadEngineService.formModels.contactModel.kundemail.value)) {
                this.$http({
                    method: 'POST',
                    url: this.$location.protocol()+"://www.umzug-easy.de/api/checkField/",
                    data: { field: "mail", data: this.LeadEngineService.formModels.contactModel.kundemail.value},
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }).success(Function.exportFunction(this, function(res){
                    if (res.status === "SUG") {
                        this.$scope.showEmailSug = true;
                        this.$scope.emailSuggestion = res.suggestion;
                    } else {
                        this.$scope.showEmailSug = false;
                    }
                }));
            } else {
                this.$scope.showEmailSug = false;
            }
        }

        LeadEngineContactController.prototype.addSugToMailModel = function (emailSuggestion) {
            this.LeadEngineService.formModels.contactModel.kundemail.value = emailSuggestion;
            this.$scope.showEmailSug = false;
        }

        leadEngineController.controller('LeadEngineContactController', LeadEngineContactController );

        /*------------------------------------------------------------------------------------------------------------------*/

        leadEngineController.factory('LeadEngineUGLControllerFunc', function( LeadEngineService, $location, $anchorScroll, appsteps, EventService, $document, $window, $routeParams, UmzugEasyService) {

            function LeadEngineUGLController($scope) {
                var editUgl =  $routeParams['editUgl']? true : false,
                    apartmentQm = de.is24.umzug.angularHelperMethods.convertToNumber(LeadEngineService.formModels.addressModel.qm.value);
                this.$scope = $scope;
                this.$scope.summaryUgl = Function.exportFunction(this, this.summaryUgl);
                this.$scope.exitUgl = Function.exportFunction(this, this.exitUgl);
                this.$scope.addMiscItem = Function.exportFunction(this, this.addMiscItem);
                this.$scope.changeRoom = Function.exportFunction(this, this.changeRoom);
                this.$scope.leadAnswer = LeadEngineService.lastLeadResult;
                this.$scope.haveBeanLeadTracked = this.haveBeanLeadTracked(true);
                this.$scope.ugl = LeadEngineService.getUgl(!editUgl, apartmentQm);
                this.$scope.otherGoods = LeadEngineService.getOtherGoodsForAutocomplete();
                this.$scope.currentRoom = {value: "lounge"};
                //TODO MN: refactor this
                $('#lead-engine-page').css("padding", "0 0 0 0");
                $('#lightbox-background').remove();
                $('body').addClass("noBodyScroll");
                $('.room-items').scroll(function() {
                    $('.status-confirm').fadeOut();
                    $('.sub-headline').addClass("palm-hide");
                    $('header h6').addClass("palm-header");
                })
                LeadEngineService.toggleBodyForIphone();
                this.$scope.$watch( 'currentRoom.value', Function.exportFunction(this, this.scrollToTop));
                if (LeadEngineService.lastLeadResult) {
                    UmzugEasyService.getSpecialTrackingParameter(LeadEngineService.lastLeadResult.formmodel).then(function(params){
                        $scope.trackingParameter = params;
                    });
                }
            }

            LeadEngineUGLController.prototype.changeRoom = function(room) {
                this.$scope.currentRoom.value = room.key;
                this.scrollToTop();
            }

            LeadEngineUGLController.prototype.scrollToTop = function() {
                $('.room-items').scrollTop(0);
            }

            /**
             * Prüft ob ein Lead schon getracket wurde
             * @param markAsTracked {Boolean} true setzt nach der Abfrage den den aktuellen Lead als getracked
             */
            LeadEngineUGLController.prototype.haveBeanLeadTracked = function(markAsTracked) {
                
            	var tracked = LeadEngineService.wasLeadTracked;
            	
            	if( markAsTracked === true )
            		LeadEngineService.wasLeadTracked = markAsTracked;
            	
            	return tracked;
            }

            LeadEngineUGLController.prototype.addMiscItem = function(item, $event) {
                $event.preventDefault();
                var rooms =this.$scope.ugl.rooms,
                    miscRoomIndex = rooms.length - 1;
                if (typeof item === 'undefined' || item.length < 3) {
                    this.$scope.addExtraItemError = true;
                } else {
                    LeadEngineService.getUgl().$promise.then(Function.exportFunction(this, function(ugl) {
                        var pushItem = {name: item, value: 0},
                            isItemInMiscRoom = false;
                        for (var name in ugl.otherGoods) {
                            if (item === name) {
                                pushItem = ugl.otherGoods[name];
                                break;
                            }
                        }

                        for (var i in rooms[miscRoomIndex].items) {
                            if (rooms[miscRoomIndex].items[i].name === pushItem.name) {
                                rooms[miscRoomIndex].items[i].value++;
                                isItemInMiscRoom = true;
                                break;
                            }
                        }
                        if (!isItemInMiscRoom) {
                            pushItem.value++;
                            rooms[miscRoomIndex].items.push(pushItem);
                        }
                        EventService.trigger("itemsCountChange", true, rooms[miscRoomIndex], null);
                        this.$scope.addExtraItemError = false;
                    }))

                }
            }

            LeadEngineUGLController.prototype.exitUgl = function() {
                $location.url(appsteps.confirmation.path);
            }

            LeadEngineUGLController.prototype.summaryUgl = function() {
                $location.url(appsteps.uglSummary.path);
            }


            return LeadEngineUGLController;
        });

        leadEngineController.controller('LeadEngineUGLController',  function( LeadEngineUGLControllerFunc, $scope ) {
            return new LeadEngineUGLControllerFunc($scope);
        });
        /*------------------------------------------------------------------------------------------------------------------*/
        leadEngineController.factory('LeadEngineUGLItemControllerFunc', function(EventService) {

            function LeadEngineUGLItemController($scope){
                this.$scope = $scope;
                this.$scope.changeValue= Function.exportFunction(this, this.changeValue);
            }


            LeadEngineUGLItemController.prototype.changeValue = function(sign, item, $event, room) {

                $event.preventDefault();
                if (sign === "plus") {
                    item.value = item.value + 1;
                    EventService.trigger("itemsCountChange", true, room, item);
                } else {
                    item.value = (item.value === 0) ? 0 : item.value - 1;
                    EventService.trigger("itemsCountChange", false, room, item);
                }
            }

            return LeadEngineUGLItemController;
        });

        leadEngineController.controller('LeadEngineUGLItemController',  function( LeadEngineUGLItemControllerFunc, $scope ) {
            return new LeadEngineUGLItemControllerFunc($scope);
        });

        /*------------------------------------------------------------------------------------------------------------------*/

        leadEngineController.factory('LeadEngineUGLSummaryControllerFunc', function( $location, appsteps, LeadEngineService, EventService, UmzugEasyFactory, TrackingService, $anchorScroll, $document, $window) {

            function LeadEngineUGLSummaryController($scope){
                this.$scope = $scope;
                this.$scope.editUgl = Function.exportFunction(this, this.editUgl);
                this.$scope.submitUgl = Function.exportFunction(this, this.submitUgl);
                this.$scope.ugl = LeadEngineService.getUgl(false);
                this.$scope.exitUgl = Function.exportFunction(this, this.exitUgl);
                $('.room-items').scroll(function() {
                    $('.sub-headline').addClass("palm-hide");
                    $('header h6').addClass("palm-header");
                });
            }

            LeadEngineUGLSummaryController.prototype.editUgl = function() {
                $location.url(appsteps.ugl.path +"?editUgl=true");
            }

            LeadEngineUGLSummaryController.prototype.submitUgl = function() {
                UmzugEasyFactory.ugl.post({
                    ugl: this.$scope.ugl,
                    akey: LeadEngineService.lastLeadResult.orderId
                },Function.exportFunction(this,function(answer){
                    de.is24.umzug.angularHelperMethods.moveViewTo($location, $anchorScroll, "lead-engine-page");
                    TrackingService.track({evt_ga_category: 'relocation', evt_ga_action: 'umzugsgutliste', evt_ga_label: 'submitted', evt_type: 'hidden'});
                    this.$scope.uglToSmall = false;
                    this.$scope.serverError = false;
                }), Function.exportFunction(this,function(answer){
                    if (answer.status === 400) {
                        this.$scope.uglToSmall = true;
                    } else {
                        this.$scope.serverError = true;
                    }
                }));
                $location.url(appsteps.confirmation.path);
            }

            LeadEngineUGLSummaryController.prototype.exitUgl = function() {
                $location.url(appsteps.confirmation.path);
            }

            return LeadEngineUGLSummaryController;
        });

        leadEngineController.controller('LeadEngineUGLSummaryController',  function( LeadEngineUGLSummaryControllerFunc, $scope ) {
            return new LeadEngineUGLSummaryControllerFunc($scope);
        });


        /*------------------------------------------------------------------------------------------------------------------*/


        function LeadEngineConfirmationController( LOCAL_STORAGE_PREFIX, appsteps, $scope, LeadEngineService, $location, AdditionalServiceFactory, ConfigService, $window ) {

            angular.element($window).unbind('resize');

            this.LOCAL_STORAGE_PREFIX = LOCAL_STORAGE_PREFIX;
            this.appsteps = appsteps;
            this.$scope = $scope;
            this.$location = $location;
            this.LeadEngineService = LeadEngineService;
            this.AdditionalServiceFactory = AdditionalServiceFactory;
            this.ConfigService = ConfigService;

            this.$scope.leadAnswer = this.LeadEngineService.lastLeadResult;

            this.$scope.submitAdditionalServicesForm = Function.exportFunction(this, this.submitAdditionalServicesForm);
            this.$scope.additionalServicesProperties = this.getAdditionalServicesProperties();
            $('body').removeClass("noBodyScroll");
            LeadEngineService.prepareLightbox();
            LeadEngineService.toggleBodyForIphone();

        };

        LeadEngineConfirmationController.prototype.getAdditionalServicesProperties = function (servicemodel) {
        	
        	return {
        		phone: this.LeadEngineService.getPhoneNumberValue(),
        		hasNewAddress: true,
        		appName: "leadengine",
        		domain: this.ConfigService.getConfigEntry('portal'),
            	sourceCountry: this.LeadEngineService.getSourceCountryCode(),
            	sourceCity: this.LeadEngineService.getModelEntry('addressModel','vonort',''),
            	gender: this.LeadEngineService.getGender()
        	}
        }

        LeadEngineConfirmationController.prototype.submitAdditionalServicesForm = function (servicemodel) {

            var params = {
                options: {check: true, additionalService: servicemodel.selectedService},
                formmodel: this.LeadEngineService.mergeFormModels()
            };
            if (servicemodel.callbackTime) {
                params['partnerformmodel'] = {callbackTime: servicemodel.callbackTime};
            }

            this.AdditionalServiceFactory.leadengineRequest.query({application:'leadengine'},params);
        }

        leadEngineController.controller('LeadEngineConfirmationController', LeadEngineConfirmationController );

        /*------------------------------------------------------------------------------------------------------------------*/



        return {version:'1.0'};

    }(jQuery));