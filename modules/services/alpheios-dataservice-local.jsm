/**
 * @fileoverview This module extends DataService to provide an implementation
 * which backs up and restores the user data directory from a locally stored file. 
 * Exports a single symbol, DataServiceLocal which must be imported into the 
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

const EXPORTED_SYMBOLS = ['DataServiceLocal'];

Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");
Components.utils.import("resource://alpheios/services/alpheios-dataservice.jsm");

/**
 * Module scoped constant strings
 */
const B_PATH = "user.backup.file";
const R_PATH = "user.restore.file";


/**
 * @class DataServiceLocal extends DataService to provide an implementation which
 * backs up and restores the user data directory from a local file
 * @extends DataService
 */
DataServiceLocal = function() {}

/**
 * @ignore
 */
DataServiceLocal.prototype = new DataService();

/**
 * logger for the class
 * @static
 * @private
 */
DataServiceLocal.s_logger = BrowserUtils.getLogger('Alpheios.DataServiceLocal');

/**
 * Holds the current service state 
 * @see DataService.CONFIG_REQUIRED
 * @see DatService.CONFIGURED
 * @see DataService.RESTORED
 */
DataServiceLocal.prototype.d_status = DataService.CONFIG_REQUIRED;

/**
 * get the current service state
 * @return the current service state
 * @type int
 * @see DataService.CONFIG_REQUIRED
 * @see DatService.CONFIGURED
 * @see DataService.RESTORED 
 */
DataServiceLocal.prototype.getStatus = function()
{    
    // check configuration
    if (this.d_status == DataService.CONFIG_REQUIRED)
    {
        try
        {
            this.configure();
        }
        catch(a_e)
        {
            DataServiceLocal.s_logger.fatal(a_e);
            
        }
    }        
    return this.d_status;       
}

/**
 * Restores the user data directory from a local zip file
 * @returns true if restore succeeded false if not
 * @type Boolean
 */
DataServiceLocal.prototype.restore = function()
{
    var rc = true;
    try 
    {
        BrowserUtils.extractZipData(BrowserUtils.getPref(R_PATH));
        this.d_status = DataService.RESTORED;
    }
    catch(a_e)
    {
        DataServiceLocal.s_logger.error(a_e);
        rc = false;
    }
    return rc;   
}

/**
 * Backs up the user data directory to a local zip file,
 * keeping the requested number of copies of old backups
 * @param {int} a_keep the number of old copies to keep
 * @returns true if backup succeeded false if not
 * @type Boolean
 */
DataServiceLocal.prototype.backup = function(a_keep)
{
    var rc = true;
    try 
    {
        // TODO make copy of existing backup if a_keep > 0
        BrowserUtils.backup(BrowserUtils.getPref(B_PATH));
    }
    catch(a_e)
    {
        DataServiceLocal.s_logger.error(a_e);
        rc = false;
    }
    return rc;
}

/**
 * Sets the configured state of the service based upon the current preferences settings
 * @throws an error if there is a missing or invalid setting 
 */
DataServiceLocal.prototype.configure = function(a_app_state)
{
    // reset config status
    this.d_status = DataService.CONFIG_REQUIRED;
    var backupPath= BrowserUtils.getPref(B_PATH);   
    var restorePath = BrowserUtils.getPref(R_PATH);
    var errors = [];
    if (typeof backupPath == "undefined" || typeof restorePath == "undefined") 
    {
        errors.push("MISSING_SETTING");       
    }
    else 
    {
       // make sure the backup path is writeable the restore file is readable
        if (! BrowserUtils.testLocalFile(backupPath,">"))
        {
            errors.push("INVALID_BACKUP_PATH");
        }
        if (! BrowserUtils.testLocalFile(restorePath,"<"))
        {
            errors.push("INVALID_RESTORE_PATH");
        }
    }
    if (errors.length != 0)
    {
        throw errors.join(',');
    }  
    else
    {
        this.d_status = DataService.CONFIGURED;
    }
}

/**
 * Backup is enabled for this service type
 * @returns true
 * @type Boolean
 */
DataServiceLocal.prototype.backupEnabled = function()
{
    return true;
}

/**
 * Restore is enabled for this service type
 * @returns true
 * @type Boolean
 */
DataServiceLocal.prototype.restoreEnabled = function()
{
    return true;
}