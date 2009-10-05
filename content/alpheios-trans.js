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
 * @class Translation Panel implementation
 * @augments Alph.Panel
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 */
Alph.Translation = function(a_panel)
{
    Alph.Panel.call(this,a_panel);
    // override the main DOMContentLoaded listener for the browser
    //Alph.$("#alph-trans-panel-external browser",this.d_panelElem).get(0).
    //        addEventListener("DOMContentLoaded", function(e) { e.stopPropagation();} , true);

};
    
/**
 * @ignore
 */
Alph.Translation.prototype = new Alph.Panel();

/**
 * Translation panel specific implementation of 
 * {@link Alph.Panel#show}
 * @returns the new panel status
 * @type int
 */
Alph.Translation.prototype.show = function()
{
    var panel_obj = this;
    var bro = Alph.Main.getCurrentBrowser();
    //TODO - eventually should be able to pick the translation url
    // up from the user's preferences for the basic reader
    
    
    var trans_url = Alph.Site.getTranslationUrl(bro.contentDocument);
    if (trans_url)
    {
        Alph.Main.s_logger.info("loading translation from " + trans_url);
        
        var trans_doc = 
                Alph.$("browser",this.d_panelElem).get(0).contentDocument;  
        // jQuery can't handle a request to chrome which doesn't return expected
        // http headers --- this is a temporary hack to allow the interlinear
        // prototype to be run locally
        if (  Alph.BrowserUtils.isBrowserUrl(trans_url))
        {
            var r = new XMLHttpRequest();
            r.onreadystatechange = function()
            {
                if (r.readyState == 4 && r.responseText) 
                {
                    Alph.Translation.processTranslation(r.responseText,bro,trans_doc);
                }
                else 
                {
                    Alph.Translation.handleError(Alph.Main.getString("alph-loading-misc")
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
                        Alph.Translation.handleError(textStatus||errorThrown,trans_doc);
    
                    },
                    success: function(data, textStatus) 
                    {
                        
                        Alph.Translation.processTranslation(data,bro,trans_doc);
                    } 
                }   
            );
        }
        return Alph.Panel.STATUS_SHOW;
   }
   else
   {
        // no translation, so just hide the panel
        Alph.Main.s_logger.warn("No translation url defined");
        return panel_obj.hide(true);
   }
};

/**
 * Display error returned by request for translation
 */
Alph.Translation.handleError = function(a_error,a_trans_doc)
{
    Alph.$("body",a_trans_doc).html(
        '<div id="alph-trans-error" class="alpheios-hint">' + a_error + '</div>');
}

/**
 * Populate the pedagogical panel with the translation
 */
Alph.Translation.processTranslation = function(a_data,a_bro,a_trans_doc) {
    var new_doc = (new DOMParser()).parseFromString(
                            a_data,
                            "application/xhtml+xml");
    Alph.$("head",a_trans_doc).html(Alph.$("head",new_doc).contents())
    Alph.$("body",a_trans_doc).html(Alph.$("body",new_doc).contents());

    // setup the display
    Alph.Site.setupPage(a_trans_doc,'trans');
                        
    var disable_interlinear = true;
    if ( (Alph.$(".alpheios-aligned-word",a_trans_doc).length > 0) &&
          Alph.BrowserUtils.getPref("features.alpheios-interlinear"))
    {
        disable_interlinear = false;
        
    }
    Alph.Translation.setInterlinearToggle(disable_interlinear);                       
},


/**
 * Translation panel specific implementation of 
 * {@link Alph.Panel#handleRefresh}
 * Loads the external url per the state of the current browser
 * @param {Object} a_panel_state the current panel state
 */
Alph.Translation.prototype.handleRefresh = function(a_bro)
{
    var panel_state = this.getBrowserState(a_bro);
    var doc = Alph.$("browser",this.d_panelElem).get(0).contentDocument;
    Alph.Main.s_logger.debug("handling refresh in trans panel");
    // if the translation panel is showing and the the previous load
    // was interrupted, we'll have an error in the document.  if the page
    // is refreshed, we should try to load the document again. See bug 309.
    if (panel_state.status == Alph.Panel.STATUS_SHOW && 
        Alph.$("#alph-trans-error",doc).length > 0)
    {
        var msg = Alph.Main.getString("alph-trans-reload");
        Alph.Translation.handleError(msg,doc);
        this.resetState();
    }
}

/**
 * Translation panel specific implementation of 
 * {@link Alph.Panel#resetContents}
 * Loads the external url per the state of the current browser
 * @param {Object} a_panel_state the current panel state
 */
Alph.Translation.prototype.resetContents = function(a_panel_state)
{
    /**
    var url = a_panel_state.external_url;
    var current_url = 
            Alph.$("#alph-trans-panel-external browser",this.d_panelElem).get(0).currentURI.spec;
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
        var url_bar = Alph.$("#alph-trans-ext-urlbar",this.d_panelElem).get(0); 
        url_bar.value = url;
        Alph.Translation.loadUrl(null,url_bar);
    }
    **/
};

/**
 * Translation specific implementation of
 * {@link Alph.Panel.observeUIEvent}
 * @param {Browser} a_bro the current browser
 * @param a_event_type the event type (one of @link Alph.Constants.events)
 * @param a_event_data optional event data object
 */
Alph.Translation.prototype.observeUIEvent = function(a_bro,a_event_type,a_event_data)
{
    if (a_event_type == Alph.Constants.EVENTS.UPDATE_PREF 
        && a_event_data.name.indexOf('features.alpheios-interlinear') >= 0)
    {
        Alph.Translation.setInterlinearToggle(! a_event_data.value);             
    }

};

/**
 * Static helper method to toggle the display state of the interlinear
 * alignment in the source text.  This method is invoked by the command 
 * which responds to selection of the Interlinear Translation item in the
 * Options menu 
 * @param {Event} a_event the Event which initiated the action (may be null)
 */
Alph.Translation.toggleInterlinear = function(a_event)
{

    var panel = Alph.$("#alph-trans-panel");

    if (Alph.$("#alpheios-trans-opt-inter-trans").attr('checked') == 'true')
    {
        Alph.Translation.showInterlinear();
    } else {
        Alph.Site.hideInterlinear(Alph.$(".alpheios-word-wrap",
            Alph.$("browser",panel).get(0).contentDocument).get());
    }
};

/**
 * Static helper method to trigger the display the interlinear alignment 
 */

Alph.Translation.showInterlinear = function()
{
    var panel = Alph.$("#alph-trans-panel");
    var browser_doc = Alph.Main.getCurrentBrowser().contentDocument;
    var trans_doc =  
            Alph.$("browser",panel).get(0).contentDocument;
    
    Alph.$("#alpheios-trans-opt-inter-trans").
        parent("toolbaritem").
        addClass('alpheios-loading');
    var words = Alph.$(".alpheios-word-wrap",trans_doc).get();
    
    Alph.Site.populateInterlinear(
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
        var panel_state = (Alph.Main.getStateObj().getVar("panels"))["alph-trans-panel"];
        panel_state.external_url = a_urlbar.value;
    }
    catch(e)
    {
        Alph.Main.s_logger.error("Unable to update trans panel state with external url: " + e);
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
Alph.Translation.prototype.toggleParallelAlignment = function(a_elem,a_type,a_on)
{
    
    var parallel_doc;
    if (a_type == Alph.Translation.INTERLINEAR_TARGET_SRC)
    {
        parallel_doc = 
            Alph.$("browser",this.d_panelElem).get(0).contentDocument;
    }
    else
    {
        parallel_doc = Alph.Main.getCurrentBrowser().contentDocument;
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
                    .each(
                        function(a_i)
                        {
                            Alph.$(this).addClass("alpheios-highlight-parallel");
                            Alph.Util.scrollToElement(this);
                            var source_refs = this.getAttribute('nrefs');
                            if (source_refs)
                            {
                                source_refs.split(/\s|,/).forEach(
                                    function(s_id)
                                    {
                                        Alph.$('.alpheios-aligned-word[id="' + s_id + '"]',
                                                a_elem.ownerDocument)
                                            .addClass("alpheios-highlight-source");
                                    }
                                );
                            }
                        }
                    );
                    
            }
            else
            {
                Alph.$('.alpheios-aligned-word[id="' + ids[i] + '"]',parallel_doc)
                    .each(
                        function(a_i)
                        {
                            Alph.$(this).removeClass("alpheios-highlight-parallel");
                            var source_refs = this.getAttribute('nrefs');
                            if (source_refs)
                            {
                                source_refs.split(/\s|,/).forEach(
                                    function(s_id)
                                    {
                                        Alph.$('.alpheios-aligned-word[id="' + s_id + '"]',
                                                a_elem.ownerDocument)
                                            .removeClass("alpheios-highlight-source");
                                    }
                                );
                            }
                            
                        }
                    );
                    
                    
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
Alph.Translation.prototype.enableInteractiveQuery = function(a_params)
{
    var trans_doc = 
            Alph.$("browser",this.d_panelElem).get(0).contentDocument;
    Alph.$('.alpheios-aligned-word',trans_doc).unbind('click',Alph.Interactive.checkAlignedSelect);
    Alph.$('.alpheios-aligned-word',trans_doc)
        .bind('click',a_params,Alph.Interactive.checkAlignedSelect);            
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

/**
 * Responds to a change in the enabled/disabled status
 * of the interlinear translation feature
 * @param {Boolean} a_disabled true if the feature is disabled, false if it
 *                             is enabled
 */
Alph.Translation.setInterlinearToggle = function(a_disabled)
{
    Alph.$("#alph-trans-inter-trans-status").attr("disabled",a_disabled);
    Alph.$("#alph-trans-inter-trans-status").attr("hidden",a_disabled);
    // populate the interlinear display if it's checked and enabled
    if ( ! a_disabled &&
        (Alph.$("#alpheios-trans-opt-inter-trans").attr('checked') == 'true')
        && ! Alph.Interactive.enabled()
       )
    {
        Alph.Translation.showInterlinear();
    }
};