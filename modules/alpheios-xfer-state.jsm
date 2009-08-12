/**
 * @fileoverview This module is used for storing Alpheios state variables which
 * must be shared by all browsers and windows.
 * @version $Id: $
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
 * This module exports a single symbol, XFRState.
 * This object should be imported into the namespace of the importing class
 */
var EXPORTED_SYMBOLS = ["XFRState"];

/**
 * @singleton
 */
XFRState =
{
    /**
     * private variable to hold the state objects
     */
    d_stateRequests : {},
    
    /**
     * retrieve the stored variable from the state object
     * @param {int} a_guid the unique identifer representing the requested state object
     * @param {String} a_name the name of the variable wanted from the state object
     * @return the requested value or null if either the state object or 
     *         the variable requested from the state object doesn't exist
     */
    getStateValue: function(a_guid,a_name)
    {
        var request = this.getStateRequest(a_guid);
        var value =  null;
        if (request)
        {
            var obj = this.d_stateRequests[a_guid][a_name]
            if (typeof obj != "undefined")
            {
                value = obj.value;
                if (obj.single_use)
                {
                    delete this.d_stateRequests[a_guid][a_name];
                }
            }
        }
        return value;
    },
    
    /**
     * Create a new state request object
     * @param {String} a_name the name of a variable to store in the object
     * @param {Object} a_value the value to store
     * @param {Boolean} a_single_use flag to indicate the variable is a single-use object
     * @return the unique identifier for the new state object
     * @type int 
     */
    newStateRequest: function(a_name,a_value,a_single_use)
    {
        var guid = (new Date()).getTime() + Math.floor(Math.random()* 100000000);
        this.d_stateRequests[guid] = {};
        this.addToStateRequest(guid,a_name,a_value,a_single_use);
        return guid;
    },
    
    /**
     * Add a name/value pair to an existing state object
     * @param {int} a_guid the unique identifier for the object
     * @param {String} a_name the name of the variable to store
     * @param {Object} a_value the value to store
     * @param {Boolean} a_single_use flag to indicate the variable is a single-use object
     */
    addToStateRequest: function(a_guid,a_name,a_value,a_single_use)
    {
        var request = this.getStateRequest(a_guid);
        if (request)
        {
            // default is for variables not to be single-use 
            if (typeof a_single_use == "undefined")
            {
                a_single_use = false;
            }
            request[a_name] = 
                    { value: a_value,
                      single_use: a_single_use };
        }
        else
        {
            throw new Error("No state request object for " + a_guid);
        }
    },
    
    /**
     * get an existing state object
     * @param {int} a_guid the unique identifer for the state object
     * @return the state object, or null if it doesn't exist
     * @type Object
     */
    getStateRequest: function(a_guid)
    {
       var request = this.d_stateRequests[a_guid] 
       if (typeof  request == "undefined")
       {
            request = null;
       }
       return request;
    }
    
}