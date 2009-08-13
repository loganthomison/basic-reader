/**
 * @fileoverview conversion utility functions are encaspulated in the Alph.convert object
 * namespace. 
 * @version $Id: alpheios-conversions.js 1901 2009-08-06 13:49:48Z BridgetAlmas $
 *   
 * Copyright 2008-2009 Cantus Foundation
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
 
 /**
 * This module exports a single symbol, Convert
 * This object should be imported into the namespace of the importing class
 */
const EXPORTED_SYMBOLS = ['Convert'];
Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");

Convert = {
    
    /**
     * main logger for the Convert object
     * @type Log4Moz.Logger
     * @static
     */
    s_logger: BrowserUtils.getLogger('Alpheios.Convert'), 
    
    /**
     * bind a new method to the Convert object
     * @param {String} the name of the method
     * @param {Function} the function body
     */
    bind: function(a_name,a_func)
    {
        this[a_name] = a_func;
    },
    
}