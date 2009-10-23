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

/**
 * Module scoped constant strings
 */
const DSVC_LIST = "user.dataservices";
const DSVC = "user.dataservice";
const DTYPE_LIST = "user.datatypes";
const DTYPE = "user.datatype.";
const RESOURCE = ".resource";
const CLASSNAME = ".class";
const BACKUP = "user.backup";
const RESTORE = "user.restore";
const KEEP = "keep";
const INTERVAL = "interval";
const ONAPPLOAD = "on_appload";
const ONENABLE = "on_enable";
const ONLOOKUP = "on_lookup";
const ONDISABLE = "on_disable";
const ONAPPQUIT = "on_appquit";


DataManager = 
{
        

    /**
     * Status constants
     */
    READY: 1,
    CONFIGURE: 2,
    CONFIRMRESTORE: 3,
    
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
     */
    d_loaded: false,
    
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
        // if we already initalied the data service just return
        if (this.d_dataService && ! a_force)
        {
            this.s_logger.debug("Data service already initialized")
            return;
        }
    
        var datasvcs = BrowserUtils.getPref(DSVC_LIST);
        datasvcs.split(/,/).forEach(
            function(a_svc)
            {
                var resource = BrowserUtils.getPref(DSVC + "." + a_svc + RESOURCE);
                try 
                {
                    BrowserUtils.importResource(
                        resource,self.d_dataSvcTypes);
                }
                catch (a_e)
                {
                       self.s_logger.warn("Unable to import dataservice resource " + resource + ": " + a_e);
                }
            }
        );

        var datatypes = BrowserUtils.getPref(DTYPE_LIST);
        datatypes.split(/,/).forEach(
            function(a_type)
            {
                var classname = BrowserUtils.getPref(DTYPE + a_type + CLASSNAME);
                var resource = BrowserUtils.getPref(DTYPE + a_type + RESOURCE);
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
                    self.s_logger.warn("Unable to import datatype resource " + resource +  ": " + a_e);
                }
                    
            }
        );

        var svc_type = BrowserUtils.getPref(DSVC);
        var svc_class = BrowserUtils.getPref(DSVC + "." + svc_type + CLASSNAME);
        
        var new_svc = null;
        if (svc_type == 'default')
        {
            new_svc = new DataService();
        }
        else if (this.d_dataSvcTypes[svc_class])
        {    
            new_svc = new this.d_dataSvcTypes[svc_class]();   
        }
        else
        {
            this.s_logger.fatal("Invalid data service type: " + svc_type);
        }
    
        this.d_dataService = new_svc;    
    },
    
    /**
     * Checks if the Data Manager is ready to serve the user data
     * @returns the DataManager status 
     *          (one of CONFIGURE, CONFIRMRESTORE, or READY
     * @type int
     */
    ready: function()
    {
        var rc = null;
        if (! this.d_dataService ||
            (this.d_dataService.getStatus() == DataService.CONFIG_REQUIRED))
        {
            rc = DataManager.CONFIGURE; 
        }
        else if (this.d_dataService.getStatus() == DataService.CONFIGURED)
        {
            // check to see if we need to restore
            if (this.d_dataService.restoreEnabled())
            {
                rc = DataManager.CONFIRMRESTORE
            }
            else
            {
                rc = DataManager.READY;
            }
        }
        else if (this.d_dataService.getStatus() == DataService.RESTORED)
        {
            if (BrowserUtils.getPref(RESTORE + "." + INTERVAL) == ONENABLE)
            {    
                    rc = DataManager.CONFIRMRESTORE;
            }
            else
            {
                    rc = DataManager.READY;
            }
        }
        if (rc == DataManager.READY && ! this.d_loaded)
        {
            // make sure the data is up to date 
            this.loadData();            
        }
        return rc;
    },
    
    /**
     * Resets the data service from preferences and reinitializes the data manager
     */
    resetDataService: function()
    {
        // if we're changing to a new service, backup and clear out the old data
        if (this.d_dataService)
        {
          // backup and clear old data
          this.d_dataService.clear();
        }
        // re-initialize the DataManager
        this.init(true);
    },
        
    /**
     * Restores the user data directory from a backup 
     * @returns true if data was succesfully restored otherwise false
     * @type Boolean
     */
    restoreData: function(a_app_state,a_force)
    {
        var rc = false;
        try
        {      
            this.d_dataService.restore() && this.loadData();
            rc = true;
        }
        catch(a_e)
        {
            this.s_logger.fatal("Error loading user data " + a_e);
        }        
        return rc;
    },
    
    
    /**
     * Backup and clear the current user data
     */
    clearData: function()
    {
        var keep = BrowserUtils.getPref(BACKUP + "." + KEEP);
        this.d_dataService.backup(keep || 0) && BrowserUtils.removeDataDir();
        // TODO handle error clearing data
    },
    
    
    /**
     * Load the user data objects 
     */
    loadData: function()
    {
        var self = this;
        // kill the backup
        this.configureBackup(false);
        this.s_logger.debug("Loading user data");
        var datatypes = BrowserUtils.getPref(DTYPE_LIST);
        datatypes.split(/,/).forEach(
            function(a_type)
            {
                var typeObj = self.d_dataObjs[a_type];
                if (typeObj)
                {
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
        this.configureBackup(true);
        this.d_loaded = true;
        // make sure the backup is configured
        
    },
    
    /**
     * Save the current user data to the filesystem
     */
    saveData: function()
    {
        var self = this;
        var datatypes = BrowserUtils.getPref(DTYPE_LIST);
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
     * kick off or stop data backup threads
     * @param {Boolean} a_start true to start false to stop
     */
    configureBackup: function(a_start)
    {
        // if interval, start thread
        // if backup on disable, init onDisable handler
        // init onAppQuit handler
    },
    
    /**
     * return the container of all objects of the requested type
     * @param {String} a_type the data type
     * @returns the container of data objects
     * @type Object
     */
    getDataContainer: function(a_type)
    {
        return this.dataObjs[a_type];   
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
        var obj = null;
        if (this.d_dataObjs[a_type])
        {
            obj = this.d_dataObjs[a_type].d_objs[a_key];
            if (! obj && a_create)
            {
                obj = this.createDataObj(a_type,a_key)
            }
            // make sure the object is fully loaded before we return it
            obj.load();
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
        this.d_dataObjs[a_type].d_objs[a_key] = a_obj;   
    }
}
DataManager.init();