/**
 * @fileoverview This file contains the Alph.Etymology derivation of the Alph.Panel class. 
 * Representation of the Etymology panel.
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
 * @class The Alph.Etymology class is the representation of the Etymology
 * panel.
 * @constructor
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 * @see Alph.Panel
 */
Alph.Etymology = function(a_panel)
{
    Alph.Panel.call(this,a_panel);
};
    
/**
 * @ignore
 */
Alph.Etymology.prototype = new Alph.Panel();

/**
 * Intialization method which can be used for panel-specific initialization 
 * code.
 * @private
 */
Alph.Etymology.prototype.init = function(a_panel_state)
{
    Alph.MozUtils.log("etymology panel init");
    // hack to hold etymology data until we have a real service
    this.d_tempData = {};
    
    // initialize the contents array
    a_panel_state.contents = [];
    a_panel_state.css = [];
    this.resetContents(a_panel_state);
};

/**
 * Etymology panel specific implementation of 
 * {@link Alph.Panel#resetContents}
 * Refreshes the contents of the alph-window div 
 * as appropriate per the state of the current browser
 * @param {Object} a_panel_state the current panel state
 */
Alph.Etymology.prototype.resetContents = function(a_panel_state)
{
    var panel_obj = this;
    Alph.$("browser",this.d_panelElem).each( 
        function(i) 
        {
            var doc = this.contentDocument;
            var doc_state = panel_obj.initDocument(doc,{ contents: a_panel_state.contents[i],
                                                          css: a_panel_state.css[i]
                                                        });
            // store the current contents/css to the state object, 
            // if this browser's state hasn't been initialized yet
            if (a_panel_state.contents.length < i + 1 )
            {
                a_panel_state.contents[i] = Alph.$(doc_state.contents).clone();
                a_panel_state.css[i] = Alph.$(doc_state.css).clone();        
            }
            
        }
    );
    if (this.d_panelWindow != null)
    {
        this.d_panelWindow.Alph.$("#" + this.d_panelId + " browser").each( 
            function(i) 
            {
                var doc = this.contentDocument;
                panel_obj.initDocument(doc,{ contents: a_panel_state.contents[i],
                                                   css: a_panel_state.css[i]
                                            });
            }
        );
    }

};

/**
 * Intialize the document
 */
Alph.Etymology.prototype.initDocument = function(a_doc,a_doc_state)
{
    
    // if we haven't the initialized the contents of this browser for
    // the panel, get a new div for it and a copy of the default stylesheet links
    
    if (typeof a_doc_state.contents == "undefined")
    {
        Alph.MozUtils.log("initializing etymology document");
        a_doc_state = { css: null, contents: null };
        a_doc_state.contents = a_doc.createElementNS("http://www.w3.org/1999/xhtml","div");
        a_doc_state.contents.setAttribute("id", "alph-window");
        a_doc_state.css = a_doc.createElementNS("http://www.w3.org/1999/xhtml","link");                
        a_doc_state.css.setAttribute("rel", "stylesheet");
        a_doc_state.css.setAttribute("type", "text/css");
        a_doc_state.css.setAttribute("href", "chrome://alpheios/skin/alph-etym.css");
        a_doc_state.css.setAttribute("id", "alpheios-etym-css");
        
    }
    Alph.$("#alph-panel-body-template",a_doc).html("");
    Alph.$("#alph-window",a_doc).remove();
    Alph.$("body",a_doc).append(Alph.$(a_doc_state.contents).clone());
    Alph.$("link[rel=stylesheet]",a_doc).remove();
    Alph.$("head",a_doc).append(Alph.$(a_doc_state.css).clone());
    return a_doc_state;
}

/**
 * Etymology panel specific implementation of 
 * {@link Alph.Panel#show} - makes sure the 
 * browser document has been initialized 
 * @return the new panel status
 * @type int
 */
Alph.Etymology.prototype.show = function()
{
    var panel_obj = this;
    var bro = Alph.main.getCurrentBrowser();
    var panel_state = this.getBrowserState(bro);
    if (this.d_panelWindow != null)
    {
        this.d_panelWindow.Alph.$("#" + this.d_panelId + " browser").each(
            function(i)
            {
                var doc = this.contentDocument;
                if (panel_obj.d_panelWindow.Alph.$("#alph-window",doc).length == 0)
                {
                    panel_obj.initDocument(doc,{ contents: panel_state.contents[i],
                                                  css: panel_state.css[i]
                                                 });
                }
            }
        );
    }
    return Alph.Panel.STATUS_SHOW;
};

/**
 * Etymology panel specific implementation of 
 * {@link Alph.Panel#getDetachChrome}
 * @return the chrome url as a string
 * @type String
 */
Alph.Etymology.prototype.getDetachChrome = function()
{
    return 'chrome://alpheios/content/alpheios-etym-window.xul';   
}

/**
 * Etymology panel specific implementation of 
 * {@link Alph.Panel#observeUIEvent}
 * Stores the contents of the alph-window div
 * and document css to the panel state object.
 * @param {Browser} a_bro the current browser
 * @param a_event_type the event type
 */
Alph.Etymology.prototype.observeUIEvent = function(a_bro,a_event_type)
{
    // store the current contents of the morph window in this browser's panel state
    var panel_state = this.getBrowserState(a_bro);
    var data = this.getEtymData();
    var panel_obj = this;
    
    // don't do anything more if the panel isn't visible
    // or if the event isn't showing a new translation
    // or completing removing the popup

    if (panel_state.status != Alph.Panel.STATUS_SHOW
        || ( a_event_type != Alph.Constants.EVENTS.SHOW_TRANS
             && a_event_type != Alph.Constants.EVENTS.REMOVE_POPUP
            ))

    {
        return;
    }
     
    Alph.$("browser",this.d_panelElem).each( 
        function(i) 
        {
            var etym_doc = this.contentDocument;
            var alph_window = Alph.$("#alph-window",etym_doc).get(0);
            Alph.$("#alph-etym-block",etym_doc).remove();
            var dict = Alph.$(".alph-dict",alph_window);
            
            if (dict.length != 0 && data != null)
            {
                var hdwd = Alph.$(dict).attr("key");
                var etym_block = Alph.$("div[key=" + hdwd + "]",data).clone();
                if (etym_block != null && typeof etym_block != "undefined")
                {
                    Alph.$(etym_block).attr("id","alph-etym-block");
                    Alph.$("#alph-window",etym_doc).append(etym_block);
                }
            }
            panel_state.contents[i] = Alph.$("#alph-window",etym_doc).clone();
            panel_state.css[i] = Alph.$("link[rel=stylesheet]",etym_doc).clone();
        }
    );   
    
    // update the panel window
    if (this.d_panelWindow != null)
    {
        
        this.d_panelWindow.Alph.$("#" + this.d_panelId + " browser").each( 
            function(i) 
            {
                var doc = this.contentDocument;
                panel_obj.initDocument(doc,{ contents: panel_state.contents[i],
                                              css: panel_state.css[i]
                                            });
            }
        );
    }
}

/**
 * Get the etymology data -- hack until we have a real etymology service
 * @return the etymology data for the current language or null 
 */
Alph.Etymology.prototype.getEtymData = function()
{
    // initialize the etymology lookup data object
    // this is a temporary hack until we have a real etymology service
    var language_tool = Alph.main.getLanguageTool();
    if (typeof language_tool != "undefined")
    {
        var chromepkg = language_tool.getchromepkg();
        if (typeof this.d_tempData[chromepkg] == "undefined")
        {
            try 
            {
                Alph.MozUtils.log("Loading etymology file for " + chromepkg);
                var data = document.implementation.createDocument("", "", null);
                data.async = false;
                var chrome_url = "chrome://" + chromepkg + "/content/testetym.xml";
                data.load(chrome_url);
                this.d_tempData[chromepkg] = data;
            }
            catch(e)
            {
                this.d_tempData[chromepkg] = null;
                Alph.MozUtils.log("Error loading etymology file for " + chromepkg);
            }
        }
        return this.d_tempData[chromepkg];
    }
    return null;
}