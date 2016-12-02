de.is24.umzug.angularjs.componente.leadEngineApp = de.is24.umzug.angularjs.componente.leadEngineApp ||
(function () {

    angular.module('leadEngineApp',['commonController','leadEngineController', 'ngSanitize', 'commonFormElementDirectives', 'addressAutoCompleteDirective', 'ngRoute', 'commonService', 'leadEngineService', 'googleService', 'commonDirectives', 'additionalServiceFormsModule'])

    .constant(
        'appsteps', {
            address :  {
                path: '/adressen',
                templateUrl: '/umzugsexpose/html/leadEngine/address.html',
                modelName: 'addressModel',
                allowedPreviousSteps: [],
                couldBeOpen: function( currentStep, LeadEngineService, appsteps ) {	return true; },
                couldNotBeOpenReturn: function($location){}
            },
            addressDetails : {
                path: '/adressenDetails',
                templateUrl: '/umzugsexpose/html/leadEngine/addressDetails.html',
                controller: 'LeadEngineAddressDetailsController',
                modelName: 'addressDetailsModel',
                allowedPreviousSteps: [],
                couldBeOpen: function( currentStep, LeadEngineService, appsteps ) {
                	return LeadEngineService.checkModelFields(appsteps.address.modelName);
                },
                couldNotBeOpenReturn: function($location, appsteps){
                	$location.path(appsteps.address.path);
                }
            },
            contact : {
                path: '/kontakt',
                templateUrl: '/umzugsexpose/html/leadEngine/contact.html',
                controller: 'LeadEngineContactController',
                modelName: 'contactModel',
                allowedPreviousSteps: [],
                couldBeOpen: function( currentStep, LeadEngineService, appsteps ) {
                	return LeadEngineService.checkModelFields(appsteps.addressDetails.modelName) &&
                	LeadEngineService.checkModelFields(appsteps.address.modelName);
                },
                couldNotBeOpenReturn: function($location, appsteps){
                	$location.path(appsteps.addressDetails.path);
                }
            },
            ugl : {
                path: '/ugl',
                templateUrl: '/umzugsexpose/html/leadEngine/ugl.html',
                controller: 'LeadEngineUGLController',
                allowedPreviousSteps: ['contact', 'uglSummary'],
                couldBeOpen: function( currentStep, LeadEngineService, appsteps ) {
                	return LeadEngineService.checkModelFields(appsteps.contact.modelName);
                },
                couldNotBeOpenReturn: function($location, appsteps){
                	$location.path(appsteps.contact.path);
                	console.log(appsteps.contact.path);
                }
            },
            uglSummary : {
                path: '/uglSummary',
                templateUrl: '/umzugsexpose/html/leadEngine/uglSummary.html',
                controller: 'LeadEngineUGLSummaryController',
                allowedPreviousSteps: ['ugl'],
                couldBeOpen: function( currentStep, LeadEngineService, appsteps ) {
                	return LeadEngineService.checkModelFields(appsteps.contact.modelName);
                },
                couldNotBeOpenReturn: function($location, appsteps){
                	$location.path(appsteps.contact.path);
                }
            },
            confirmation :  {
                path: '/bestaetigung',
                templateUrl: '/umzugsexpose/html/leadEngine/confirmation.html',
                controller: 'LeadEngineConfirmationController',
                allowedPreviousSteps: ['uglSummary', 'ugl'],
                couldBeOpen: function( currentStep, LeadEngineService, appsteps ) {
                	return LeadEngineService.checkModelFields(appsteps.contact.modelName);
                },
                couldNotBeOpenReturn: function($location, appsteps){
                	$location.path(appsteps.contact.path);
                }
            }
        }
    )
    
    .constant( 'LOCAL_STORAGE_PREFIX', 'umzug.leadengine' )
    
    .constant( 'LEAD_API_METHOD', 'private' )
    
    .config( function( $routeProvider, $locationProvider, appsteps) {
        
        	var stepNames = Object.keys(appsteps);
            for( var i = 1; i <= stepNames.length; i++ ){
                
                var appstepname = stepNames[i - 1], 
                	appstep = appsteps[appstepname];
                
                appstep.step = i;
                appstep.id = appstepname;
                $routeProvider.when(appstep.path, appstep);
            }
            
            $routeProvider.otherwise(appsteps.address);
    })
    
    .run(function($rootScope, $location, LeadEngineService, appsteps, $timeout) {
        $rootScope.$on( "$routeChangeStart", function(event, next, current) {

        	/**
        	 * Prüfen ob die neue View aufgerufen werden kann, bei der
        	 * aktuellen als Vorgängerview
        	 */
        	function checkIfPreviousStepAllowed() {
        		return ( next.allowedPreviousSteps.length === 0 || 
        				_.find( next.allowedPreviousSteps, function(allowStep){ 
		        			return allowStep === (current ? current.id : 'notallowd') 
		        			}
        				)
        		);
        	}

        	/**
        	 * 1. Kann die neue View nach der aktuellen aufgerufen werden
        	 * 2. Prüfen, ob die Models korrekt sind, um die nächste View
        	 *    aufrufen zu können
        	 * Wenn eine der beiden Prüfungen fehlschlägt, dann die in der
        	 * View angegebenen Aletrnativview aufrufen
        	 */
        	if( !( checkIfPreviousStepAllowed() &&
        		   next.couldBeOpen( current, LeadEngineService, appsteps )
	        	 )
        	){
		        next.couldNotBeOpenReturn($location, appsteps);
        	}
        });
    })
                
    .constant('modelDefinitions',
        {
            addressModel : {
                vonstr: {value: '', error_text: 'Bitte geben Sie die Strasse des Auszugsortes an.'},
                vonplz: {value: '', error_text: 'Bitte geben Sie die Postleitzahl des Auszugsortes an.'} ,
                vonort: {value: '', error_text: 'Bitte geben Sie den Auszugsort an.'} ,
                vonnat: {value: 'D', error_text: 'Bitte geben Sie das Länderkennzeichen des Auszugsortes an.'} ,
                qm: {value: '', error_text: 'Bitte geben Sie die Wohnfläche des Auszugsortes als Zahlenwert an.'},
                nachstr: {value: '', error_text: 'Bitte geben Sie die Strasse des Einzugsortes an.'} ,
                nachplz: {value: '', error_text: 'Bitte geben Sie die Postleitzahl des Einzugsortes an.'} ,
                nachort: {value: '', error_text: 'Bitte geben Sie den Einzugsort an.'} ,
                nachnat: {value: 'D', error_text: 'Bitte geben Sie das Länderkennzeichen des Einzugsortes an.'} ,
                vondatart: {value: 'am', error_text: 'Bitte geben Sie die Gültigkeit des Auszugsdatums an.'} ,
                vondatum: {value: '', error_text: 'Bitte geben Sie den Auszugstermin an.'} ,
                nachdatart: {value: 'am', error_text: 'Bitte geben Sie die Gültigkeit des Einzugsdatums an.'} ,
                nachdatum: {value: '', error_text: 'Bitte geben Sie den Einzugstermin an.'} ,
                nachstehtnichtfest: {value: '0', valid: true}
            },
            addressDetailsModel: {
                vonhaus: {value: '', error_text: 'Bitte geben Sie den Wohnungstyp des Auszugsortes an'},
                vonetage: {value: '', error_text: 'Bitte geben Sie die Etage des Auszugsortes an'},
                zimmer: {value: '', error_text: 'Bitte geben Sie die Zimmer des Auszugsortes an'},
                personen: {value: '', error_text: 'Bitte geben Sie die Anzahl der Personen an, die umziehen'},
                vonlift: {value: '', error_text: 'Bitte geben Sie ob am Auszugsort ein Lift vorhanden ist'},
                nachhaus: {value: '', error_text: 'Bitte geben Sie den Wohnungstyp des Einzugsortes an'},
                nachetage: {value: '', error_text: 'Bitte geben Sie die Etage des Einzugsortes an'},
                nachlift: {value: '', error_text: 'Bitte geben Sie ob am Einzugsort ein Lift vorhanden ist'},

                ubez: {value: '', error_text: 'Bitte geben Sie an, wer Ihren Umzug bezahlt'},
        
                einpacken: {value: 'Kunde', error_text: 'Bitte geben Sie an, ob die Kartons eingepackt werden sollen'},
                moebelabbau: {value: 'Kunde', error_text: 'Bitte geben Sie an, ob die Möbel abgebaut werden sollen'},
                kuecheabbau: {value: 'Kunde', error_text: 'Bitte geben Sie an, ob die Küche abgebaut werden soll'},
                von_halteverbot: {value: 'nein', error_text: 'Bitte geben Sie an, ob eine Halteverbotszone eingerichtet werden soll'},
        
                auspacken: {value: 'Kunde', error_text: 'Bitte geben Sie an, ob die Kartons ausgepackt werden sollen'},
                moebelaufbau: {value: 'Kunde', error_text: 'Bitte geben Sie an, ob die Möbel aufgebaut werden sollen'},
                kuecheaufbau: {value: 'Kunde', error_text: 'Bitte geben Sie an, ob die Küche aufgebaut werden soll'},
                moebel_einlagern: {value: 'nein', error_text: 'Bitte geben Sie an, ob die Möbel eingelagert werden sollen'},
        
                keller: {value: 'nein', error_text: 'Bitte geben Sie an, ob ein Keller oder ein Dachboden berücksichtigt werden soll'},
                vondetails: {value: '', error_text: 'Bitte geben Sie an, was beim Auszug berücksichtigt werden soll'}
            },
            contactModel:{
                anrede: {value: '', error_text: 'Bitte wählen Sie eine Anrede.'},
                kundevorname: {value: '', error_text: 'Bitte geben Sie Ihren Vornamen an.'},
                kundenachname: {value: '', error_text: 'Bitte geben Sie Ihren Nachnamen an.'},
                kundemail: {value: '', error_text: 'Bitte geben Sie Ihre E-Mail Adresse an.'},
                kundetel_country_code: {value: '', error_text: 'Bitte geben Sie eine gültige Telefonnummer an. Ihre Telefonnummer ist wichtig: Nur im persönlichen Gespräch können Ihnen unsere Partner ein individuelles Angebot unterbreiten.'},
                kundetel_area_code: {value: '', error_text: 'Bitte geben Sie eine gültige Telefonnummer an. Ihre Telefonnummer ist wichtig: Nur im persönlichen Gespräch können Ihnen unsere Partner ein individuelles Angebot unterbreiten.'},
                kundetel_subscriber: {value: '', error_text: 'Bitte geben Sie eine gültige Telefonnummer an. Ihre Telefonnummer ist wichtig: Nur im persönlichen Gespräch können Ihnen unsere Partner ein individuelles Angebot unterbreiten.'}
            }
        }
    )
    ;
    
    return {version:'1.0'};
}());