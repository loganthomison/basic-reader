/**
 * @fileoverview About dialog funcitons
 * @version $Id: alpheios-about.js 746 2009-02-06 15:20:09Z BridgetAlmas $
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
  * @singleton
  */
 Alph.about =
 {
    load_about: function()
    {
        var pkgs = Alph.util.getAlpheiosPackages();
        pkgs.forEach(
            function(a_item)
            {
                var box = Alph.util.makeXUL('hbox',[],[]);
                var name = Alph.util.makeXUL('label',null,['crop'],['right']);               
                Alph.$(name).text(a_item.name);
                var version = Alph.util.makeXUL('description',null,[],[]);
                Alph.$(version).text(a_item.version);
                Alph.$(box).append(name);
                Alph.$(box).append(version);
                Alph.$("#alpheios-extension-list").append(box);
            }
        );
    }
 };
