/**
 * @fileoverview This module contains a generic XML implementation of the DataType interface. 
 * Exports a single symbol, XMLDataType which must be imported into the 
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

const EXPORTED_SYMBOLS = ['XmlDataType'];

Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");
Components.utils.import("resource://alpheios/datatypes/DataType.jsm");


/**
 * @class XmlDataType
 * @extends DataType 
 */
XmlDataType = function(a_file, a_charset,a_args)
{
    DataType.call(this,a_file,a_charset,a_args);
};

/**
 * @ignore
 */
XmlDataType.prototype = new DataType();


/**
 * loads and parses the file from the filesystem
 */
XmlDataType.prototype.load = function()
{
    // only load once
    if (! this.d_dataObj)
    {
        var recent_win = BrowserUtils.getMostRecentWindow("navigator:browser");        
        
        var parsed;
        var raw;
        try
        {
            raw = BrowserUtils.readLocalFile(this.d_srcFile);
            parsed = (new recent_win.DOMParser())
                .parseFromString(raw,"text/xml");
        }
        catch(a_e)
        {
            BrowserUtils.debug("Unable to parse file at " + this.d_srcFile + ":" + a_e);
        }
        if (parsed)
        {
            this.d_dataObj = parsed;
            this.d_raw = raw;
        } else 
        {
            this.d_dataObj = this.getDefault();            
            this.d_raw = this.serialize();
        }
    }
};

/**
 * serialize the data for storage
 */
XmlDataType.prototype.serialize = function()
{
     var recent_win = BrowserUtils.getMostRecentWindow("navigator:browser");
     var serialized = "";
     try {
        serialized = recent_win.XML(
            recent_win.XMLSerializer().serializeToString(this.d_dataObj)
        ).toXMLString();
     }
     catch(a_e)
     {
         BrowserUtils.debug("Unable to serialize file: " + a_e);
         // use the last stored state
         serialized = this.d_raw;
     }
     return serialized;
};

/**
 * get the Data object as an appropriately formatted XML document  
 */
XmlDataType.prototype.asXML = function()
{
   return this.d_dataObj;
};