/**
 * @fileoverview This file contains the Alph.Dict derivation of the Alph.Panel class.
 * Representation of the dictionary definition panel.
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
    a_panel_state.dicts = {};

    // pointer to last XHR issued in this panel for the browser
    a_panel_state.last_request = null;
    this.reset_contents(a_panel_state);


};


/**
 * Dict panel specific implementation of
 * {@link Alph.Panel#reset_contents}
 * Refreshes the contents of the alph-window div and the css stylesheet
 * links as appropriate per the state of the current browser
 * @param {Object} a_panel_state the current panel state
 * @param {Object} a_old state (optional) - the prior panel state
 */
Alph.Dict.prototype.reset_contents = function(a_panel_state,a_old_state)
{

    // if the state was request while a request was pending
    // flag the request as interrupted
    // TODO - this is not a great implementation as it doesn't
    // handle multiple queued requests
    if (typeof a_old_state != "undefined" &&
        a_old_state.last_request != null && a_old_state.last_request.pending)
    {
        Alph.util.log("interrupting dictionary request");
        a_old_state.last_request.interrupted = true;
    }

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
                      css: a_panel_state.css[id],
                      dict: a_panel_state.dicts[id]
                    });
            // store the current contents/css to the state object,
            // if this browser's state hasn't been initialized yet
            if (typeof a_panel_state.contents[id] == "undefined")
            {
                a_panel_state.contents[id] = Alph.$(doc_state.contents).clone();
                a_panel_state.css[id] = Alph.$(doc_state.css).clone();
                a_panel_state.dicts[id] = doc_state.dict;

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
    // update the browse command for the current dictionary
    Alph.Dict.update_dict_browse_cmd();

    var bro = Alph.main.getCurrentBrowser();
    
    // we need to update the contents of the panel window here
    // to make sure the window contains the latest contents from the
    // real panel. The window calls the show method upon load.
    if (this.panel_window != null)
    {
        var panel_state = this.get_browser_state(bro);
        // update each of the browsers in the panel window
        Alph.$("#" + this.panel_id + " browser").each(
            function(a_i)
            {
                var bro_id = this.id;
                panel_obj.update_panel_window(panel_state,bro_id,a_i);
            }
        );
        
        // focus the panel window if present
        this.panel_window.focus();
    }
    return Alph.Panel.STATUS_SHOW;
};

/**
 * Dict panel specific implementation of
 * {@link Alph.Panel#observe_ui_event}
 * Stores the contents of the alph-window div and the css stylesheet
 * links for the current browser to the panel state object.
 * @param {Browser} a_bro the current browser
 * @param a_event_type the event type
 * @param a_event_data optional event data object
 */
Alph.Dict.prototype.observe_ui_event = function(a_bro,a_event_type,a_event_data)
{
    var panel_obj = this;
    var panel_state = this.get_browser_state(a_bro);

    // handle change to the dictionary preferences
    var new_dict = false;
    if (a_event_type == Alph.main.events.UPDATE_PREF &&
        a_event_data.name.indexOf('dictionaries.full.default') != -1)
    {
        
        new_dict = true;
        // close/hide the panel if it's open and we're switching
        // to no full defs
        if (a_event_data.value == null || a_event_data.value == '')
        {
            this.update_status(this.hide());
            return;
        }
        // otherwise make sure the browse command is updated
        else
        {
            Alph.Dict.update_dict_browse_cmd();    
        }
    }

    // if a dictionary link was clicked and the panel/window isn't open
    // then open it. If the panel is detached, the onload handler for the window
    // will result in observe_ui_event being called again with the LOAD_DICT_WINDOW
    // event to do the actual lookup. If the panel is inline, then the update_status 
    // call will come in without an event. Both situations are handled below.
    if ((a_event_type == Alph.main.events.SHOW_DICT)  && 
        (panel_state.status == Alph.Panel.STATUS_HIDE))
    {
        this.open();
        return;
    }
    // proceed with observing the event and doing the 
    // the dictionary lookup only if one or more
    // of the following conditions is met:
    // - panel is being detached for the first time (LOAD_DICT_WINDOW event)
    // - dictionary link is clicked (SHOW_DICT event)
    // - this method has been called from a change in panel status, in which
    //   case the event type will be undefined
    // - the panel or window is visible AND we're switching to a new dictionary
    var do_lookup = 
       (  a_event_type == Alph.main.events.LOAD_DICT_WINDOW ||
          a_event_type == Alph.main.events.SHOW_DICT ||
          typeof a_event_type == "undefined" ||
         ((panel_state.status == Alph.Panel.STATUS_SHOW) && new_dict )  
       );
    if (! do_lookup )
    {
        return;
    }
    
    var language_tool = Alph.main.getLanguageTool(a_bro);
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

    // remove any prior dictionary entries or loading messages
    // from the lexicon display
    Alph.$(".loading",doc).remove();
    Alph.$(".alph-dict-block",doc).remove();

    var panel_state = this.get_browser_state(a_bro);

    // pull the new lemmas out of the alph-window lexicon element
    var lemmas = [];
    Alph.$(".alph-dict",alph_window).each(
        function()
        {
            var lemma = this.getAttribute("lemma-key");
            var lemma_id = this.getAttribute("lemma-id");
            var lemma_lang = this.getAttribute("lemma-lang");
            var lemma_lex = this.getAttribute("lemma-lex");
            if (lemma || lemma_id)
            {
                // lemma may have multiple values, so split
                var lemset = lemma.split(' ');
                for (var i in lemset)
                    lemmas.push([lemma_id, lemset[i], lemma_lang, lemma_lex]);
            }
        }
    );

    // don't do anything other than updating the state
    // if we don't have any lemmas
    if (lemmas.length > 0)
    {
        if (typeof dictionary_callback != 'function')
        {
            // if we don't have any callback defined for this language,
            // just display the short definition in the alph-window
            Alph.$(alph_window).addClass("default-dict-display");
            Alph.$(alph_window).removeClass("full-dict-display");
            // remove any dictionary-specific stylesheets and
            // remove the dictionary name from the state
            if (panel_state.dicts[bro_id] != null)
            {
                language_tool.removeStyleSheet(doc,
                    'alpheios-dict-' + panel_state.dicts[bro_id]);
                panel_state.dicts[bro_id] = null;
            }
            Alph.util.log("No dictionary defined " + dictionary_callback);
        }
        else
        {
            // we have a dictionary callback method, so pass the lemmas
            // to the callback to get the dictionary html.
            // Also pass references to callback methods which
            // will populate the panel obj with the dictionary output

            // but first add a loading message
            Alph.$(alph_window).append(
                    "<div id='alph-dict-loading' class='loading'>"
                    + Alph.$("#alpheios-strings").get(0)
                          .getFormattedString("alph-searching-dictionary",
                            [Alph.$.map(lemmas,function(a){return a[1]}).join(', ')])
                    + "</div>");

            var request = { pending: true };
            try
            {
                // if we still have a request pending, flag
                // it as interrupted
                if (panel_state.last_request != null &&
                    panel_state.last_request.pending)
                {
                        panel_state.last_request.interrupted = true;
                }
                panel_state.last_request = request;
                dictionary_callback(
                    lemmas,
                    function(a_data,a_dict_name)
                    {
                        panel_obj.display_dictionary(
                            language_tool,a_bro,doc,a_data,lemmas,a_dict_name,request);
                    },
                    function(a_error,a_dict_name)
                    {
                        var err_str = '<div class="error">' +
                                      a_error +
                                      '</div>';
                        panel_obj.display_dictionary(
                            language_tool,a_bro,doc,err_str,lemmas,a_dict_name,request);
                    },
                    function ()
                    {
                        request.pending = false;
                        Alph.util.log("Request complete: " + lemmas.join(', '));
                    }
                );

            }
            catch(a_e)
            {
                request.pending = false;
                Alph.util.log(
                    "Error calling dictionary: " + a_e);
            }
        }
    }
    // update the panel state with the new contents of the panel
    panel_state.contents[bro_id] =
        Alph.$("#alph-window",doc).clone();
    panel_state.css[bro_id] =
        Alph.$("link[rel=stylesheet]",doc).clone();

    this.update_panel_window(panel_state,bro_id);
};

/**
 * Update the dictionary panel content with the results of a lemma lookup
 * @param {Alph.LanguageTool} a_lang_tool the language tool which
 *                            produced the lookup
 * @param {Browser} a_bro the panel browser element
 * @param {Document} a_doc the content document in the panel browser
 * @param {Element} a_html the HTML to be added to the content document
 * @param {Array} a_lemmas the list of lemmas that supplied to the lookup
 * @param String a_dict_name the name of the dictionary used
 * @param {Object} a_request state object for the total request (all lemmas)
 */
Alph.Dict.prototype.display_dictionary = function(
    a_lang_tool,
    a_bro,
    a_doc,
    a_html,
    a_lemmas,
    a_dict_name,
    a_request
)
{

    var alph_window = Alph.$("#alph-window",a_doc);

    var bro_id = 'alph-dict-body';

    var panel_state = this.get_browser_state(a_bro);

    // make sure we didn't switch tabs while waiting for the response
    if (! a_request.interrupted)
    {
        // remove the loading message
        Alph.$("#alph-dict-loading",alph_window).remove();


        // if we have a different dictionary than last time, remove the
        // old stylesheet
        if (panel_state.dicts[bro_id] != null &&
            panel_state.dicts[bro_id] != a_dict_name)
        {
            a_lang_tool.removeStyleSheet(a_doc,
                'alpheios-dict-' + panel_state.dicts[bro_id]);
        }
        // add the correct dictionary stylesheet if we haven't already
        a_lang_tool.addStyleSheet(a_doc,'alpheios-dict-' + a_dict_name);

        // add an alph-dict-block around the response
        a_html = '<div class="alph-dict-block">' + a_html + '</div>';

        Alph.$(alph_window).append(a_html);

        // the class default-dict-display shows just the short definition elements
        // from the morphology ouput
        // the class full-dict-display hides the short definition elements and
        // shows the alph-dict-blocks (and their contents) only
        Alph.$(alph_window).removeClass("default-dict-display");
        Alph.$(alph_window).addClass("full-dict-display");

        // update the panel state with the new contents of the panel

        panel_state.contents[bro_id] =
            Alph.$("#alph-window",a_doc).clone();
        panel_state.css[bro_id] =
            Alph.$("link[rel=stylesheet]",a_doc).clone();
        panel_state.dicts[bro_id] = a_dict_name;

        this.update_panel_window(panel_state,bro_id);
    }
    else
    {
        // it's not entirely clear what we should do if
        // the user switched tabs or otherwise reset the state
        // while we were waiting for the results
        //alert("Interrupted dictionary requested returned: " + a_html);
        Alph.util.log("State reset while waiting for dictionary");
    }


};

/**
 * Dictionary panel specific implementation of
 * {@link Alph.Panel#update_panel_window}
 * Update a browser in the detached panel window with the current
 * state of that browser the real (attached) panel
 * @param {Object} a_panel_state the panel state object
 * @param {String} a_browser_id the id of the browser to update
 * @param {String} a_browser_index the index of the browser to update
 */
Alph.Dict.prototype.update_panel_window =
    function(a_panel_state,a_browser_id,a_browser_index)
{
    if (this.panel_window != null && ! this.panel_window.closed)
    {
        try
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
                                            dict: a_panel_state.dicts[a_browser_id]
                                          }
                                  );
                this.panel_window.focus();
            }
         } catch(a_e)
         {
            // if the window opens but isn't fully loaded yet, we may get
            // an error trying to retrieve the browser document using the Alph.$ call
         }
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
        a_doc_state.dict = null;

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
};

/**
 * Switch the current dictionary
 * (static method as it's invoked from the panel menu)
 * @param {Event} a_ the event which triggered the request
 * @param {String} a_panel_id the id of the originating panel
 */
Alph.Dict.switch_dictionary = function(a_event,a_panel_id)
{
    var menuitem = a_event.explicitOriginalTarget;
    try
    {
        var dict_name = menuitem.getAttribute('id')
                                .match(/^alpheios-dict-(.+)$/)[1];
        if (dict_name == null || dict_name == 'none')
        {
            dict_name = '';
        }
        // calling setDictionary updates the preference
        // which results in a PREF_CHANGE event being broadcast to the 
        // panel and observed in observe_ui_event
        Alph.main.getLanguageTool(a_bro).setDictionary(dict_name);            
    }
    catch(a_e)
    {
        Alph.util.log("Error switching dictionary: " + a_e);
    }

}

/**
 * Update the dictionary menu for the current dictionary
 * @param {a_menu}
 */
Alph.Dict.update_dict_menu = function(a_menu)
{
    var dict_name = Alph.main.getLanguageTool().getDictionary();
    if (dict_name == null)
    {
        dict_name = 'none';

    }
    Alph.$('menuitem#alpheios-dict-'+dict_name,a_menu).attr('checked','true');
};

/**
 * Update the dictionary browse command for the current dictionary
 */
Alph.Dict.update_dict_browse_cmd = function()
{
    // update the browse command for the current dictionary
    if (Alph.main.getLanguageTool().getDictionaryBrowseUrl() == null)
    {
        Alph.$("#alpheios-dict-browse-cmd").attr("disabled",true);
    }
    else
    {
        Alph.$("#alpheios-dict-browse-cmd").attr("disabled",false);
    }
}

/**
 * Browse the current dictionary
 * @param {Event} a_ the event which triggered the request
 * @param {String} a_panel_id the id of the originating panel
 */
Alph.Dict.browse_dictionary = function(a_event,a_panel_id)
{

    var browse_url = Alph.main.getLanguageTool().getDictionaryBrowseUrl();
    if (browse_url != null)
    {
        Alph.xlate.openSecondaryWindow(
            Alph.$("#alpheios-strings").get(0)
                          .getString("alph-dictionary-window"),
            browse_url,
            {  chrome: "no",
               dialog: "no",
               resizable: "yes",
               width: "800",
               height: "600",
               scrollbars: "yes"
            }
        );
    }
}
