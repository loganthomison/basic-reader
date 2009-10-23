/**
 * @fileoverview This module contains the base DataService implementation 
 * Exports a single symbol, DataService which must be imported into the 
 * namespace of the importing class.
 *
 * @version $Id: alpheios-browser-utils.jsm 2138 2009-10-05 11:50:59Z BridgetAlmas $
 * 
 * Copyright 2008 Cantus Foundation
 * http://alpheios.net
 * 
 * This file is part of Alpheios.
 * 
 * Alpheios is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Alpheios is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */    
 
const EXPORTED_SYMBOLS = ['DataService'];

Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");

/**
 * @class DataService default implementation which support neither backup nor restore
 * from within the browser.  
 * @constructor
 */
DataService = function() { }  

/**
 * DataService state constant: Configuration required
 * @constant
 * @type int
 */
DataService.CONFIG_REQUIRED = 1;

/**
 * DataService state constant: Configured
 * @constant
 * @type int
 */
DataService.CONFIGURED = 2;

/**
 * DataService state constant: Data Restored
 * @constant
 * @type int
 */
DataService.RESTORED= 3;


/**
 * gets the status of the DataService
 * @returns one of DataService.CONFIG_REQUIRED, DataService.CONFIGURED, DataService.RESTORED
 * @type int
 */
DataService.prototype.getStatus = function()
{
    // nothing needs to be configured or restored -- always use 
    // whatever data is in the profile directory
    return DataService.CONFIGURED;
}

/**
 * Restore the data from the configured restore location
 * @returns true if restore succeeded false if not
 * @type Boolean
 */
DataService.prototype.restore = function()
{
    // override for service type-specific functionality
    // default nothing to do - restore external to Alpheios
    return true;
}

/**
 * Backs up the user data directory to a local zip file,
 * keeping the requested number of copies of old backups
 * @param {int} a_keep the number of old copies to keep
 * @returns true if backup succeeded false if not
 * @type Boolean
 */
DataService.prototype.backup = function(a_keep)
{
    // override for service type-specific functionality
    // default nothing to do - backup external to Alpheios
    return true;
}

/**
 * Test to see if backup has been enabled for this data service type
 * @returns true or false
 * @type Boolean
 */
DataService.prototype.backupEnabled = function()
{
    // default service doesn't support backup
    return false;
}

/**
 * Test to see if restore has been enabled for this data service type
 * @returns true or false
 * @type Boolean
 */
DataService.prototype.restoreEnabled = function()
{
    // default service doesn't support restore
    return false;
}