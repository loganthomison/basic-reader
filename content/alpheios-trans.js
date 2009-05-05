/**
 * @fileoverview This file contains the Alph.Translation class derivation of the 
 * Alph.Panel. Representation of the translation panel.
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
 * @class The Alph.Translation class is the representation of the translation
 * panel.
 * @constructor
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 * @see Alph.Panel
 */
Alph.Translation = function(a_panel)
{
    Alph.Panel.call(this,a_panel);
    // override the main DOMContentLoaded listener for the browser
    //Alph.$("#alph-trans-panel-external browser",this.panel_elem).get(0).
    //        addEventListener("DOMContentLoaded", function(e) { e.stopPropagation();} , true);

};
    
/**
 * @ignore
 */
Alph.Translation.prototype = new Alph.Panel();

/**
 * Translation panel specific implementation of 
 * {@link Alph.Panel#show}
 * @return the new panel status
 * @type int
 */
Alph.Translation.prototype.show = function()
{
    var panel_obj = this;
    var bro = Alph.main.getCurrentBrowser();
    //TODO - eventually should be able to pick the translation url
    // up from the user's preferences for the basic reader
    
    
    var trans_url = Alph.$("#alph-trans-url",bro.contentDocument);
    if (trans_url)
    {
        Alph.util.log("loading translation from " + Alph.$(trans_url).attr("url"));
        
        var trans_doc = 
                Alph.$("browser",this.panel_elem).get(0).contentDocument;
        var trans_url = Alph.$(trans_url).attr("url")  
        // jQuery can't handle a request to chrome which doesn't return expected
        // http headers --- this is a temporary hack to allow the interlinear
        // prototype to be run locally
        if (  trans_url.indexOf('chrome://') == 0 )
        {
            var r = new XMLHttpRequest();
            r.onreadystatechange = function()
            {
                if (r.readyState == 4 && r.responseText) 
                {
                    Alph.Translation.process_translation(r.responseText,bro,trans_doc);
                }
                else 
                {
                    Alph.Translation.handle_error(
                        Alph.$("#alpheios-strings").get(0).getString("alph-loading-misc")
                        ,trans_doc);
                }
            }
            r.open("GET", trans_url);
            r.send(null);
  
        }
        else
        {
            Alph.$.ajax(
                {
                    type: "GET",
                    url: trans_url,
                    dataType: 'html', 
                    error: function(req,textStatus,errorThrown)
                    {
                        Alph.Translation.handle_error(textStatus||errorThrown,trans_doc);
    
                    },
                    success: function(data, textStatus) 
                    {
                        
                        Alph.Translation.process_translation(data,bro,trans_doc);
                    } 
                }   
            );
        }
   }
   return Alph.Panel.STATUS_SHOW;
};

/**
 * Display error returned by request for translation
 */
Alph.Translation.handle_error = function(a_error,a_trans_doc)
{
    Alph.$("body",a_trans_doc).html(a_error);
}

/**
 * Populate the pedagogical panel with the translation
 */
Alph.Translation.process_translation = function(a_data,a_bro,a_trans_doc) {
    var new_doc = (new DOMParser()).parseFromString(
                            a_data,
                            "application/xhtml+xml");
    Alph.$("head",a_trans_doc).html(Alph.$("head",new_doc).contents())
    Alph.$("body",a_trans_doc).html(Alph.$("body",new_doc).contents());

    // setup the display
    Alph.site.setup_page(a_trans_doc,'trans');
                        
    var disable_interlinear = true;
    if ( (Alph.$(".alpheios-aligned-word",a_trans_doc).length > 0) &&
          Alph.util.getPref("features.alpheios-interlinear"))
    {
        disable_interlinear = false;
        
    }
    Alph.$("#alph-trans-inter-trans-status").attr("disabled",disable_interlinear);
    Alph.$("#alph-trans-inter-trans-status").attr("hidden",disable_interlinear);
    // populate the interlinear display if it's checked and enabled
    if ( ! disable_interlinear &&
        (Alph.$("#alpheios-trans-opt-inter-trans").attr('checked') == 'true')
        && ! Alph.interactive.enabled()
       )
    {
        Alph.Translation.show_interlinear();
    }
                       
}

/**
 * Translation panel specific implementation of 
 * {@link Alph.Panel#reset_contents}
 * Loads the external url per the state of the current browser
 * @param {Object} a_panel_state the current panel state
 */
Alph.Translation.prototype.reset_contents = function(a_panel_state)
{
    /**
    var url = a_panel_state.external_url;
    var current_url = 
            Alph.$("#alph-trans-panel-external browser",this.panel_elem).get(0).currentURI.spec;
    if (typeof url == "undefined")
    {
        if (current_url != "about:blank" && current_url != "")
        {   
            // no need to reload the blank page
            url = "about:blank";
        } 
    }
    if (typeof url != "undefined" && (url != current_url))
    {
        var url_bar = Alph.$("#alph-trans-ext-urlbar",this.panel_elem).get(0); 
        url_bar.value = url;
        Alph.Translation.loadUrl(null,url_bar);
    }
    **/
};

/**
 * Static helper method to toggle the display state of the interlinear
 * alignment in the source text.  This method is invoked by the command 
 * which responds to selection of the Interlinear Translation item in the
 * Options menu 
 * @param {Event} a_event the Event which initiated the action (may be null)
 */
Alph.Translation.toggle_interlinear = function(a_event)
{

    var panel = Alph.$("#alph-trans-panel");

    if (Alph.$("#alpheios-trans-opt-inter-trans").attr('checked') == 'true')
    {
        Alph.Translation.show_interlinear();
    } else {
        Alph.site.hide_interlinear(Alph.$(".alpheios-word-wrap",
            Alph.$("browser",panel).get(0).contentDocument).get());
    }
};

/**
 * Static helper method to trigger the display the interlinear alignment 
 */

Alph.Translation.show_interlinear = function()
{
    var panel = Alph.$("#alph-trans-panel");
    var browser_doc = Alph.main.getCurrentBrowser().contentDocument;
    var trans_doc =  
            Alph.$("browser",panel).get(0).contentDocument;
    
    Alph.$("#alpheios-trans-opt-inter-trans").
        parent("toolbaritem").
        addClass('alpheios-loading');
    var words = Alph.$(".alpheios-word-wrap",trans_doc).get();
    
    Alph.site.populate_interlinear(
        words,
        browser_doc,
        function(){Alph.$("#alpheios-trans-opt-inter-trans").
            parent("toolbaritem").
            removeClass('alpheios-loading'); }
    );
};

/**
 * Static helper method to load a url from a the url location bar into
 * the sibling browser.
 * @param {Event} a_event the Event which initiated the load
 * @param {Node} a_urlbar the DOM Node containing the location bar
 */
Alph.Translation.loadUrl = function(a_event,a_urlbar) {  
    if (!a_urlbar.value)
    {
        return;
    }
    // TODO - look at all the extra processing for browser page loading in browser.js 
    // and determine what, if any, of that should be supported here (e.g. auto-append of suffix,
    // auto-search for non-urls, etc)
    var browser = Alph.$(a_urlbar).siblings("browser").get(0);
    browser.loadURI(a_urlbar.value);
    
    // update the panel state with the new url
   
    try 
    {
        // the panel should already be intialized by the time the user tries to load
        // a url but if not, just quiety log the error
        var panel_state = (Alph.main.get_state_obj().get_var("panels"))["alph-trans-panel"];
        panel_state.external_url = a_urlbar.value;
    }
    catch(e)
    {
        Alph.util.log("Unable to update trans panel state with external url: " + e);
    }
    
    // clear the value from the url bar if it's set to "about:blank"
    if (a_urlbar.value == "about:blank")
    {
        a_urlbar.value ="";
    }
};

/**
 * Static helper method to toggle the selection of the source and parallel 
 * aligned text
 * @param {Element} a_elem the HTML element which contains the word for which
 *                         to show the alignment
 * @param {String} a_type type of text being toggled 
 *                (one of @link Alph.Translation.INTERLINEAR_TARGET_SRC or
 *                 @link Alph.Translation.INTERLINEAR_TARGET_TRANS)
 * @param {Boolean} a_on is the text toggled on or off (true for on, false for off)
 */
Alph.Translation.prototype.toggle_parallel_alignment = function(a_elem,a_type,a_on)
{
    
    var parallel_doc;
    if (a_type == Alph.Translation.INTERLINEAR_TARGET_SRC)
    {
        parallel_doc = 
            Alph.$("browser",this.panel_elem).get(0).contentDocument;
    }
    else
    {
        parallel_doc = Alph.main.getCurrentBrowser().contentDocument;
    }
 
    // the source text element uses the "nrefs" attribute to identify the
    // corresponding element(s) in the parallel aligned translation
    if (Alph.$(a_elem).attr("nrefs"))
    {     
        var ids = Alph.$(a_elem).attr("nrefs").split(/\s|,/);
        for (var i=0; i<ids.length; i++) {
            if (a_on)
            {
                Alph.$('.alpheios-aligned-word[id="' + ids[i] + '"]',parallel_doc)
                    .addClass("alpheios-highlight-parallel");
            }
            else
            {
                Alph.$('.alpheios-aligned-word[id="' + ids[i] + '"]',parallel_doc)
                    .removeClass("alpheios-highlight-parallel");
            }
        }
    }
};

/** 
 * Adds a click event handler on the words in the translation panel
 * to allow for interactive matching of source words to aligned words
 * @param {object} a_params parameters object to be assigned to the event.data
 *                          object by the event handler 
 */
Alph.Translation.prototype.enable_interactive_query = function(a_params)
{
    var trans_doc = 
            Alph.$("browser",this.panel_elem).get(0).contentDocument;
    Alph.$('.alpheios-aligned-word',trans_doc).unbind('click',Alph.interactive.checkAlignedSelect);
    Alph.$('.alpheios-aligned-word',trans_doc)
        .bind('click',a_params,Alph.interactive.checkAlignedSelect);            
};

/**
 * Public static class variable for identifying the target of the
 * interlinear translation as the source (i.e. browser) document 
 * @public
 * @type String
 */ 
Alph.Translation.INTERLINEAR_TARGET_SRC = 'src';

/**
 * Public static class variable for identifying the target of the
 * interlinear translation as the translation panel document
 * TODO eventually we may need to support mutiple translations 
 * @public
 * @type String
 */ 
Alph.Translation.INTERLINEAR_TARGET_TRANS = 'trans';