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
 * gets the restored status of the DataService
 * @returns true if data has been restored false if not 
 * @type boolean
 */
DataService.prototype.restored = function()
{
    // nothing needs to be configured or restored -- always use 
    // whatever data is in the profile directory
    return true;
}

/**
 * Get a callback function to execute the data restore
 * @returns restore callback which takes a single argument, the parent window 
 * @type 
 */
DataService.prototype.getRestoreCallback = function()
{
    return this.restore;
}

/**
 * Get a callback function to execute the data backup
 * @param {int} a_keep the number of old backups to keep
 * @returns backup callback which takes a single argument, the parent window 
 * @type 
 */
DataService.prototype.getBackupCallback = function(a_keep)
{
    return this.backup;
}


/**
 * Restore the data from the configured restore location
 * @param {Window} a_window the parent window
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
 * @param {Window} a_window the parent window
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
 * Clears any user-defined preferences for the service
 */
DataService.prototype.clearPrefs = function()
{
    // no prefs, nothing to do 
}