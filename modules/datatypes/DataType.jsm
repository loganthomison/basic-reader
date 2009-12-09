/**
 * @fileoverview This module contains the DataType interface. 
 * Exports a single symbol, DataType which must be imported into the 
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

const EXPORTED_SYMBOLS = ['DataType'];

Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");
Components.utils.import("resource://alpheios/ext/JSON.js");


/**
 * @class DataType 
 * @constructor
 * @param {String} a_file the local file name
 * @param {String} a_charset the charset for the file (defaults to UTF-8)
 */
DataType = function(a_file,a_charset)
{  
    this.d_srcFile = a_file;
    this.d_charSet = a_charset;
    this.d_dataObj = null;
    this.d_setCounter = 0;
    this.d_setObservers = new Array();
    this.init();
};

/**
 * Static loggger 
 * @static
 */
DataType.s_logger = BrowserUtils.getLogger('Alpheios.DataType');
 
/**
 * init method can be overridden in the derived classes
 * to perform type-specific initialization
 */
DataType.prototype.init = function()
{
    // default does nothing
}

/**
 * loads and parses the file from the filesystem
 */
DataType.prototype.load = function()
{
    // only load once
    if (! this.d_dataObj)
    {
        var parsed;
        try
        {
            parsed = JSON.parse(BrowserUtils.readLocalFile(this.d_srcFile));
        }
        catch(a_e)
        {
            BrowserUtils.debug("Unable to parse file at " + this.d_srcFile + ":" + a_e);
        }
        this.d_dataObj = parsed || this.getDefault();
    }
}

/**
 * stores the file to the filesystem
 */
DataType.prototype.store = function()
{
    // only store if data has been loaded
    if (this.d_dataObj)
    {
        var data = this.serialize();
        BrowserUtils.writeLocalFile(this.d_srcFile,data,this.d_charset);
    }
}

/**
 * unload the data parsed from the filesystem
 */
DataType.prototype.unload = function()
{
    if (this.d_dataObj)
    {
        this.store();
        this.d_dataObj = null;
    }
}

/**
 * serialize the data for storage
 */
DataType.prototype.serialize = function()
{
    return JSON.stringify(this.d_dataObj);
}

/**
 * get the default data contents
 */
DataType.prototype.getDefault = function()
{
    // default is just an empty object
    // override for type specific objects
    return {};
}

/**
 * Add an observer function on x data sets
 * @param {String} a_name the unique name for the observer
 * @param {int} a_num the number of set accesses after which to execute the callback
 * @param {Function} the a_callback the callback to execute
 * @param {Object} a_ctx the 'this' object context for the callback
 */
DataType.prototype.addSetterObserver = function(a_name,a_num,a_callback,a_ctx)
{
   this.d_setObservers[a_name]= [0,a_num,a_callback,a_ctx];
},

/**
 * Remove an observer function on x data sets
 * @param {String} a_name the name (regex pattern) for the observer                
 */
DataType.prototype.removeSetterObserver = function(a_regex)
{
    var pattern = new RegExp(a_regex);
    for (var name in this.d_setObservers)
    {
        if (pattern.exec(name))
        {
            delete this.d_setObservers[name];
        }
    }            
},

/**
 * observe a set access on the DataType object
 * @param {Window} a_window the parent window which initiated the set action
 */
DataType.prototype.observeSetter = function(a_window)
{
    for (var name in this.d_setObservers)
    {
        var obs = this.d_setObservers[name];
        var counter = ++obs[0];
        var trigger = obs[1];
        var func = obs[2];
        var ctx = obs[3];
        if (counter >= trigger)
        {
            DataType.s_logger.debug("observing setter " + name + " in " + a_window.location.pathname);
            // reset the counter
            obs[0] = 0;
            try
            {
                // make sure latest data is saved
                this.store();
                if (typeof func == 'function')
                {
                    func.call(ctx,a_window);
                }
            }
            catch(a_e)
            {
                DataType.s_logger.warn("Error observing setter callback for " + this.d_srcFile + ": " + a_e);
            }
        }
    }
       
}