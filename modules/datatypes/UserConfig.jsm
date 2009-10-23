/**
 * @fileoverview This module contains the UserConfig data object 
 * Exports a single symbol, UserConfig which must be imported into the 
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

const EXPORTED_SYMBOLS = ['UserConfig'];

Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");
Components.utils.import("resource://alpheios/datatypes/DataType.jsm");

/**
 * @class WordList
 * @extends DataType 
 */
UserConfig= function(a_file,a_charset)
{
    DataType.call(this,a_file,a_charset);
}

/**
 * @ignore 
 */
UserConfig.prototype = new DataType();

/**
 * user config datatype's file type extension
 * @static
 */
UserConfig.s_fileSpec = '.json';

/**
 * get the default data contents
 * @TODO implement this
 */
UserConfig.prototype.getDefault = function()
{
    // TODO figure out implementation requirements for UserConfig datatype
    return {};   
}
