/**
 * @fileoverview This file contains the definition of the prototype for an 
 * Alpheios state object. (Alph.State);

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
 
 
/**
 * @class Alph.State defines the prototype object for holding the State of the 
 * Alpheios extension.
 * 
 * @constructor
 */
Alph.State = function()
{
    /**
     * default values are in the format [ <default value>, <persist boolean> ]
     */
    this.d_defaults = 
    {   enabled: [false,true],
        toggled_by: [Alph.State.SYS_ACTION,true],
        windows: [{}, true],
        panels: [{}, true],
        xlate_trigger: [null,true],
        current_language: ["",true],
        lastElem: [null,false],
        lastSelection: [null,false],
        lastWord: [null,false],
        word: [null,false], // TODO - these last two should be merged?,
        level: ['reader',false]
    };
    
    for (var name in this.d_defaults)
    {
       this.resetToDefault(name);
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

Alph.State.prototype.resetToDefault = function(a_name)
{
    this.setVar(a_name,this.d_defaults[a_name][0]);  
};

Alph.State.prototype.persist = function(a_name)
{
    return this.d_defaults[a_name][1];  
};

/**
 * Get a state variable
 * @param {String} a_name the name of the variable
 * @returns the value or null if the variable wasn't found
 * @throws an Error if the variable hasn't been declared
 */

Alph.State.prototype.getVar = function(a_name)
{
    if (typeof this.d_defaults[a_name] != "undefined" )
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
Alph.State.prototype.setVar = function(a_name,a_value)
{
    if (typeof this.d_defaults != "undefined")
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
Alph.State.prototype.setDisabled = function()
{
    this.enabled = false;
    
    // clear all the temporary state
    for (var name in this.d_defaults)
    {
        if (! this.persist(name))
        {
            this.resetToDefault(name);                    
        }
    }
};


