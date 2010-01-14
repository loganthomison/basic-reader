/**
 * @fileoverview Javascript functions for Diagram window
 * $Id: alpheios-diagram.js 2307 2009-12-03 18:40:30Z BridgetAlmas $
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
  * @class Diagram window
  */
Alph.Diagram = {};

/**
 * Static logger for the diagram class
 */
Alph.Diagram.s_logger = Alph.BrowserUtils.getLogger('Alpheios.Diagram');
        
/**
 * load handler for the Diagram window
 */
Alph.Diagram.load = function()
{
    var params = typeof window.arguments != "undefined" ? 
                    window.arguments[0] : {};
    
                        
    var browser = document.getElementById("alpheios-diagram-content");    
    browser.setAttribute('src',params.e_url);
    // resize the window to fit the tree
    
    // install progress listener to list for the page to be done loading
    // DOMContentLoaded fires before all the javascript and svg is loaded
    browser.addProgressListener(Alph.Diagram.s_loadListener,
            Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
    
    browser.addEventListener(
        "DOMContentLoaded",
        function() 
        {          
            // listen for the AlpheiosTreeResized event
            // and resize the window accordingly
            // would be better to use SVGResize but it's not yet supported for
            // embedded SVG
            this.contentDocument.addEventListener(
                'AlpheiosTreeResized',
                function()
                {                   
                    try
                    {
                         // update the title of the window to the title of the tree document
                        document.documentElement.setAttribute('title',this.title);
                        var tree = this.getElementById("dependency-tree");
                        var w = parseInt(tree.getAttribute("width"));
                        var h = parseInt(tree.getAttribute("height"));
                        Alph.Util.resizeWindow(window,w,h);
                        
                    }
                    catch (a_e) { Alph.Diagram.s_logger.warn(a_e)}
                },
                false
            );
            
            this.contentDocument.addEventListener(
                'AlpheiosTreeLoaded',
                function()
                {                    
                    var doc = this;
                    // add tooltips
                    Alph.$("text[title]",this).hover(
                        function(a_event)
                        {        
                                                    
                            var title = this.getAttribute("title");
                            var id = "tooltip_" + Alph.$(this).parents("g").attr("id");
                            var offset = Alph.$(this).offset();            
                            var top = a_event.pageY + 10;
                            var left = a_event.pageX + 20;
                            if (title)
                            {
                                var span = 
                                    Alph.$(
                                        '<span class="alph-tooltip" id="' + id + '">' + title + '</span>'
                                    ,doc);                                
                                Alph.$('body',doc).prepend(span);
                                Alph.$("#" + id, doc).css("top",top + "px");
                                Alph.$("#" + id, doc).css("left",left + "px");
                            }
                       },
                       function()
                       {
                           var id = "tooltip_" + Alph.$(this).parents("g").attr("id");
                           Alph.$("#" + id, doc).remove();
                       }
                    );      
                },
                false
            );
            
            // hide the exit submit button
            // TODO this should really bring the user back to the list of sentences
           Alph.$("form[name=sent-navigation-exit] button[type=submit]",this.contentDocument).remove();
                                    
            // add the trigger hint
            var trigger = params.e_langTool.getPopupTrigger();
            if (trigger && params.e_srcDoc)
            {
                var parent_browser = 
                    Alph.BrowserUtils.browserForDoc(window.opener,params.e_srcDoc);
                window.opener.Alph.Site
                        .addTriggerHint(parent_browser,this.contentDocument,trigger,params.e_langTool);
            }
        },true);
    if (params.e_proxiedEvent && params.e_proxiedHandler && params.e_srcDoc)
    {
        Alph.Util.addProxiedEvent(window,browser,params.e_proxiedEvent);    
    }
                
    // if a callback function was passed in in the window
    // arguments, execute it
    if (typeof params.e_callback == 'function') {
        params.e_callback();
    }

};

/**
 * load function for the user diagrams dialog
 */
Alph.Diagram.loadUserDiagramDlg = function()
{
    // set defaults
    var default_lang = Alph.BrowserUtils.getPref("interface.diagram.lang");
    var default_fmt = Alph.BrowserUtils.getPref("interface.diagram.fmt");
    Alph.$("#lang_select radio[value=" + default_lang + "]").attr("checked",true);
    Alph.$("#fmt_select radio[value=" + default_fmt + "]").attr("checked",true);
    // try to select the default language from the current Alpheios language tool
    var lang_tool = window.arguments[0].e_langTool;
    if (lang_tool)
    {
        Alph.$("#lang_select radio").each(
            function(a_i)
            {
                var lang_val = this.getAttribute('value');
                if (lang_tool && lang_tool.supportsLanguage(lang_val))
                {
                    Alph.$("#lang_select").get(0).selectedIndex = a_i;
                    
                    var lang_fmt = Alph.BrowserUtils.getPref("interface.diagram.fmt." + lang_val);
                    if (lang_fmt)
                    {
                        var fmt_elem = Alph.$("#fmt_select radio[value=" + lang_fmt + "]").get(0);
                        if (fmt_elem)
                        {
                            Alph.$("#fmt_select").get(0).selectItem(fmt_elem);
                        }
                        
                    }
                }            
            }
        );
    }    
    // populate the list of user diagrams
    this.listUserDiagrams();

    // repopulate upon language or format change
    Alph.$("radio").click(function(){   Alph.Diagram.listUserDiagrams()});
    
    // submit edit upon double click in list box
    Alph.$("#user-diagram-list").dblclick(Alph.Diagram.editUserDiagram);
};

/**
 * get the name of the user diagram document, given a format and language
 * @param {String} a_fmt the format
 * @param {String} a_lang the language
 * @returns the document name (user-<lang>-<fmt>)
 * @type String 
 */
Alph.Diagram.getDocName = function(a_fmt,a_lang)
{
  return 'user-' + a_lang + '-' + a_fmt;   
}

/**
 * get a diagram data object from the data manager
 * (the datamanger must have been supplied in the window open arguments)
 * @param {String} a_fmt the diagram format
 * @param {String} a_lang the diagram language
 * @returns the diagram data object
 * @type TreeDiagram 
 */
Alph.Diagram.getDiagramData = function(a_fmt,a_lang)
{
    var dm = window.arguments[0].e_dataManager;   
    var docname = this.getDocName(a_fmt,a_lang);
    var tb = dm.getDataObj('diagrams',docname,true,{'format': a_fmt, 'lang': a_lang });
    return tb;         
};
/**
 * Update the list of currently stored sentences for the selected
 * format and language
 * @returns true
 * @type Boolean
 */
Alph.Diagram.listUserDiagrams = function()
{
    
    var lang = document.getElementById("lang_select").value;
    var fmt = document.getElementById("fmt_select").value;
    var data = this.getDiagramData(fmt,lang);    
    
    var listbox = document.getElementById('user-diagram-list'); 
    while (listbox.hasChildNodes())
            listbox.removeChild(listbox.firstChild);
    var data = this.getDiagramData(fmt,lang);                    
    var sentences = data.getSentenceList(window);
    for (var i=0; i<sentences.length; i++)
    {
        
        listbox.appendChild(
            Alph.Util.makeXUL(
            'listitem',
            's'+ sentences[i][0],
            ['label','value','crop'],[sentences[i][1],sentences[i][0],'end'])
        );            
    }
    return true;
};

/**
 * add a new user-defined sentence to diagram
 * @returns true if successful in adding the sentence and opening the edit window, 
 *          otherwise false
 * @type Boolean
 */
Alph.Diagram.addUserDiagram = function()
{  
   var sentence = document.getElementById("new_sentence").value;
   var rc = false;
   if (sentence)
   {   var lang = document.getElementById("lang_select").value;
       var fmt = document.getElementById("fmt_select").value;
       var tb = this.getDiagramData(fmt,lang);
       var seq = document.getElementById("sequential").checked ? 'yes' : 'no';
       
       // check if language tool matches selected language and if so, use to separate words, otherwise
       // just separate by space ?
       var sentence = tb.addSentence(window,sentence.split(/\s+/));       
       try
       {
            this.openDiagram(this.getDocName(fmt,lang),sentence.getAttribute('id'),lang,seq);
            rc = true;
       }
       catch(a_e)
       {
            document.getElementById("error").value = a_e;            
       }
   } else {
        document.getElementById("error").value = 
            Alph.BrowserUtils.getString(document.getElementById("alpheios-strings"),
                                   'alpheios-diagram-error-noinput');                                           
   }   
   return rc;                 
};

/**
 * Open the diagram window to edit a selected user-defined sentence
 */
Alph.Diagram.editUserDiagram = function()
{
    var selected = document.getElementById('user-diagram-list').selectedItem;
    var rc = false;
    if (selected)
    {
        var lang = document.getElementById("lang_select").value;
        var fmt = document.getElementById("fmt_select").value;
        var seq = document.getElementById("sequential").checked ? 'yes' : 'no';        
        var doc = Alph.Diagram.getDocName(fmt,lang);
        var id = selected.value;
        try
        {
            Alph.Diagram.openDiagram(doc,id,lang,seq);
            rc = true;
        }
        catch(a_e)
        {
            document.getElementById("error").value = a_e;            
        }
    } else {
        document.getElementById("error").value = 
            Alph.BrowserUtils.getString(document.getElementById("alpheios-strings"),
                                   'alpheios-diagram-error-noneselected');                                       
    }
    if (rc)
    {
        window.close();
    }
}

/**
 * open the diagram window for a selected sentence
 * @param {String} a_doc the diagram document name
 * @param {String} a_id the sentence id
 * @param {String} a_lang the language
 * @param {String} a_seq yes if to open in sequential mode, otherwise no
 * @throws an error if unable to determine the url for the diagram window
 */
Alph.Diagram.openDiagram = function(a_doc,a_id,a_lang,a_seq)
{
   var url = Alph.BrowserUtils.getPref("diagram.url");
   if (!url)
   {
        throw new Errror(
            Alph.BrowserUtils.getString(
                document.getElementById("alpheios-strings"),'alpheios-diagram-error-nourl'));                                                   
   }
  
   url = url.replace(/DOC/,a_doc);
   url = url.replace(/SENTENCE/g,a_id);
   url = url.replace(/LANG/,a_lang);
   url = url.replace(/SEQUENTIAL/,a_seq);
   return window.arguments[0].e_langTool.openDiagram(
        null,
        'alph-diagram-edit-window',
        null,
        {'e_url': url,
          'e_viewer': false});   
}

/**
 * remove a previously stored user diagram sentence
 * @TODO 
 */
Alph.Diagram.removeUserDiagram = function()
{
    
};


/**
 * get a user defined sentence from the stored diagram
 * data objects
 * @param {String} a_url not used
 * @param {String} a_doc the diagram document name
 * @param {String} a_id the sentence id
 * @returns the sentence xml (as a string)
 */
Alph.Diagram.getUserDiagram = function(a_url, a_doc, a_sentid)
{    
    var dm = window.arguments[0].e_dataManager;    
    try
    {
        var sentence_string = dm.getDataObj('diagrams',a_doc,false).getSentence(window, a_sentid);        
        return sentence_string; 
    }
    catch(a_e)
    {
        Alph.BrowserUtils.doAlert(window,'alpheios-error',a_e);
        return "";
    }  
};

/**
 * Save an update to a sentence diagram to the local data object
 * @param {Node} a_xml the sentence node
 * @param {String} a_url not used
 * @param {String} a_doc the diagram document name
 * @param {String} a_id the sentence id
 */
Alph.Diagram.putUserDiagram = function(a_xml, a_url, a_doc, a_sentid)
{
    var dm = window.arguments[0].e_dataManager;   
    try
    {
        var xml_string = XMLSerializer().serializeToString(a_xml);
        dm.getDataObj('diagrams',a_doc,false).putSentence(window, xml_string,a_sentid);
        Alph.BrowserUtils.doAlert(window,'alph-general-dialog-title','alpheios-diagram-saved');
    }
    catch(a_e)
    {
        Alph.BrowserUtils.doAlert(window,'alpheios-error',a_e);        
    }
    
};

/**
 * Implementation of nsIWebProgressListener which listens for 
 * the diagram editor page to finish loading (including all javascript)
 * and overrides the Alph.Edit.getContents and Alph.Edit.putContents
 * functions in the loaded document to enable the local get/put 
 * @see https://developer.mozilla.org/en/Code_snippets/Progress_Listeners  
 */
Alph.Diagram.s_loadListener =
    {
        d_handleLoad: false,
        QueryInterface: function(aIID)
        {
            if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
                aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                aIID.equals(Components.interfaces.nsISupports))
              return this;
            throw Components.results.NS_NOINTERFACE;
        },
        
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus)
        {
           if(aFlag & Components.interfaces.nsIWebProgressListener.STATE_START)                
           {                          
            // do nothing                                 
           }
           // only handle the load if flagged to by a change in the location bar url 
           // otherwise we end up calling resetState much too often because
           // the load state change handler is called with every ajax request
           if ((aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP) && 
                (aFlag & Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT))
           {
                if (aWebProgress.DOMWindow.AlphEdit && ! window.arguments[0].e_viewer)
                {                       
                    aWebProgress.DOMWindow.AlphEdit.getContents = Alph.Diagram.getUserDiagram;
                    aWebProgress.DOMWindow.AlphEdit.putContents = Alph.Diagram.putUserDiagram;                                            
                }                                                     
           }
           return 0;
        },
        onLocationChange: function() {},
        onProgressChange: function() {},
        onStatusChange: function() {},
        onSecurityChange: function() {},
        onLinkIconAvailable: function() {}
};
