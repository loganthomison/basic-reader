/**
 * @fileoverview This file contains the Alph.Vocab derivation of the Alph.Panel class.
 * Representation of the Vocabulary panel.
 *
 * @version $Id: alpheios-Vocab.js 2277 2009-11-17 19:52:34Z BridgetAlmas $
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
 * @class Vocab Panel implementation 
 * @augments Alph.Panel
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 */
Alph.Vocab = function(a_panel)
{
    Alph.Panel.call(this,a_panel);
};

/**
 * @ignore
 */
Alph.Vocab.prototype = new Alph.Panel();


/**
 * Vocab panel specific implementation of
 * {@link Alph.Panel#getDetachChrome}
 * @returns the chrome url as a string
 * @type String
 */
Alph.Vocab.prototype.getDetachChrome = function()
{
    return Alph.BrowserUtils.getContentUrl() + '/alpheios-vocab-window.xul';
};

/**
 * Vocab panel specific implementation of
 * {@link Alph.Panel.#init}
 */
Alph.Vocab.prototype.init = function(a_panel_state)
{    
    var trigger = Alph.Main.getLanguageTool().getPopupTrigger();
    Alph.$("browser",this.d_panelElem).get(0).addEventListener(trigger, Alph.Main.doXlateText, false);                
};


/**
 * Vocab panel specific implementation of
 * {@link Alph.Panel#show}
 * @returns the new panel status
 * @type int
 */
Alph.Vocab.prototype.show = function()
{
    var panel_obj = this;  
    var bro = Alph.Main.getCurrentBrowser();
    var panel_state = this.getBrowserState(bro);
    var lang_tool = Alph.Main.getLanguageTool(bro);
    var vocabDoc = Alph.$("browser",this.d_panelElem).get(0).contentDocument;
    // clear out the prior contents of the panel
    Alph.$("head link",vocabDoc).remove();
    var style_url = Alph.BrowserUtils.getStyleUrl();
    var xml_alt_text = Alph.Main.getString("alph-vocab-wordlist-xml");
    Alph.$("body",vocabDoc).html(
        '<div id="alpheios-vocab-contents">' +
        '<div id="alpheios-wordlist-header" class="alpheios-ignore">' +
        '<div id="wordlist-export-xml" title="' + xml_alt_text + '">' +
        '<img src="chrome://alpheios/skin/icons/xml.gif" ' +
            'alt="' + xml_alt_text + '"/></div>' +
        '<span>' + Alph.Main.getString("alph-vocab-wordlist-header",[lang_tool.getLanguageString()]) + '</span>'+
        '</div>' +
        '<div id="alpheios-wordlist-hints" class="alpheios-hint">' +
        Alph.Main.getString("alph-vocab-wordlist-hints",[lang_tool.getLanguageString()]) +
        '</div>' +
        '<div id="alpheios-wordlist-filter">' +
        '<label><input type="radio" name="filter_wordlist" value="all" checked="checked"/>' +
        Alph.Main.getString("alph-vocab-wordlist-all") + '</label>' +
        '<label><input type="radio" name="filter_wordlist" value="unlearned"/>' +
        Alph.Main.getString("alph-vocab-wordlist-unlearned") + '</label>' +
        '<label><input type="radio" name="filter_wordlist" value="learned"/>' + 
        Alph.Main.getString("alph-vocab-wordlist-learned") + '</label>' +
        '</div>' +
        '<div id="alpheios-wordlist-contents"></div>' + 
        '</div>'
    );
    Alph.$("head",vocabDoc).append(
        '<link rel="stylesheet" type="text/css" href="' + style_url + '/alpheios.css"/>' +
        '<link rel="stylesheet" type="text/css" href="' + style_url + '/alpheios-os.css"/>' +
        '<link rel="stylesheet" type="text/css" href="' + style_url + '/alpheios-vocab.css"/>');
          
    // update language-specific stylesheets and content    
    lang_tool.addStyleSheet(vocabDoc);
    this.d_wordList = lang_tool.getWordList();
    this.updateWordList(this.d_wordList);
    if (this.d_panelWindow)
    {
        this.d_panelWindow.focus();
    }
    return Alph.Panel.STATUS_SHOW;
};

/**
 * Vocab specific implementation of
 * {@link Alph.Panel.hide}
 * @param {Boolean} a_autoflag flag to indicate that the panel is being
 *                  hidden by the application rather than the user. If not
 *                  supplied, by the user is assumed.
 * @returns {@link.Alph.Panel#AUTO_HIDE} or {@link Alph.Panel#STATUS_HIDE}
 *         (depending upon the value of the a_autoflag param) if the 
 *         conditions were met to show the panel. Otherwise should
 *         return the current panel status.
 */
Alph.Vocab.prototype.hide = function(a_autoflag)
{
    if (this.d_panelWindow != null)
    {
        var closed = true;
        try {
            closed = this.d_panelWindow.closed;
        } catch(a_e){ // in FF 3.5 the closed property isn't available for a closed chrome window
        }
        if (closed)
        {
            this.d_panelWindow = null;
        }
    }
    if (a_autoflag != null && a_autoflag)
    {
        return Alph.Panel.STATUS_AUTOHIDE;
    }
    else 
    {
        return Alph.Panel.STATUS_HIDE;    
    }
    
};

/**
 * Vocab specific implementation of
 * {@link Alph.Panel.observeUIEvent}
 * @param {Browser} a_bro the current browser
 * @param a_event_type the event type (one of @link Alph.Constants.events)
 * @param a_event_data optional event data object
 */
Alph.Vocab.prototype.observeUIEvent = function(a_bro,a_event_type,a_event_data)
{
    var panel_obj = this;
    var panel_state = this.getBrowserState(a_bro);
    // listen for the window and the xlate trigger change events    
    if (a_event_type == Alph.Constants.EVENTS.UPDATE_XLATE_TRIGGER)
    {        
        var new_trigger = a_event_data.new_trigger;
        var old_trigger = a_event_data.old_trigger;
        var pw_bro = null;
        if (this.windowOpen())
        {
            pw_bro =
                this.d_panelWindow
                    .Alph.$("#" + this.d_panelId + " browser")
                    .get(0);
        }

        if (old_trigger)
        {
            Alph.$("browser",this.d_panelElem).get(0).
                removeEventListener(old_trigger, Alph.Main.doXlateText,false);
            if (pw_bro)
            {
                pw_bro.removeEventListener(old_trigger, Alph.Main.doXlateText,false);
            }
        }
        Alph.$("browser",this.d_panelElem).get(0).
            addEventListener(new_trigger, Alph.Main.doXlateText,false);
        if (pw_bro)
        {
            pw_bro.addEventListener(new_trigger, Alph.Main.doXlateText,false);
        }
        //Alph.Vocab.updateHint(this,a_bro,Alph.Main.getLanguageTool(a_bro),true);
    }  
    else if (a_event_type == Alph.Constants.EVENTS.VOCAB_UPDATE 
                && panel_state.status == Alph.Panel.STATUS_SHOW
                && Alph.$("#alpheios-wordlist",a_event_data.src_node.ownerDocument).length == 0)
    {        
        this.updateWordList(this.d_wordList); 
    }
    else if (a_event_type == Alph.Constants.EVENTS.LOAD_VOCAB_WINDOW)
    {        
        var trigger = Alph.Main.getXlateTrigger();
        this.d_panelWindow
            .Alph.$("#" + this.d_panelId + " browser")
            .get(0)
            .addEventListener(trigger, Alph.Main.doXlateText,false);
    }
    
    return;
};

/**
 * update the hint at the top of the the panel
 * @param {Panel} a_panel_obj the panel object
 * @param {Browser} a_bro the current browser
 * @param {Alph.LanguageTool} a_lang_tool the current language tool
 * @param {Boolean} a_update_window flag to indicate whether the panel window should be updated too 
 */
Alph.Vocab.updateHint = function(a_panel_obj,a_bro,a_lang_tool,a_update_window)
{
    var vocabDoc = Alph.$("browser",a_panel_obj.d_panelElem).get(0).contentDocument;
    var trigger = Alph.Main.getXlateTrigger(a_bro);
    var mode = Alph.Main.getStateObj(a_bro).getVar("level");
    var vocab_hint = a_lang_tool.getStringOrDefault('alph-vocab-hint',[]);
    var trigger_hint_prop = 'alph-trigger-hint-'+ trigger + '-'+mode;
    var lang = a_lang_tool.getLanguageString();
    var trigger_hint = a_lang_tool.getStringOrDefault(trigger_hint_prop,[lang]);
    Alph.$("#vocab-hint",vocabDoc).html(vocab_hint + trigger_hint);
    if (a_update_window)
    {
        a_panel_obj.updatePanelWindow({},'alph-vocab-body');
    }
}

/**
 * Update the current wordlist in the panel
 * @param {Alph.WordList} a_wordlist the current wordlist
 */
Alph.Vocab.prototype.updateWordList = function (a_wordlist)
{    
    var vocabDoc = Alph.$("browser",this.d_panelElem).get(0).contentDocument;
    var panel_obj = this;
    
     /* initialze the xsltProcessor if we haven't done so already */
    if (this.d_xsltProcessor == null)
    {
        this.d_xsltProcessor = Alph.BrowserUtils.getXsltProcessor('alpheios-vocab-wordlist.xsl');
    }
    try    
    {
        var vocabXML = a_wordlist.asXML();
        var html = this.d_xsltProcessor.transformToDocument(vocabXML);
        var wordlistElem = vocabDoc.importNode(html.getElementById("alpheios-wordlist"),true);
    }    
    catch (e)
    {
        Alph.$("body",vocabDoc).prepend('<div id="alph-vocab-error">' + e + '</div>');
        Alph.Main.s_logger.error(e);
    }    
    Alph.$("#alpheios-wordlist-contents",vocabDoc).html(wordlistElem);
    Alph.$("#alpheios-wordlist input[type=checkbox]",vocabDoc).click(
        function()
        {
            panel_obj.selectWordListItem(this);
            return true;
        }
    );
    Alph.$("#wordlist-export-xml",vocabDoc).click(        
        function(a_event)
        {                        
            panel_obj.exportWordList(a_event);
            return true;
        }
    );    
    Alph.$("input[name=filter_wordlist]",vocabDoc).click(Alph.Vocab.handleFilterSelect);
    this.updatePanelWindow({},'alph-vocab-body');
    
}

/**
 * handler for click on the filter radio buttons 
 * @param {Event} a_event the radio click event
 * @returns true
 * @type Boolean
 */
Alph.Vocab.handleFilterSelect = function(a_event) {
         
    // 'this' is the input element which was clicked
    if (this.value == 'all')
    {
        Alph.$("#alpheios-wordlist input[type=checkbox]",this.ownerDocument)
            .parent('div').removeClass("filtered");
    }
    else if (this.value == 'learned')
    {
        Alph.$("#alpheios-wordlist input[type=checkbox]",this.ownerDocument).each(
            function()
            {
                if (this.checked)
                {
                    Alph.$(this).parent('div').removeClass("filtered");
                }
                else 
                {
                    Alph.$(this).parent('div').addClass("filtered");
                }
            }
            
        );               
    }
    else if (this.value == 'unlearned')
    {
        Alph.$("#alpheios-wordlist input[type=checkbox]",this.ownerDocument).each(
            function()
            {
                if (this.checked)
                {
                    Alph.$(this).parent('div').addClass("filtered");
                }
                else 
                {
                    Alph.$(this).parent('div').removeClass("filtered");
                }
            }
        );
    }
    return true;
}
   
/**
 * Update a browser in the detached panel window with the current
 * state of that browser the real (attached) panel
 * @param {Object} a_panel_state the panel state object
 * @param {String} a_browser_id the id of the browser to update
 * @param {String} a_browser_index the index of the browser to update
 */
Alph.Vocab.prototype.updatePanelWindow = function(a_panel_state,a_browser_id,a_browser_index)
{
    var vocabDoc = Alph.$("browser#"+a_browser_id,this.d_panelElem).get(0).contentDocument;
    if (this.windowOpen())
    {
        var pw_bro =
            this.d_panelWindow
                .Alph.$("#" + this.d_panelId + " browser#"+a_browser_id)
                .get(0);
        if (pw_bro)
        {
            var pw_doc = pw_bro.contentDocument;
            Alph.$("head",pw_doc).html(Alph.$("head",vocabDoc).children().clone());
            Alph.$("body",pw_doc).html(Alph.$("body",vocabDoc).children().clone(true));                            
        }
    }
};

/**
 * handler for wordlist checkboxes
 */
Alph.Vocab.prototype.selectWordListItem = function(a_cbx)
{
    // the selected form or lemma is in span following the checkbox
    var entry = Alph.$(a_cbx).parents('.entry');    
    var item = Alph.$(a_cbx).next("span").eq(0);
    var lang = Alph.$(item).attr("lang") || Alph.$(item).attr("xml:lang");
    if (Alph.$(a_cbx).parent().hasClass("form"))
    {
        // update the form         
        var lemma = Alph.$(".lemma span",entry).text();        
        this.d_wordList.updateFormEntry(window,lang,Alph.$(item).text(),lemma,null,a_cbx.checked,true);
    }
    else
    {
        // update the lemma 
        this.d_wordList.updateLemmaEntry(window,lang,Alph.$(item).text(),null,a_cbx.checked,true);
    }    
};

/**
 * handler for the xml export button
 * @param {Event} the button click event
 */
Alph.Vocab.prototype.exportWordList = function(a_event)
{     
    var panel_obj = this;
    this.d_wordList.doXMLExport(window,a_event);
    
};