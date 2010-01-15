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
    this.initDocument(bro,vocabDoc,lang_tool);
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
                && (! a_event_data.src_node || 
                    Alph.$("#alpheios-wordlist",a_event_data.src_node.ownerDocument).length == 0)
            )
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
        this.d_xsltProcessor.setParameter("",'e_sort','alpha');
        var html = this.d_xsltProcessor.transformToDocument(vocabXML);
        var wordlistElem = vocabDoc.importNode(html.getElementById("alpheios-wordlist"),true);
        var xml_alt_text = Alph.Main.getString("alph-vocab-wordlist-xml"); 
        var xml_link =  Alph.$(
        '<div id="wordlist-export-xml" title="' + xml_alt_text + '">' +
        '<img src="chrome://alpheios/skin/icons/xml.gif" ' +
        'alt="' + xml_alt_text + '"/></div>',vocabDoc);               
        Alph.$("#alpheios-wordlist-contents",vocabDoc).html(wordlistElem).prepend(xml_link);
        Alph.$("#alpheios-wordlist-filter",vocabDoc).before(Alph.Vocab.getFilter(vocabDoc)).remove();
        Alph.Vocab.handleFilterSelect
                      .call(Alph.$("input[name=filter_wordlist]:checked",vocabDoc).get(0),null);
        
    }    
    catch (e)
    {
        Alph.$("body",vocabDoc).prepend('<div id="alph-vocab-error">' + e + '</div>');
        Alph.Main.s_logger.error(e);
    }   
    
    this.addHandlers(vocabDoc);
    this.updatePanelWindow({},'alph-vocab-body');
    
}

/**
 * handler for click on the filter radio buttons 
 * @param {Event} a_event the radio click event
 * @returns true
 * @type Boolean
 */
Alph.Vocab.handleFilterSelect = function(a_event) {
         

    if (a_event != null)
    {
        // update the preference setting if called from a click event
        Alph.BrowserUtils.setPref(Alph.Constants.VOCAB_FILTER,this.value);
    }
    
    // 'this' is the input element which was clicked
    if (this.value == 'all')
    {
        Alph.$(".entry input[type=checkbox]",this.ownerDocument)
            .parent('div').removeClass("filtered");
    }
    else if (this.value == 'learned')
    {
        Alph.$(".entry input[type=checkbox]",this.ownerDocument).each(
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
        Alph.$(".entry input[type=checkbox]",this.ownerDocument).each(
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
 * @param {Event} a_event the click event (the panel object is available at a_event.data)
 */
Alph.Vocab.selectWordListItem = function(a_event)
{    
    var panel_obj = a_event.data;
    // the selected form or lemma is in span following the checkbox
    var entry = Alph.$(this).parents('.entry');    
    var item = Alph.$(this).next("span").eq(0);
    var lang = Alph.$(item).attr("lang") || Alph.$(item).attr("xml:lang");
    if (Alph.$(this).parent().hasClass("form"))
    {
        // update the form         
        var lemma = Alph.$(".lemma span",entry).text();        
        panel_obj.d_wordList.updateFormEntry(window,lang,Alph.$(item).text(),lemma,null,this.checked,true);
    }
    else
    {
        // update the lemma 
        panel_obj.d_wordList.updateLemmaEntry(window,lang,Alph.$(item).text(),null,this.checked,true);
    }   
};

/**
 * handler for the xml export button
 * @param {Event} a_event the click event (the panel object is available at a_event.data)
 */
Alph.Vocab.exportWordList = function(a_event)
{     
    var panel_obj = a_event.data;
    panel_obj.d_wordList.doXMLExport(window,a_event);
    
};

/**
 * initialize the panel document
 * @param {Browser} a_bro the current browser
 * @param {Document} a_doc the panel document
 * @param {Alph.LanguageTool} a_lang_tool the current language tool
 */
Alph.Vocab.prototype.initDocument = function(a_bro,a_doc,a_lang_tool)
{   
    Alph.$("head link",a_doc).remove();
    var style_url = Alph.BrowserUtils.getStyleUrl();       
    Alph.$("body",a_doc).html(
        '<div id="alpheios-vocab-contents" lang="' + a_lang_tool.getLanguage() + '">' +
        '<div id="alpheios-wordlist-header" class="alpheios-ignore">' +        
        '<span class="alpheios-tab current" id="wordlist-tab">' + 
        '<a href="#alpheios-wordlist-contents">' + 
            Alph.Main.getString("alph-vocab-wordlist-header",[a_lang_tool.getLanguageString()]) +
        '</a>' +         
        '</span>'+
        '</div>' +        
        '<div id="alpheios-wordlist-hints" class="alpheios-hint alpheios-ignore">' +
        Alph.Main.getString("alph-vocab-wordlist-hints",[a_lang_tool.getLanguageString()]) +
        '</div>' + 
        '<div id="alpheios-wordlist-filter"></div>' +
        '<div id="alpheios-wordlist-contents"></div>' +
        '<div id="alpheios-vocablist-contents"><div id="alpheios-vocablist"></div></div>' +
        '</div>'
    );        
    var docs = Alph.Main.getBrowserDocs(a_bro);
    var vocabUrl = null;
    var docTitle = "";
    for (var i=0; i<docs.length; i++)
    {
        vocabUrl = Alph.Site.getVocabularyUrl(docs[i]);
        if (vocabUrl)
        {
            // TODO for now, just take the first url found
            // but eventually need to support multiple per page and per 
            // browser window
            docTitle = Alph.Site.getDocumentTitle(docs[i]);
            break;
        }
    }
    if (vocabUrl)    
    {        
        Alph.$("#alpheios-wordlist-header",a_doc).append(
            '<span class="alpheios-tab" id="vocablist-tab">' +
            '<a href="#alpheios-vocablist-contents">' + 
            Alph.Main.getString("alph-vocablist-header",[docTitle])
            + '</a></span>');
        var pofs_select = '<span class="caption">' +
            Alph.Main.getString("alph-vocablist-pofs-select") +
            '</span>' +
            '<select id="alpheios-vocablist-pofsselect">\n';
        var pofs = a_lang_tool.getPofs();
        for (var i=0; i<pofs.length; i++)
        {
            // for now just select the first one
            // TODO get default pofs from user config?
            var selected = "";
            if (i == 0)
            {
                selected = ' selected="selected"';
            }
            pofs_select = pofs_select + 
                '<option value="' + pofs[i] + '"' + selected + '>' + pofs[i] + '</option>\n'; 
        }
        pofs_select = pofs_select + '</select>\n';
        Alph.$("#alpheios-vocablist-contents",a_doc).attr("src",vocabUrl);
        Alph.$("#alpheios-vocablist-contents",a_doc).prepend(pofs_select);        
    }
    
    Alph.$("head",a_doc).append(
        '<link rel="stylesheet" type="text/css" href="' + style_url + '/alpheios.css"/>' +
        '<link rel="stylesheet" type="text/css" href="' + style_url + '/alpheios-os.css"/>' +
        '<link rel="stylesheet" type="text/css" href="' + style_url + '/alpheios-vocab.css"/>');
          
    // update language-specific stylesheets and content    
    a_lang_tool.addStyleSheet(a_doc);
};

/**
 * add handlers
 * add the javascript handlers to the panel document
 */
Alph.Vocab.prototype.addHandlers = function(a_doc)
{   
    var panel_obj = this;
    Alph.$(".alpheios-tab",a_doc).unbind(
        'click', Alph.Vocab.selectTab);
    Alph.$(".alpheios-tab",a_doc).bind(
        'click', panel_obj, Alph.Vocab.selectTab);               
    Alph.$("#alpheios-wordlist input[type=checkbox]",a_doc).unbind(
        'click',Alph.Vocab.selectWordListItem);
    Alph.$("#alpheios-wordlist input[type=checkbox]",a_doc).bind(
        'click',panel_obj,Alph.Vocab.selectWordListItem);
    Alph.$("#wordlist-export-xml",a_doc).unbind(
        'click',Alph.Vocab.exportWordList);
    Alph.$("#wordlist-export-xml",a_doc).bind(        
        'click',panel_obj,Alph.Vocab.exportWordList);
    Alph.$("#alpheios-vocablist-pofsselect",a_doc).unbind(
        'change', Alph.Vocab.handleVocabSelect);
    Alph.$("#alpheios-vocablist-pofsselect",a_doc).bind(
        'change',panel_obj,Alph.Vocab.handleVocabSelect);
};

/**
 * Click handler for vocab list navigation
 * @param {Event} a_event the click event (the panel object is available at a_event.data)
 */
Alph.Vocab.handleNavigation = function(a_event)
{
    var panelObj = a_event.data;
    var doc = this.ownerDocument;
    Alph.$("#alpheios-vocablist",doc).html(
        '<div class="loading">' + Alph.Main.getString('alph-loading-misc') + '</div>');
    var url = this.getAttribute("href");    
    Alph.$.ajax(
        {
            type: "GET",
            url: url,
            dataType: 'xml', 
            error: function(a_req,a_status,a_e)
            {
                Alph.$("body",doc).prepend('<div id="alph-vocab-error">' + a_e + '</div>');                            

            },
            success: function(a_xml, a_status) 
            {
                panelObj.updateVocabList(a_xml,doc);                        
            } 
        }   
    ); 
    return false;
}

   
/**
 * Select handler for the vocabulary list
 * @param {Event} a_event the click event (the panel object is available at a_event.data)
 */
Alph.Vocab.handleVocabSelect = function(a_event)
{
    var panelObj = a_event.data;
    var doc = this.ownerDocument;
    Alph.$("#alpheios-vocablist",doc).html(
        '<div class="loading">' + Alph.Main.getString('alph-loading-misc') + '</div>');
    var pofs = Alph.$("#alpheios-vocablist-pofsselect",doc).get(0).value;        
    var url = Alph.$("#alpheios-vocablist-contents",doc).attr("src");
    url = url.replace(/POFS/,pofs);    
    Alph.$.ajax(
        {
            type: "GET",
            url: url,
            dataType: 'xml', 
            error: function(a_req,a_status,a_e)
            {
                Alph.$("body",doc).prepend('<div id="alph-vocab-error">' + a_e + '</div>');                            

            },
            success: function(a_xml, a_status) 
            {
                panelObj.updateVocabList(a_xml,doc);                        
            } 
        }   
    ); 
    
};

/**
 * updates the vocabulary list contents
 * @param {Document} a_xml the XML Document containing the vocabulary list
 * @param {Document) a_doc the panel document  
 */
Alph.Vocab.prototype.updateVocabList = function(a_xml,a_doc)
{
    var self = this;
    /* initialze the xsltProcessor if we haven't done so already */
    if (this.d_xsltProcessor == null)
    {
        this.d_xsltProcessor = Alph.BrowserUtils.getXsltProcessor('alpheios-vocab-wordlist.xsl');
    }
    try    
    {
        this.d_xsltProcessor.setParameter("",'e_sort','freq');
        var html = this.d_xsltProcessor.transformToDocument(a_xml);
        var vocabElem = a_doc.importNode(html.getElementById("alpheios-wordlist"),true);                
        Alph.$("#alpheios-vocablist",a_doc).html(Alph.$(vocabElem).contents());
        Alph.$("#alpheios-vocablist input[type=checkbox]",a_doc).bind(
            'click',this,Alph.Vocab.selectWordListItem);
         Alph.$(".navigation a",a_doc).bind(
            'click',self,Alph.Vocab.handleNavigation);

        var lang = Alph.$("#alpheios-vocab-contents",a_doc).attr("lang");
        var lang_tool = Alph.Languages.getLangTool(lang);
        if (lang_tool)
        {
            Alph.$("#alpheios-vocablist input[type=checkbox]",a_doc).each(
                function()
                {       
                    var learned = false;
                    // if it's a lemma, check the lemma only
                    if (Alph.$(this).parent(".lemma").length == 1)
                    {
                        var lemma= lang_tool.normalizeWord(Alph.$(this).next('span').text());
                        learned = self.d_wordList.checkLemma(lemma);
                    }
                    // otherwise check for the form under the correct lemma
                    else
                    {
                        var lemma = lang_tool.normalizeWord( 
                            Alph.$(this).parents(".entry").children(".lemma").text());
                        var form = lang_tool.normalizeWord(Alph.$(this).next('span').text());
                        learned = self.d_wordList.checkForm(form,lemma);
                    }
                    Alph.$(this).attr("checked",learned);                    
                }
            )
            Alph.Vocab.handleFilterSelect
                      .call(Alph.$("input[name=filter_wordlist]:checked",a_doc).get(0),null);
        }
        
    
    }    
    catch (a_e)
    {        
        Alph.$("body",a_doc).prepend('<div id="alph-vocab-error">' + a_e + '</div>');
    }    
    if (this.d_panelWindow)
    {
        this.d_panelWindow.focus();
    }
};

/**
 * vocabulary panel tab click handler
 * @param {Event} a_event the click event
 *                the panel object is supplied as a_event.data
 */
Alph.Vocab.selectTab = function(a_event)
{
    var panelObj = a_event.data;    
    Alph.$(this).siblings(".alpheios-tab").each(
        function()
        {
            Alph.$(this).removeClass('current');
            var target = Alph.$("a",this).attr("href");
            Alph.$(target,this.ownerDocument).css("display",'none');
        }
    );
    Alph.$(this).addClass("current");
    var target_id = Alph.$("a",this).attr("href");
    Alph.$(target_id,this.ownerDocument).css("display","block");

    // for vocab tab, update vocabulary panel contents if it's empty
    if (this.id == 'vocablist-tab'
        && Alph.$("#alpheios-vocablist",this.ownerDocument).children(".entry").length == 0)
    {
        Alph.Vocab.handleVocabSelect.call(this,a_event);
    }
    // for wordlist tab, refresh contents with latest word list
    else if (this.id == 'wordlist-tab')
    {
        panelObj.updateWordList(panelObj.d_wordList);
    }
    return false;
}

/**
 * get the filter controls
 * @param {Document} a_doc the parent document
 * @returns the alpheios-wordlist-filter html
 * @type String
 */
Alph.Vocab.getFilter = function(a_doc)
{
    var def_filter = Alph.BrowserUtils.getPref(Alph.Constants.VOCAB_FILTER);
    var filter_html = '<div id="alpheios-wordlist-filter">';
    ['all','unlearned','learned'].forEach(
        function(a_filter)
        {
            var checked = '';
            if (def_filter == a_filter)
            {
                checked = 'checked="checked"';
            }
            filter_html = filter_html +
                '<label><input type="radio" name="filter_wordlist" value="' + a_filter + '"' +
                checked + '/>' +
            Alph.Main.getString("alph-vocab-wordlist-" + a_filter) + '</label>';
        }
    );
    filter_html = filter_html + '</div>';
    var filter_node = Alph.$(filter_html,a_doc);
    Alph.$("input[name=filter_wordlist]",filter_node).click(Alph.Vocab.handleFilterSelect);    
    return filter_node;                      
}