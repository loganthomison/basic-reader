/**
 * @fileoverview This file contains the Alph.Morph derivation of the Alph.Panel class. 
 * Representation of the morphology panel.
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

/**
 * Intialization method which can be used for panel-specific initialization 
 * code.
 * @private
 */
Alph.Morph.prototype.init = function(a_panel_state)
{
    Alph.util.log("morph panel init");
    // initialize the contents array
    a_panel_state.contents = [];
    a_panel_state.css = [];
    this.reset_contents(a_panel_state);
};


/**
 * Morph panel specific implementation of 
 * {@link Alph.Panel#reset_contents}
 * Refreshes the contents of the alph-window div and the css stylesheet
 * links as appropriate per the state of the current browser
 * @param {Object} a_panel_state the current panel state
 */
Alph.Morph.prototype.reset_contents = function(a_panel_state)
{
    Alph.$("browser",this.panel_elem).each( 
        function(i) 
        {
            var morph_doc = this.contentDocument;
            if (a_panel_state.contents.length < i + 1 )
            {
                // if we haven't the initialized the contents of this browser for
                // the panel, get a new div for it and a copy of the default stylesheet links
                var main_div = 
                    morph_doc.createElementNS("http://www.w3.org/1999/xhtml","div");
                main_div.setAttribute("id", "alph-window");
                a_panel_state.contents[i] = main_div;
                a_panel_state.css[i] = Alph.$("link[rel=stylesheet]",morph_doc).clone();
            }
            Alph.util.log("Found in morph panel: " + Alph.$("#alph-window",morph_doc).length);
            Alph.$("#alph-window",morph_doc).remove();
            Alph.$("body",morph_doc).append(a_panel_state.contents[i]);
            Alph.$("link[rel=stylesheet]",morph_doc).remove();
            Alph.$("head",morph_doc).append(a_panel_state.css[i]);
            
            Alph.util.log("Replaced in morph panel: " + Alph.$("#alph-window",morph_doc).length); 
        }
    );
};

/**
 * Morph panel specific implementation of 
 * {@link Alph.Panel#observe_ui_event}
 * Stores the contents of the alph-window div and the css stylesheet 
 * links for the current browser to the panel state object.
 * @param {Browser} a_bro the current browser
 * @param a_event_type the event type
 */

Alph.Morph.prototype.observe_ui_event = function(a_bro,a_event_type)
{
    // store the current contents of the morph window in this browser's panel state
    var panel_state = this.get_browser_state(a_bro);
     
    Alph.$("browser",this.panel_elem).each( 
        function(i) 
        {
            var morph_doc = this.contentDocument;
            panel_state.contents[i] = Alph.$("#alph-window",morph_doc).get(0);
            panel_state.css[i] = Alph.$("link[rel=stylesheet]",morph_doc).clone();
 
        }
    );
}