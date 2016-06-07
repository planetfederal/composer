/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/**
 * Module containing configuration constants for the app. 
 * Configured by build.xml, but only when built as part of Boundless Suite (https://github.com/boundlessgeo/suite), 
 * as it depends on https://github.com/boundlessgeo/suite/blob/master/build/build.properties to set the suite version.
 */
angular.module('gsApp.config', [])
.constant('AppConfig', {
	SuiteVersion: 'suite.version'
});