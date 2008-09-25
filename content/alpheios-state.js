/**
 * @fileoverview This file contains the definition of the prototype for an 
 * Alpheios state object. (Alph.State);

 * @version $Id: alpheios-state.js 846 2008-07-18 13:13:32Z BridgetAlmas $
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
 
 
/**
 * @class Alph.State defines the prototype object for holding the State of the 
 * Alpheios extension.
 * 
 * @constructor
 */
Alph.State = function()
{
    this._defaults = 
    {   enabled: [false,true],
        toggled_by: [Alph.State.SYS_ACTION,true],
        windows: [{}, true],
        panels: [{}, true],
        xlate_trigger: [null,true],
        current_language: ["",true],
        lastElem: [null,false],
        lastSelection: [null,false],
        lastWord: [null,false],
        word: [null,false] // TODO - these last two should be merged?
    };
    
    for (var name in this._defaults)
    {
       this.reset_to_default(name);
    }
};

    
/**
 * static class variable for identifying state change by the system 
 * @public
 * @type int
 */
Alph.State.SYS_ACTION = 1;
    
/**
 * static class variable for identifying state change by the user 
 * @public
 * @type int
 */
Alph.State.USER_ACTION = 2;

Alph.State.prototype.reset_to_default = function(a_name)
{
    this.set_var(a_name,this._defaults[a_name][0]);  
};

Alph.State.prototype.persist = function(a_name)
{
    return this._defaults[a_name][1];  
};

/**
 * Get a state variable
 * @param {String} a_name the name of the variable
 * @return the value or null if the variable wasn't found
 * @throws an Error if the variable hasn't been declared
 */

Alph.State.prototype.get_var = function(a_name)
{
    if (typeof this._defaults[a_name] != "undefined" )
    {
        return this[a_name];
    }
    else
    {
        throw new Error("Attempt to retrieve undeclared state variable: " + a_name);
    }
};

/**
 * Set a state variable
 * @param {String} a_name the name of the variable
 * @param a_value the value to set for the variable
 * @throws an Error if the variable hasn't been declared
 */
Alph.State.prototype.set_var = function(a_name,a_value)
{
    if (typeof this._defaults != "undefined")
    {
        this[a_name] = a_value;
    }
    else
    {
        throw new Error("Attempt to set undeclared state variable: " + a_name);
    }
};

/**
 * Resets the state to represent the disabled status 
 */
Alph.State.prototype.set_disabled = function()
{
    this.enabled = false;
    
    // clear all the temporary state
    for (var name in this._defaults)
    {
        if (! this.persist(name))
        {
            this.reset_to_default(name);                    
        }
    }
};


