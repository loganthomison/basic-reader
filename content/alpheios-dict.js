/**
 * @fileoverview This file contains the Alph.Dict derivation of the Alph.Panel class. 
 * Representation of the dictionary definition panel.
 * 
 * @version $Id$
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
 * @class The Alph.Dict class is the representation of the dictionary definition
 * panel.
 * @constructor
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 * @see Alph.Panel
 */
Alph.Dict = function(a_panel)
{
    Alph.Panel.call(this,a_panel);
};
    
/**
 * @ignore
 */
Alph.Dict.prototype = new Alph.Panel();

/**
 * Intialization method which can be used for panel-specific initialization 
 * code.
 * @private
 */
Alph.Dict.prototype.init = function(a_panel_state)
{
    Alph.util.log("dict panel init");
    // initialize the contents and css objects
    // these are objects rather than arryas so that 
    // we can have different state per named dictionary if appropriate
    // (i.e. if we end up having a tab per dictionary)
    a_panel_state.contents = {};
    a_panel_state.css = {};
    this.reset_contents(a_panel_state);
    
};


/**
 * Dict panel specific implementation of 
 * {@link Alph.Panel#reset_contents}
 * Refreshes the contents of the alph-window div and the css stylesheet
 * links as appropriate per the state of the current browser
 * @param {Object} a_panel_state the current panel state
 */
Alph.Dict.prototype.reset_contents = function(a_panel_state)
{
    var panel_obj = this;
    Alph.$("browser",this.panel_elem).each( 
        function(i) 
        {
            var doc = this.contentDocument;
            var id = this.id;
            var doc_state = 
                panel_obj.init_document(
                    doc,
                    { contents: a_panel_state.contents[id],
                      css: a_panel_state.css[id]
                    });
            // store the current contents/css to the state object, 
            // if this browser's state hasn't been initialized yet
            if (typeof a_panel_state.contents[id] == "undefined")
            {
                a_panel_state.contents[id] = Alph.$(doc_state.contents).clone();
                a_panel_state.css[id] = Alph.$(doc_state.css).clone();
            }
            panel_obj.update_panel_window(a_panel_state,id);
        }
    );
};

/**
 * Dictionary panel specific implementation of 
 * {@link Alph.Panel#show} - makes sure the 
 * browser document has been initialized 
 * @return the new panel status
 * @type int
 */
Alph.Dict.prototype.show = function()
{
    var panel_obj = this;
    var bro = Alph.main.getCurrentBrowser();
    var panel_state = this.get_browser_state(bro);
    // if the panel is detached, refresh the contents of the detached panel
    // with the state from the real panel
    if (this.panel_window != null)
    {
        this.panel_window.Alph.$("#" + this.panel_id + " browser").each(
            function(i)
            {
                var doc = this.contentDocument;
                var id = this.id;
                if (panel_obj.panel_window.Alph.$("#alph-window",doc).length == 0)
                {
                    panel_obj.init_document(doc,{ contents: panel_state.contents[id],
                                                  css: panel_state.css[id]
                                                 });
                }
            }
        );
    }
    return Alph.Panel.STATUS_SHOW;
};

/**
 * Dict panel specific implementation of 
 * {@link Alph.Panel#observe_ui_event}
 * Stores the contents of the alph-window div and the css stylesheet 
 * links for the current browser to the panel state object.
 * @param {Browser} a_bro the current browser
 */

Alph.Dict.prototype.observe_ui_event = function(a_bro)
{
    var panel_obj = this;
    var panel_state = this.get_browser_state(a_bro);
    var language_tool = Alph.main.getLanguageTool();
    
    // we should always have a language_tool here, but 
    // if not just do nothing and return quietly
    if (typeof language_tool == "undefined")
    {
        return;
    }
    
    // get a callback to the current dictionary
    var dictionary_callback = language_tool.get_dictionary_callback();

    // for now the dictionary panel has only a single browser but
    // we may eventually want to implement this as a tabbed browser
    // with one tab/browser per dictionary for multiple dictionaries
    var bro_id = 'alph-dict-body';
    var dict_bro = Alph.$("browser#" + bro_id,this.panel_elem).get(0);
    var doc = dict_bro.contentDocument;

    // if the dictionary browser has the class "alph-lexicon-output" 
    // the alph-window element in its content document will be updated 
    // with the output of the morphology lookup for the currently selected
    // word by Alph.xlate.showTranslation 
    var alph_window = Alph.$("#alph-window",doc).get(0);
    
    // remove any prior dictionary entries from the lexicon display
    Alph.$(".alph-dict-block",doc).remove();
    
    if (typeof dictionary_callback != 'function')
    {
        
        // if we don't have any callback defined for this language,
        // just display the short definition in the alph-window
        // and update the panel state        
        Alph.$(alph_window).addClass("default-dict-display");
        Alph.$(alph_window).removeClass("full-dict-display");
        Alph.util.log("No dictionary defined " + dictionary_callback);
        panel_state.contents[bro_id] = Alph.$("#alph-window",doc).get(0);
        panel_state.css[bro_id] = Alph.$("link[rel=stylesheet]",doc).clone();
        panel_obj.update_panel_window(panel_state,bro_id);
        return;
    }

    
    // we have a dictionary callback method, so pull the lemmas out of the 
    // alph-window lexicon element and pass them to the callback to get
    // the dictionary html. Also pass references to callback methods which
    // will populate the panel obj with the dictionary output
    var lemmas = []; 
    Alph.$(".alph-dict",alph_window).each(
        function()
        {
            var lemma = this.getAttribute("key");
            if (lemma)
            {
                lemmas.push(lemma);
            }
        }
    );
            
    
    try
    {
        dictionary_callback(
            lemmas,
            function(a_data)
            {
                panel_obj.display_dictionary(
                    a_bro,doc,a_data,lemmas);
            },
            function(a_error)
            {
                panel_obj.display_dictionary(
                    a_bro,doc,a_error,lemmas);
            }
        );
    }
    catch(a_e)
    {
        Alph.util.log(
            "Error calling dictionary: " + a_e);   
    }

};

/**
 * Update the dictionary panel content with the results of a lemma lookup
 * @param {Browser} a_bro the panel browser element
 * @param {Document} a_doc the content document in the panel browser
 * @param {Element} a_html the HTML to be added to the content document
 * @param {Array} a_lemmas the list of lemmas that supplied to the lookup
 */
Alph.Dict.prototype.display_dictionary = function(
    a_bro,
    a_doc,
    a_html,
    a_lemmas
)
{
    var alph_window = Alph.$("#alph-window",a_doc);
 
    var bro_id = 'alph-dict-body';
      
    Alph.$(alph_window).append(a_html);
    
    // add the alph-dict-block class to each distinct lemma block 
    // identified in the supplied output 
    a_lemmas.forEach(
        function(a_lemma)
        {
            Alph.$("div[key='"+a_lemma+"']",alph_window).addClass('alph-dict-block');
        }
    );
    
    // the class default-dict-display shows just the short definition elements
    // from the morphology ouput
    // the class full-dict-display hides the short definition elements and
    // shows the alph-dict-blocks (and their contents) only
    Alph.$(alph_window).removeClass("default-dict-display");
    Alph.$(alph_window).addClass("full-dict-display");

    // update the panel state with the new contents of the panel
    var panel_state = this.get_browser_state(a_bro);
    panel_state.contents[bro_id] = 
        Alph.$("#alph-window",a_doc).clone();
    panel_state.css[bro_id] = 
        Alph.$("link[rel=stylesheet]",a_doc).clone();

    this.update_panel_window(panel_state,bro_id);            
};

/**
 * Update a browser in the detached panel window with the current 
 * state of that browser the real (attached) panel
 * @param {Object} a_panel_state the panel state object
 * @param {String} a_browser_id the id of the browser to update
 */
Alph.Dict.prototype.update_panel_window = function(a_panel_state,a_browser_id)
{
    if (this.panel_window != null)
    {        
        var pw_bro = 
            this.panel_window
                .Alph.$("#" + this.panel_id + " browser#"+a_browser_id)
                .get(0);
        var pw_doc = pw_bro.contentDocument;
        this.init_document(pw_doc,{ contents: a_panel_state.contents[a_browser_id],
                                    css: a_panel_state.css[a_browser_id]
                                  }
                          );
    }                          
};

/**
 * Intialize the content document of a panel browser element
 * @param {Document} a_doc the content document
 * @param {Object} a_doc_state the state object for this browser. If not supplied
 *                 a new state object will be created
 * @return {Object} the state object for this browser 
 */
Alph.Dict.prototype.init_document = function(a_doc,a_doc_state)
{
    
    // if we haven't the initialized the contents of this browser for
    // the panel, get a new div for it and a copy of the default stylesheet links
    
    if (typeof a_doc_state.contents == "undefined")
    {
        Alph.util.log("initializing dictionary document");
        a_doc_state = { css: null, contents: null };
        a_doc_state.contents = 
            a_doc.createElementNS("http://www.w3.org/1999/xhtml","div");
        a_doc_state.contents.setAttribute("id", "alph-window");
        a_doc_state.contents.setAttribute("class", "full-dict-display");
        a_doc_state.css = 
            a_doc.createElementNS("http://www.w3.org/1999/xhtml","link");                
        a_doc_state.css.setAttribute("rel", "stylesheet");
        a_doc_state.css.setAttribute("type", "text/css");
        a_doc_state.css.setAttribute("href", "chrome://alpheios/skin/alph-dict.css");
        a_doc_state.css.setAttribute("id", "alpheios-dict-css");
        
    }
    Alph.$("#alph-panel-body-template",a_doc).html("");
    Alph.$("#alph-window",a_doc).remove();
    Alph.$("body",a_doc).append(Alph.$(a_doc_state.contents).clone());
    Alph.$("link[rel=stylesheet]",a_doc).remove();
    Alph.$("head",a_doc).append(Alph.$(a_doc_state.css).clone());
    return a_doc_state;
}

/**
 * Dictionary panel specific implementation of 
 * {@link Alph.Panel#get_detach_chrome}
 * @return the chrome url as a string
 * @type String
 */
Alph.Dict.prototype.get_detach_chrome = function()
{
    return 'chrome://alpheios/content/alpheios-dict-window.xul';   
}