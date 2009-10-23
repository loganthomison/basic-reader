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
    this.init();
};

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