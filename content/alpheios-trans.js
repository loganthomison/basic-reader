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
                    Alph.Translation.handle_error("error",trans_doc);
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
    Alph.$("body",a_trans_doc).html(a_data);

    // setup the display
    // prototype
    Alph.pproto.setup_display(a_trans_doc,'trans');
    // site design revision
    Alph.site.setup_page(a_trans_doc,'trans');
                    
    // setup for interlinear    
    Alph.site.enable_interlinear(a_bro.contentDocument,a_trans_doc);
                    
    // toggle the state of the interlinear display
    // according to the selected state of the menu item
    Alph.Translation
        .toggle_interlinear(Alph.Translation.INTERLINEAR_TARGET_SRC);
    Alph.Translation
        .toggle_interlinear(Alph.Translation.INTERLINEAR_TARGET_TRANS);
                    
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
 */
Alph.Translation.prototype.toggle_parallel_alignment = function(a_elem,a_type)
{
    
    // the source text element uses the "nrefs" attribute to identify the
    // corresponding element(s) in the parallel aligned translation
    if (a_type == Alph.Translation.INTERLINEAR_TARGET_SRC)
    {
        var trans_doc = 
            Alph.$("browser",this.panel_elem).get(0).contentDocument;

        if (Alph.$(a_elem).attr("ref"))
        {     
            var ids = Alph.$(a_elem).attr("ref").split(/\s|,/);
            for (var i=0; i<ids.length; i++) {
                Alph.$('.alph-proto-word[id="' + ids[i] + '"]',trans_doc)
                    .toggleClass("alph-highlight-parallel");    
            }
        }
        else if (Alph.$(a_elem).attr("nrefs"))
        {     
            var ids = Alph.$(a_elem).attr("nrefs").split(/\s|,/);
            for (var i=0; i<ids.length; i++) {
                Alph.$('.alpheios-aligned-word[id="' + ids[i] + '"]',trans_doc)
                    .toggleClass("alpheios-highlight-parallel");    
            }
        }
    }
    // if the user is mousing over the the parallel aligned translation
    // use the id attribute to find out which elements in the source
    // text refer to the selected word
    else if (a_type == Alph.Translation.INTERLINEAR_TARGET_TRANS
             && Alph.$(a_elem).attr("id")) 
    {
        var parent_doc = Alph.main.getCurrentBrowser().contentDocument;
        var match_id = Alph.$(a_elem).attr("id");
        // find the aligned words in the parallel text
        Alph.$('.alph-proto-word[ref~="' + match_id + '"]',parent_doc).each(
            function()
            {
                var ids = Alph.$(this).attr("ref").split(/\s|,/);
                for (var i=0; i<ids.length; i++) {
                   if (ids[i] == match_id)
                   {
                        Alph.$(this).toggleClass("alph-highlight-parallel");
                        break;
                   }
               }
            }
        );             

        Alph.$('.alpheios-aligned-word[nrefs~="' + match_id + '"]',parent_doc).each(
            function()
            {
                var ids = Alph.$(this).attr("nrefs").split(/\s|,/);
                for (var i=0; i<ids.length; i++) {
                   if (ids[i] == match_id)
                   {
                        Alph.$(this).toggleClass("alpheios-highlight-parallel");
                        break;
                   }
               }
            }
        );             

    }  
};

/**
 * Static helper method to toggle the display state of the interlinear
 * alignment in the source text.  This method is invoked by the command 
 * which responds to selection of the Interlinear Translation item in the
 * Options menu 
 * @param {String} a_type identifieds target location for interlinear translation 
 *                (one of @link Alph.Translation.INTERLINEAR_TARGET_SRC or
 *                 @link Alph.Translation.INTERLINEAR_TARGET_TRANS)
 * @param {Event} a_event the Event which initiated the action (may be null)
 */
Alph.Translation.toggle_interlinear = function(a_type,a_event)
{
    var panel = Alph.$("#alph-trans-panel");
    var src_doc;
    var target_doc;
    var browser_doc = Alph.main.getCurrentBrowser().contentDocument;
    var trans_doc =  
            Alph.$("browser",panel).get(0).contentDocument;
            
    if (a_type == Alph.Translation.INTERLINEAR_TARGET_SRC)
    {
        target_doc = browser_doc;
        src_doc = trans_doc;
    }
    else
    {
        target_doc = trans_doc;
        src_doc = browser_doc;
    }

    if (Alph.$("#alpheios-trans-opt-inter-" + a_type).attr('checked') == 'true')
    {
        // make sure the interlinear translation has been added to the display
        Alph.pproto.add_interlinear(target_doc,src_doc);
        Alph.$(".alph-proto-iltrans",target_doc).css('display','block');

        Alph.site.add_interlinear_text(target_doc,src_doc);
        Alph.$(".alpheios-aligned-trans",target_doc).css('display','inline');
    } else {
        Alph.$(".alph-proto-iltrans",target_doc).css('display','none');
        Alph.$(".alpheios-aligned-trans",target_doc).css('display','none');
    }
    Alph.pproto.resize_interlinear(target_doc);
    Alph.site.resize_interlinear(target_doc);  
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