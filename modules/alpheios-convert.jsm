/**
 * @fileoverview This module defines text conversion utility functions.   
 * Exports a single symbol, Convert, which must be imported into the namespace 
 * of the importing class.
 *
 * @version $Id$
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
 
const EXPORTED_SYMBOLS = ['Convert'];
Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");

/**
 * @class text conversion utility functions 
 */
Convert = {
    
    /**
     * UnicodeConverter service
     * @static
     */
    d_uConverter: BrowserUtils.getSvc('UnicodeConverter'),
    
    /**
     * main logger for the Convert object
     * @type Log4Moz.Logger
     * @static
     */
    s_logger: BrowserUtils.getLogger('Alpheios.Convert'), 
    
    /**
     * bind a new method to the Convert object
     * Note - method code must NOT reference the Alph namespace 
     * as this object is shared across windows
     * @param {String} the name of the method
     * @param {Function} the function body
     */
    bind: function(a_name,a_func)
    {
        this[a_name] = a_func;
    },
    
}