/**
 * @fileoverview This file contains the Alph.Morph derivation of the Alph.Panel class. 
 * Representation of the morphology panel.
 * 
 * @version $Id: alpheios-morph.js 798 2008-06-20 20:42:04Z BridgetAlmas $
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
 * @class The Alph.Morph class is the representation of the morphology
 * panel.
 * @constructor
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 * @see Alph.Panel
 */
Alph.Morph = function(a_panel)
{
    Alph.Panel.call(this,a_panel);
};
    
/**
 * @ignore
 */
Alph.Morph.prototype = new Alph.Panel();


// TODO - override show to show browser-specific morph info (currently shared) 