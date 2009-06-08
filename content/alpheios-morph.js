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
    a_panel_state.contents = {};
    a_panel_state.css = {};
    this.reset_contents(a_panel_state);
};

/**
 * Morph panel specific implementation of
 * {@link Alph.Panel#show}
 * @return the new panel status
 * @type int
 */
Alph.Morph.prototype.show = function()
{
    var panel_obj = this;

    if (this.panel_window != null)
    {
        this.panel_window.focus();
    }
    return Alph.Panel.STATUS_SHOW;
}

/**
 * Morph panel specific implementation of 
 * {@link Alph.Panel#reset_contents}
 * Refreshes the contents of the alph-window div and the css stylesheet
 * links as appropriate per the state of the current browser
 * @param {Object} a_panel_state the current panel state
 */
Alph.Morph.prototype.reset_contents = function(a_panel_state)
{
    var panel_obj = this;
    Alph.$("browser",this.panel_elem).each(
        function()
        {
            var doc = this.contentDocument;
            var id = this.id;
            var doc_state =
                panel_obj.init_document(
                    doc,
                    { contents: a_panel_state.contents[id],
                      css: a_panel_state.css[id],
                    });
            // store the current contents/css to the state object,
            // if this browser's state hasn't been initialized yet
            if (typeof a_panel_state.contents[id] == "undefined")
            {
                a_panel_state.contents[id] = Alph.$(doc_state.contents).clone(true);
                a_panel_state.css[id] = Alph.$(doc_state.css).clone();
            }
            panel_obj.update_panel_window(a_panel_state,id);
        }
    );    
};

/**
 * Intialize the content document of a panel browser element
 * @param {Document} a_doc the content document
 * @param {Object} a_doc_state the state object for this browser. If not supplied
 *                 a new state object will be created
 * @return {Object} the state object for this browser
 */
Alph.Morph.prototype.init_document = function(a_doc,a_doc_state)
{
    // if we haven't the initialized the contents of this browser for
    // the panel, get a new div for it and a copy of the default stylesheet links
    if (typeof a_doc_state.contents == "undefined")
    {
        // if we haven't the initialized the contents of this browser for
        // the panel, get a new div for it and a copy of the default stylesheet links
        var main_div = 
            a_doc.createElementNS("http://www.w3.org/1999/xhtml","div");
        main_div.setAttribute("id", "alph-window");
        main_div.setAttribute("class", "alpheios-ignore");
        a_doc_state.contents = main_div;
        a_doc_state.css = Alph.$("link[rel=stylesheet]",a_doc).clone();
    }
    Alph.$("#alph-window",a_doc).remove();
    Alph.$("body",a_doc).append(Alph.$(a_doc_state.contents).clone(true));
    Alph.$("link[rel=stylesheet]",a_doc).remove();
    Alph.$("head",a_doc).append(Alph.$(a_doc_state.css).clone());
    return a_doc_state;
}

/**
 * Morph panel specific implementation of
 * {@link Alph.Panel#update_panel_window}
 * Update a browser in the detached panel window with the current
 * state of that browser the real (attached) panel
 * @param {Object} a_panel_state the panel state object
 * @param {String} a_browser_id the id of the browser to update
 * @param {String} a_browser_index the index of the browser to update
 */
Alph.Morph.prototype.update_panel_window =
    function(a_panel_state,a_browser_id,a_browser_index)
{
    if (this.panel_window != null && ! this.panel_window.closed)
    {
        var pw_bro =
            this.panel_window
                .Alph.$("#" + this.panel_id + " browser#"+a_browser_id)
                .get(0);
        if (pw_bro)
        {
            var pw_doc = pw_bro.contentDocument;
            this.init_document(pw_doc,{ contents: a_panel_state.contents[a_browser_id],
                                        css: a_panel_state.css[a_browser_id],
                                      }
                              );
        }
    }
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
    // only respond to events which affect the contents of the popup
    if (typeof a_event_type == "undefined"
        ||
        (a_event_type != Alph.main.events.SHOW_TRANS && 
         a_event_type != Alph.main.events.HIDE_POPUP &&
         a_event_type != Alph.main.events.SHOW_POPUP))
    {
        return;
    }
    var panel_obj = this;
    // store the current contents of the morph window in this browser's panel state
    var panel_state = this.get_browser_state(a_bro);
     
    Alph.$("browser",this.panel_elem).each( 
        function(i) 
        {
            var morph_doc = this.contentDocument;
            panel_state.contents[this.id] = Alph.$("#alph-window",morph_doc).clone(true);
            panel_state.css[this.id] = Alph.$("link[rel=stylesheet]",morph_doc).clone();
            panel_obj.update_panel_window(panel_state,this.id);
        }
    );
    
}

/**
 * Morph panel specific implementation of
 * {@link Alph.Panel#get_detach_chrome}
 * @return the chrome url as a string
 * @type String
 */
Alph.Morph.prototype.get_detach_chrome = function()
{
    return 'chrome://alpheios/content/alpheios-morph-window.xul';
};


/**
 * Morph panel specific implementation of
 * {@link Alph.Panel#get_current_language}
 * @param {Browser} a_panel_bro the panel browser we want the language for 
 * @return the language used to create the contents of the supplied panel browser 
 * @type String
 */
Alph.Morph.prototype.get_current_language = function(a_panel_bro)
{
    var pw_doc = a_panel_bro.contentDocument;
    var lang = null;
    if (this.panel_window != null)
    {
        lang = this.panel_window.Alph.$("#alph-text",pw_doc).attr('alph-lang');
    }
    else 
    {
        lang = Alph.$("#alph-text",pw_doc).attr('alph-lang');
    }
    return lang;
}
