/**
 * @fileoverview This file contains the Alph.Translation class derivation of the 
 * Alph.Panel. Representation of the translation panel.
 * 
 * @version $Id: alpheios-trans.js 798 2008-06-20 20:42:04Z BridgetAlmas $
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
    Alph.$("#alph-trans-panel-external browser",this.panel_elem).get(0).
            addEventListener("DOMContentLoaded", function(e) { e.stopPropagation();} , true);

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
    var tab_box = Alph.$("tabbox",this.panel_elem).get(0);    
    if (trans_url.length == 0)
    {
        // if we don't have a pedagogical translation, just set the external translation tab
        // as the selected tab
        Alph.$("#alph-trans-tab-external",tab_box).click();
        // HACK - disable the interlinear options menu
        // TODO - this should observe the pedagogical-reader-notifier broadcaster
        // but it isn't -- maybe because it's defined in a custom element. Need
        // too fix this.
        Alph.$("#alpheios-trans-opt-inter").attr("disabled",true);
    }
    else
    {
        Alph.util.log("loading translation from " + Alph.$(trans_url).attr("url"));
    
        var browser_box = Alph.$("#alph-trans-panel-primary",tab_box); 
        var trans_doc = 
            Alph.$("browser",browser_box).get(0).contentDocument;
        Alph.$.ajax(
            {
                type: "GET",
                url: Alph.$(trans_url).attr("url"),
                dataType: 'html', 
                error: function(req,textStatus,errorThrown)
                {
                    Alph.$("body",trans_doc)
                        .html(textStatus || errorThrown);
                },
                success: function(data, textStatus) 
                {
                    Alph.$("body",trans_doc).html(data);
                    
                    // setup the display
                    Alph.pproto.setup_display(trans_doc);
                    
                    // setup for interlinear
                    Alph.pproto.add_interlinear(bro.contentDocument,trans_doc);
                    
                    // toggle the state of the interlinear display
                    // according to the selected state of the menu item
                    Alph.Translation.toggle_interlinear();
                    
                    // TODO - need to take state into account
                    // (i.e. if user chose a different tab)
                    Alph.$("#alph-trans-tab-primary",tab_box).click();
                    
                } 
            }   
        );
        
   }
   return Alph.Panel.STATUS_SHOW;
};

/**
 * Translation panel specific implementation of 
 * {@link Alph.Panel#reset_contents}
 * Loads the external url per the state of the current browser
 * @param {Object} a_panel_state the current panel state
 */
Alph.Translation.prototype.reset_contents = function(a_panel_state)
{
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
 */
Alph.Translation.prototype.toggle_parallel_alignment = function(a_elem)
{
    
    // the source text element uses the "ref" attribute to identify the
    // corresponding element(s) in the parallel aligned translation
    if (Alph.$(a_elem).attr("ref"))
    {
        var tab_box = Alph.$("tabbox",this.panel_elem).get(0);    
        var browser_box = Alph.$("#alph-trans-panel-primary",tab_box); 
        var trans_doc = 
            Alph.$("browser",browser_box).get(0).contentDocument;
     
        var ids = Alph.$(a_elem).attr("ref").split(/\s/);
        for (var i=0; i<ids.length; i++) {
            Alph.$('.alph-proto-word[id="' + ids[i] + '"]',trans_doc)
                .toggleClass("alph-highlight-parallel");    
        }
    }
    // if the user is mousing over the the parallel aligned translation
    // use the id attribute to find out which elements in the source
    // text refer to the selected word
    else if (Alph.$(a_elem).attr("id")) 
    {
        var parent_doc = Alph.main.getCurrentBrowser().contentDocument;
        var match_id = Alph.$(a_elem).attr("id");
        // find the aligned words in the parallel text
        Alph.$('.alph-proto-word[ref~="' + match_id + '"]',parent_doc).each(
            function()
            {
                var ids = Alph.$(this).attr("ref").split(/\s/);
                for (var i=0; i<ids.length; i++) {
                   if (ids[i] == match_id)
                   {
                        Alph.$(this).toggleClass("alph-highlight-parallel");
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
 */
Alph.Translation.toggle_interlinear = function(a_event)
{
    var parent_doc = Alph.main.getCurrentBrowser().contentDocument;
    if (Alph.$("#alpheios-trans-opt-inter").attr('checked') == 'true')
    {
        Alph.$(".alph-proto-iltrans",parent_doc).css('display','block');
    } else {
        Alph.$(".alph-proto-iltrans",parent_doc).css('display','none');
    }
    Alph.pproto.resize_interlinear(parent_doc);  
};