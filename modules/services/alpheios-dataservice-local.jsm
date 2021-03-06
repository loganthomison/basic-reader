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
Components.utils.import("resource://alpheios/alpheios-constants.jsm");

/**
 * Local Data Service backup file preference setting 
 * @constant
 * @private
 */
const BFILE_PREF = Constants.DSVC + "." + "local.backup.file";

/**
 * Local Data Service restore file preference setting 
 * @constant
 * @private
 */
const RFILE_PREF = Constants.DSVC + "." + "local.restore.file";

/**
 * Local Data Service preference setting - restore from backup 
 * @constant
 * @private
 */
const BACKUP_TO_RESTORE_PREF = Constants.DSVC + "." + "local.backup_to_restore";

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
 * Holds the current restored state 
 * @type boolean
 */
DataServiceLocal.prototype.d_restored = false;

/**
 * Holds the number of backups to keep 
 * @type int
 */
DataServiceLocal.prototype.d_keepBackups = 0;

/**
 * get the current restored state
 * @return true if the data has been restored, otherwise false
 * @type Boolean
 */
DataServiceLocal.prototype.restored = function()
{    
    return this.d_restored;       
}

/**
 * Restores the user data directory from a local zip file
 * @param {Window} a_window the parent window
 * @returns true if restore succeeded false if not
 * @type Boolean
 */
DataServiceLocal.prototype.restore = function(a_window)
{
    var rc = true;
    var pref = BrowserUtils.getPref(BACKUP_TO_RESTORE_PREF) ? BFILE_PREF : RFILE_PREF;
    try 
    { 
        BrowserUtils.setStatus(a_window,"alpheios-dataservice-status","restore-in-progress");
        BrowserUtils.extractZipData(BrowserUtils.getLocalFilePref(pref),true);
        BrowserUtils.clearStatus(a_window,"alpheios-dataservice-status");
        this.d_restored = true;
    }
    catch(a_e)
    {
        DataServiceLocal.s_logger.error(a_e);
        rc = false;
    }
    return rc;   
}

/**
 * get a callback function to execute the data restore
 * @returns restore callback which takes a single argument, the parent window 
 * @type 
 */
DataServiceLocal.prototype.getRestoreCallback = function()
{
    var restorePath;
    if (BrowserUtils.getPref(BACKUP_TO_RESTORE_PREF))
    {
        restorePath = BrowserUtils.getLocalFilePref(BFILE_PREF); 
    }
    else 
    {
        restorePath = BrowserUtils.getLocalFilePref(RFILE_PREF);
    }        
    if (restorePath && BrowserUtils.testLocalFile(restorePath,'<'))
    {
        return this.restore;
    }
    else
    {
        return this.configureRestore;
    }
}

/**
 * Get a callback function to execute the data backup
 * @param {int} a_keep the number of old backups to keep
 * @returns backup callback which takes a single argument, the parent window 
 * @type 
 */
DataServiceLocal.prototype.getBackupCallback = function(a_keep)
{

    this.d_keepBackups = a_keep;
    
    var backupPath= BrowserUtils.getLocalFilePref(BFILE_PREF);   
    if (backupPath && BrowserUtils.testLocalFile(backupPath,'>'))
    {
        return this.backup;
    }
    else
    {
        return this.configureBackup;
    }
}


/**
 * Backs up the user data directory to a local zip file,
 * keeping the requested number of copies of old backups
 * @param {Window} a_window the parent window
 * @param {Path} a_path optional file path for the backup 
 *               (if not suplied, taken from preferences)
 * @returns true if backup succeeded false if not
 * @type Boolean
 */
DataServiceLocal.prototype.backup = function(a_window,a_path)
{
    var rc = true;
    var backup_file = a_path || BrowserUtils.getLocalFilePref(BFILE_PREF);
    try 
    {
        for (var i=this.d_keepBackups-1; i>=0;i--)
        {
            var srcCopy = i == 0 ? backup_file : backup_file.replace(/(\.[^\.]+)$/, ".bak" + i + "$1");
            var backupCopy = backup_file.replace(/(\.[^\.]+)$/, ".bak" + (i+1) + "$1");
            BrowserUtils.copyLocalFile(srcCopy,BrowserUtils.getLocalFile(backupCopy),true);
        }
        
        BrowserUtils.setStatus(a_window,"alpheios-dataservice-status","backup-in-progress");
        BrowserUtils.zipDataDir(backup_file);
        BrowserUtils.clearStatus(a_window,"alpheios-dataservice-status");
    }
    catch(a_e)
    {
        DataServiceLocal.s_logger.error(a_e);
        rc = false;
    }
    return rc;
}

/**
 * Open UI for configuring restore options and execute restore 
 * after configured
 * @param {Window} a_window the parent window 
 */
DataServiceLocal.prototype.configureRestore = function(a_window)
{
    var self = this;
    var pref = BrowserUtils.getPref(BACKUP_TO_RESTORE_PREF) ? BFILE_PREF : RFILE_PREF;
    var rc =
        BrowserUtils.doFilePicker(
        a_window,
        null, 
        'alph-browse-restore-file', 
        function(a_window,a_event,a_picked,a_path)
        {
            BrowserUtils.debug("restore file picked:" + a_picked + " path:" + a_path);
            if (a_picked)
            {       
                BrowserUtils.setLocalFilePref(pref,a_path);
                return this.restore(a_window);
            }
            else
            {
                return false;
            }
        },
        self,
        '*.zip',
        BrowserUtils.getLocalFilePref(pref)||'alpheios-backup.zip');
    return rc;
};

/**
 * Open UI for configuring backup options and execute backup 
 * after configured
 * @param {Window} a_window the parent window 
 */
DataServiceLocal.prototype.configureBackup = function(a_window)
{
    var self = this;
    var rc =
        BrowserUtils.doDirectoryPicker(
        a_window,
        null, 
        'browse-backup-folder', 
        function(a_window,a_event,a_picked,a_file)
        {
            if (a_picked && a_file)
            { 
                a_file.append(Constants.BACKUP_FILE);
                // try creating the backup file at the selected path
                // before updating the file preference -- on the mac
                // the attempt to set the file preference will fail
                // if the file doesn't exist, see 
                // https://bugzilla.mozilla.org/show_bug.cgi?id=529521
                var rc = this.backup(a_window,a_file.path);
                if (rc)
                {
                    BrowserUtils.setLocalFilePref(BFILE_PREF,a_file);
                }
                return rc;
            }
            else
            {
                return false;
            }
        },
        self);
    return rc;
};

/**
 * Clears any user-defined preferences for the service
 */
DataServiceLocal.prototype.clearPrefs = function()
{
    BrowserUtils.resetPref(BFILE_PREF);
    BrowserUtils.resetPref(RFILE_PREF);
}