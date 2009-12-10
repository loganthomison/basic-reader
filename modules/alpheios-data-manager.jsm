/**
 * @fileoverview This module contains the DataManager object. 
 * Exports a single symbol, DataManager which must be imported into the 
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

const EXPORTED_SYMBOLS = ['DataManager'];

Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");
Components.utils.import("resource://alpheios/alpheios-constants.jsm");
Components.utils.import("resource://alpheios/services/alpheios-dataservice.jsm");

DataManager = 
{
        
    /**
     * The current data service
     * @private
     */
    d_dataService: null,
    
    /**
     * Container for the factory methods for each data type
     * as defined in preferences
     * @private
     */
    d_dataTypes: {},
    
    /**
     * Container for the instantiated user data objects
     * @private
     */
    d_dataObjs: {},
    
    /**
     * Container for the factory methods for each data service type
     * as defined in preferences
     * @private
     */
    d_dataSvcTypes: {},
        
    /**
     * flag to indicate data objs have been setup
     * @private
     */
    d_loaded: false,
    
    /**
     * disabled status
     * @private 
     */
    d_disabled: true,
    
    /**
     * logger for the DataManager class
     * @static
     * @private
     */
    s_logger: BrowserUtils.getLogger('Alpheios.DataManager'),
    
    /**
     * Initialize the data manager
     * @param {Boolean} a_force force the initialization 
     * even if it has been done already this Browser session
     */
    init: function(a_force)
    {
     
        var self = this;        
        this.resetDisabledStatus();
        // if we already initalied the data service just return
        if (this.d_dataService && ! a_force)
        {
            this.s_logger.debug("Data service already initialized")
            return;
        }
    
        var datasvcs = BrowserUtils.getPref(Constants.DSVC_LIST);
        datasvcs.split(/,/).forEach(
            function(a_svc)
            {
                var resource = BrowserUtils.getPref(Constants.DSVC + "." + a_svc + "." + Constants.RESOURCE);
                try 
                {
                    BrowserUtils.importResource(
                        resource,self.d_dataSvcTypes);
                }
                catch (a_e)
                {
                       self.s_logger.warn(
                        "Unable to import dataservice " + a_svc + " resource " + resource + ": " + a_e);
                }
            }
        );

        var datatypes = BrowserUtils.getPref(Constants.DTYPE_LIST);
        datatypes.split(/,/).forEach(
            function(a_type)
            {
                var classname = BrowserUtils.getPref(Constants.DTYPE + "." + a_type + "." + Constants.CLASSNAME);
                var resource = BrowserUtils.getPref(Constants.DTYPE + "." + a_type + "." + Constants.RESOURCE);
                try {
                    BrowserUtils.importResource(
                        resource,self.d_dataTypes);
                    self.d_dataObjs[a_type] = {
                        d_classname : classname,
                        d_charset: "UTF-8",
                        d_objs : {}
                    };
                }
                catch (a_e)
                {
                    self.s_logger.warn("Unable to import datatype " + a_type + " resource " 
                        + resource +  ": " + a_e);
                }
                    
            }
        );

        var svc_type = BrowserUtils.getPref(Constants.DSVC);
        var svc_class = BrowserUtils.getPref(Constants.DSVC + "." + svc_type + "." + Constants.CLASSNAME);
        
        var new_svc = null;
        if (this.d_dataSvcTypes[svc_class])
        {    
            new_svc = new this.d_dataSvcTypes[svc_class]();   
        }
        else
        {
            this.s_logger.fatal("Invalid data service type: " + svc_type);
        }
    
        this.s_logger.debug("Setting data service type: " + svc_type);
        this.d_dataService = new_svc;
    },
    
    /**
     * Checks to see if the Data Manager is disabled
     * @returns true if disabled, false if enabled
     * @type Boolean
     */
    disabled: function()
    {
        return this.d_disabled;
    },
    
    /**
     * Disable the data manager
     * @param {Window} a_window the current window
     * @param {Boolean} a_persist flag to indicate whether diabled status should be persisted to preferences 
     */
    disable: function(a_window,a_persist)
    {
        this.d_disabled = true;
        if (a_persist)
        {
            BrowserUtils.setPref(Constants.DMODEL,'disable');
            // modification to the preference setting will automatically call updateUserCommands
        }
        else
        {
            this.updateUserCommands(a_window);
        }
    },

    
    /**
     * respond to the Alpheios app being enabled, restoring and/or loading data
     * if necessary 
     * @param {Window} a_window the parent window in which Alpheios is being enabled
     *                 child dialogs may be opened on this window
     */
    handleAppEnable: function(a_window)
    {
        // don't do anything if we're disabled
        if (this.disabled())
        {
            this.s_logger.warn("the DataManager is disabled");
            return;
        }
        var restore_interval = BrowserUtils.getPref(Constants.RESTORE + "." + Constants.INTERVAL);
        if (! this.d_dataService) 
        {
            // dataservice isn't configured
            if (BrowserUtils.doConfirm(a_window,"alpheios-confirm-dialog","datamanager-configure"))
            {
                BrowserUtils.openDialog(
                    a_window,
                    'chrome://alpheios/content/alpheios-prefs.xul', 
                    'alpheios-options-dialog',
                    {modal:"yes"});
            }
        }
        // still no dataservice? disable data manager and return
        if (! this.d_dataService)
        {
            this.disable(a_window,false);
            BrowserUtils.doAlert(a_window,"alpheios-warning-dialog","datamanager-disabled");
            return; 
        }
        // try to restore if 
        // - the data hasn't yet been restored and restore not setup for only upon request; or
        // - the data has been restored but we're configured to restore everytime the app is enabled
        if ((! this.d_dataService.restored() && restore_interval != Constants.ONREQUEST) ||
                 (this.d_dataService.restored() && restore_interval == Constants.ONENABLE))
        {
            this.s_logger.debug("Restore required " + this.d_dataService.restored() + "," + restore_interval);
            var restore_callback = this.d_dataService.getRestoreCallback();
            var restored = false;
            var declined = false;
            // user confirm required first
            if (BrowserUtils.getPref(Constants.RESTORE + "." + Constants.CONFIRM))
            {
                if (BrowserUtils.doConfirm(a_window,"alpheios-confirm-dialog","restore-confirm"))
                {   
                    restored = restore_callback.call(this.d_dataService,a_window);
                }
                else
                {
                    declined = true;
                }
            }
            else
            {
                restored = restore_callback.call(this.d_dataService,a_window);
            }
            // start fresh or disable data manager if restore wasn't successful
            if (! restored && ! declined)
            {
                if (BrowserUtils.doConfirm(a_window,"alpheios-confirm-dialog","datamanager-confirm-newuser")
                    && this.clearData(a_window,true))
                {
                    // nothing else to do here
                }
                else
                {
                    this.disable(a_window,false);
                }
            }
        }
        else
        {
            this.s_logger.debug("Restore not required " + this.d_dataService.restored() + "," + restore_interval);
            // no action required, user data ready to be loaded
            
        }
        if (!this.disabled() && ! this.d_loaded)
        {
            // make sure the data is up to date 
            this.loadData();            
        }
    },
    
    /**
     * Resets the data service from preferences and reinitializes the data manager
     */
    resetDataService: function()
    {
        this.s_logger.debug("Resetting Data Manager");
        // save any in memory data
        this.saveData();
        
        // flag to trigger data reload
        this.d_loaded = false;
        
        // re-initialize the DataManager
        this.init(true);
    },
        
    /**
     * Restores the user data directory from a backup
     * @param {Window} a_window the current window
     * @param {Boolean} a_quiet true to hide confirm message otherwise false
     * @returns true if data was succesfully restored otherwise false
     * @type Boolean
     */
    restoreData: function(a_window,a_quiet)
    {
        var restored = true;
        // don't do anything if the data manager is disabled
        if (this.disabled())
        {
            return restored;
        }
        
        var title;
        var msg;
        var restore_callback = this.d_dataService.getRestoreCallback();
        if (restore_callback.call(this.d_dataService,a_window))
        {
            this.loadData();
            title = "alph-general-dialog-title";
            msg = "restore-success"; 
        }
        else
        {
            restored = false;
            title = "alpheios-warning-dialog";
            msg = "restore-failed-nodisable";
        }
        if (! a_quiet)
        {
            BrowserUtils.doAlert(a_window,title,msg);
        }
        else
        {
            this.s_logger.info(msg);
        }
        return restored;
    },
    
     /**
     * Backs up the user data directory   
     * @param {Window} a_window the current window
     * @param {Boolean} a_quiet true to hide confirm message otherwise false
     * @returns true if data was succesfully backed up otherwise false
     * @type Boolean
     */
    backupData: function(a_window,a_quiet)
    {
        // don't do anything if the data manager is disabled
        if (this.disabled())
        {
            return true;
        }
        var rc = false;
        this.saveData();
        var keep = BrowserUtils.getPref(Constants.BACKUP + "." + Constants.KEEP) || 0;
        var backup_callback = this.d_dataService.getBackupCallback(keep);
        var msg;
        var title;
        if (backup_callback.call(this.d_dataService,a_window))
        {
            rc = true;
            title = "alph-general-dialog-title";
            msg = "backup-success";
        }
        else
        {
            title = "alpheios-warning-dialog";
            msg = "backup-failed";
        }
        if (! a_quiet)
        {
            BrowserUtils.doAlert(a_window,title,msg);
        }
        else
        {
            this.s_logger.info(msg);
        }
        return rc;
    },
    
    
    /**
     * Clear the current user data
     * @param {Window} a_window the current window
     * @param {Boolean} a_quiet true to hide confirm message otherwise false
     * @returns true if data was succesfully cleared otherwise false
     * @type Boolean
     */
    clearData: function(a_window,a_quiet)
    {
        var title;
        var msg;
        var cleared = false;
        // clear any service-specific settings
        try
        {
            this.d_dataService.clearPrefs();
            BrowserUtils.removeDataDir();
            cleared = true;
            title = "alph-general-dialog-title";
            msg = "clear-success";
        }
        catch(a_e)
        {
            this.s_logger.error("Error clearing user data: " + a_e);
            title = "alpheios-warning-dialog";
            msg = "clear-failed";
        }
        if (! a_quiet)
        {
            BrowserUtils.doAlert(a_window,title,msg);
        }
        // reset the data objects
        this.loadData()
        return cleared;
    },
    
    
    /**
     * Load the user data objects 
     */
    loadData: function()
    {
         // don't do anything if the data manager is disabled
        if (this.disabled())
        {
            return;
        }
        var self = this;
        this.s_logger.debug("Loading user data");
        var datatypes = BrowserUtils.getPref(Constants.DTYPE_LIST);
        datatypes.split(/,/).forEach(
            function(a_type)
            {
                var typeObj = self.d_dataObjs[a_type];
                if (typeObj)
                {
                    // clear any old objects of this type
                    typeObj.d_objs = {};
                    var classname = typeObj.d_classname;
                    var match_string = new RegExp('(.+)' + self.d_dataTypes[classname].s_fileSpec + "$");
                    var charset = typeObj.d_charset;
                    var files = BrowserUtils.listDataFiles(a_type,true);
                    files.forEach(
                        function(a_file_info)
                        {
                            try 
                            {
                                var key = a_file_info[0].match(match_string)[1];
                                var dataObj = new self.d_dataTypes[classname](a_file_info[1],charset);
                                self.addDataObj(a_type,key,dataObj)
                            }
                            catch(a_e)
                            {
                                self.s_logger.
                                    warn("Unable to instantiate data object for " + a_file_info + ": " + a_e);
                            }
                        }
                    );
                }
            }
        );
        this.d_loaded = true;        
    },
    
    /**
     * Save the current user data to the filesystem
     */
    saveData: function()
    {
         // don't do anything if the data manager is disabled
        if (this.disabled())
        {
            return;
        }
        var self = this;
        var datatypes = BrowserUtils.getPref(Constants.DTYPE_LIST);
        datatypes.split(/,/).forEach(
            function(a_type)
            {
                var typeObj = self.d_dataObjs[a_type];
                if (typeObj)
                {
                    for (var key in typeObj.d_objs)
                    {
                        try 
                        {
                            typeObj.d_objs[key].store();
                        }
                        catch(a_e)
                        {
                            self.s_logger.warn("Unable to write data file : " + a_e);    
                        }
                    }
                }
            }
        );
    },

    /**
     * respond to the Alpheios app being disabled, backing up or clearing data per confir
     * @param {Window} a_window the parent window in which Alpheios is being disabled
     *                 child dialogs may be opened on this window
     */
    handleAppDisable: function(a_window)
    {
        var backup_interval = BrowserUtils.getPref(Constants.BACKUP + "." + Constants.INTERVAL);
        if (! this.disabled())
        {
            this.saveData();
            // if backup interval is set to 'disable' or 'lookup' and the datamanager itself is not disabled
            // execute a backup of the data
            if (backup_interval == Constants.ONDISABLE || backup_interval == Constants.ONLOOKUP)
            {
                var keep = BrowserUtils.getPref(Constants.BACKUP + "." + Constants.KEEP) || 0;
                var backup_callback = this.d_dataService.getBackupCallback(keep);
                backup_callback.call(this.d_dataService,a_window)
            }
            // if set to clear on disable, and the datamanager itself is not disabled
            // clear the user data
            var clear_interval = BrowserUtils.getPref(Constants.CLEAR + "." + Constants.INTERVAL);
            if (clear_interval == Constants.ONDISABLE)
            {
                this.clearData(a_window,true);
            }
        }
        this.resetDisabledStatus(a_window);
    },

    /**
     * respond to the Firefox App being closed
     * @param {Window} a_window the parent window which is being closed
     *                 child dialogs may be opened on this window
     */
    handleAppQuit: function(a_window)
    {
       var backup_interval = BrowserUtils.getPref(Constants.BACKUP + "." + Constants.INTERVAL);
       if ( ! this.disabled())
       {
           this.saveData();
           if (backup_interval == Constants.ONAPPQUIT)
           {
                var keep = BrowserUtils.getPref(Constants.BACKUP + "." + Constants.KEEP) || 0;
                var backup_callback = this.d_dataService.getBackupCallback(keep);
                backup_callback.call(this.d_dataService,a_window)
           }
           // if set to clear on appquit, and the datamanager itself is not disabled
            // clear the user data
            var clear_interval = BrowserUtils.getPref(Constants.CLEAR + "." + Constants.INTERVAL);
            if (clear_interval == Constants.ONAPPQUIT)
            {
                this.clearData(a_window,true);
            }
        }
    },
    
    /**
     * return the container of all objects of the requested type
     * @param {String} a_type the data type
     * @returns the container of data objects
     * @type Object
     */
    getDataContainer: function(a_type)
    {
        return this.d_dataObjs[a_type];   
    },
    
    /**
     * return the requested user data object
     * @param {String} a_type the data type
     * @param {String} a_key the key for the specific object
     * @param {Boolean} a_create flag to request object creation if it doesn't exist
     * @returns the requested data object
     * @type DataType 
     */
    getDataObj: function(a_type,a_key,a_create)
    {
        // don't do anything if the data manager is disabled
        if (this.disabled())
        {
            return null;
        }
        var obj = null;
        if (this.d_dataObjs[a_type])
        {
            obj = this.d_dataObjs[a_type].d_objs[a_key];
            if (! obj && a_create)
            {
                obj = this.createDataObj(a_type,a_key)
            }
            // make sure the object is fully loaded before we return it
            if (obj)
            {   
                obj.load();
            }
            else
            {
                this.s_logger.error("Failed to create data object type " + a_type + " key " + a_key);
            }
        }
        return obj;
    },
    
    /**
     * create a new datatype object
     * @param {String} a_type the datatype
     * @param {String} a_key the key to the data object
     * @returns the new data object
     * @type DataType
     */
    createDataObj: function(a_type,a_key)
    {
        var typeObj = this.d_dataObjs[a_type];
        var dataObj = null;
        var filepath =  BrowserUtils.getDataDir(a_type,true);
        filepath.append(a_key + this.d_dataTypes[typeObj.d_classname].s_fileSpec);
        if (typeObj)
        {
            dataObj = new this.d_dataTypes[typeObj.d_classname](filepath.path,typeObj.d_charset);
            this.addDataObj(a_type,a_key,dataObj);
        }
        return dataObj;
    },
    
    /**
     * Add a new object to the container of instantiated datatypes
     * @param {String} a_type the type of object
     * @param {String} a_key a key for the object
     * @param {DataType} the object
     */
    addDataObj: function(a_type,a_key,a_obj)
    {
        // don't do anything if the data manager is disabled
        if (this.disabled())
        {
            return;
        }
        this.d_dataObjs[a_type].d_objs[a_key] = a_obj;
        
        // add an observer to store changes to the data object every x accesses
        var store_trigger = 
            BrowserUtils.getPref([Constants.SAVE,Constants.INTERVAL,Constants.NUMLOOKUPS].join('.'));
        a_obj.addSetterObserver('store_data',store_trigger,null,null);
        
        
        // check to see if we need to add a backup observer to the object
        var backup_interval = BrowserUtils.getPref(Constants.BACKUP + "." + Constants.INTERVAL);
        
        // configured to backup after X data accesses?
        if (backup_interval == Constants.ONLOOKUP)
        {
            var keep = BrowserUtils.getPref(Constants.BACKUP + "." + Constants.KEEP) || 0;
            var backup_callback = this.d_dataService.getBackupCallback(keep);
            var lookup_num = 
                BrowserUtils.getPref([Constants.BACKUP,Constants.INTERVAL,Constants.NUMLOOKUPS].join('.'));
            a_obj.addSetterObserver('lookup_data',lookup_num,backup_callback,this.d_dataService);
        }
    },
    
    /**
     * Update any application commands related to the user functionality
     * @param {Window} a_window the application window
     */
    updateUserCommands: function(a_window)
    {
        var allowed = 0;        
        if (! this.disabled())
        {
            [Constants.BACKUP,Constants.RESTORE,Constants.CLEAR].forEach(
                function(a_type)
                {
                    var elem = a_window.document.getElementById('alpheios-' + a_type + '-allowed');
                    if (elem)
                    {
                        if (BrowserUtils.getPref(a_type + "." + Constants.INTERVAL))
                        {
                            allowed++;
                            elem.setAttribute('hidden',false);
                            elem.setAttribute('disabled',false);
                        }
                        else
                        {
                            elem.setAttribute('hidden',true);
                            elem.setAttribute('disabled',true);
                        }
                    }
                }
            ); 
        }
        var all_commands = a_window.document.getElementById('alpheios-userdata-broadcaster');
        if (all_commands)
        {
            if (allowed >0)
            {
                all_commands.setAttribute("hidden",false);
                all_commands.setAttribute("disabled",false);
            }
            else
            {
                all_commands.setAttribute("hidden",true);
                all_commands.setAttribute("disabled",true);
            }
        }
    },
    
    /**
     * resets the disabled status from preferences
     * @param {Window} a_window
     */
    resetDisabledStatus: function(a_window)
    {
        var model = BrowserUtils.getPref(Constants.DMODEL);
        if (! model || model == 'disable')
        {
            this.d_disabled = true;
        }
        else
        {
            this.d_disabled = false;
        }
        if (a_window)
        {
            this.updateUserCommands(a_window)
        }
    }
}
DataManager.init();