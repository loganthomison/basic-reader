/**
 * @fileoverview This file defines the Alph.LanguageTool class prototype.
 *
 * @version $Id$
 *
 * Copyright 2008-2010 Cantus Foundation
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
 * @class  Alph.LanguageTool is the base class for language-specific
 * functionality.
 *
 * @constructor
 * @param {String} a_language  the source language for this instance
 * @param {Properties} a_properties additional properties to set as private members of
 *                                  the object (accessor methods will be dynamically created)
 */
Alph.LanguageTool = function(a_language,a_properties)
{
    this.d_sourceLanguage = a_language;
    this.d_idsFile = Array();
    this.d_defsFile = Array();

    /**
     * logger for the language
     * @type Log4Moz.Logger
     * @static
     */
    this.s_logger = Alph.BrowserUtils.getLogger('Alpheios.LanguageTool.'+ a_language);
 
    // TODO need to figure out which properties should be immutable.
    // Use of the function calls to Alph.BrowserUtils.getPref allows the properties
    // to change if the user modifies the preferences, but there may be
    // some properties for which we can't allow changes without reinstantiating
    // the object.
    var default_properties =
    {
        ContextForward:
            function()
            {
                return Alph.BrowserUtils.getPref("context_forward",a_language)
                    || 0;
            },
        ContextBack:
            function()
            {
                return Alph.BrowserUtils.getPref("context_back",a_language)
                    || 0;
            },
        PkgName:
            function()
            {
                return Alph.BrowserUtils.getPkgName(a_language);
            },
        Language:
            function()
            {
                return a_language;
            },
        LanguageCode:
            function()
            {
                var codes = Alph.BrowserUtils.getPref("languagecode",a_language);
                if (codes)
                {
                    // first code in list is the preferred code
                    return codes.split(',')[0];
                }                
            },
        PopupTrigger:
            function()
            {
                // individual language may override the popuptrigger,
                // but they don't have to
                return Alph.BrowserUtils.getPref("popuptrigger",a_language);
            },
        UseMhttpd:
            function()
            {
                return Alph.BrowserUtils.getPref("usemhttpd",a_language);
            },
        GrammarLinks:
            function()
            {
                var grammarlinklist = {};
                var links = Alph.BrowserUtils.getPref("grammar.hotlinks",a_language);
                if (typeof links != "undefined")
                {
                    links = links.split(/,/);
                    for ( var i=0; i<links.length; i++)
                    {
                        grammarlinklist[links[i]] = true;
                    }
                }
                return grammarlinklist;
            },
        Pofs:
            function()
            {
                var pofs = Alph.BrowserUtils.getPref("partsofspeech",a_language);
                if (pofs)
                {
                    return pofs.split(/,/);
                }
                else
                {
                    return [];
                }

            },
        Direction:
            function()
            {
                return Alph.BrowserUtils.getPref("textdirection",a_language);                
            }
            
    };

    this.setAccessors(default_properties);
    this.setAccessors(a_properties);

    // TODO - should the list of methods to call here to generate the
    // language-specific functionality be automatically determined from
    // the configuration?
    this.setFindSelection();
    this.setLexiconLookup();
    this.setContextHandler();
    this.setShiftHandler();
    this.loadConverter();

    var startup_methods = Alph.BrowserUtils.getPref("methods.startup",a_language);
    if (typeof startup_methods != "undefined")
    {
        startup_methods = startup_methods.split(/,/);
        for (var i=0; i<startup_methods.length; i++)
        {
            var method_name = startup_methods[i];
            // is the method in the Alph.LanguageTool object?
            if (typeof this[method_name] == 'function')
            {
                this.s_logger.debug("Calling " + method_name + " for " + a_language);
                this[method_name]();
                // TODO should we throw an error if the startup method returns
                // false?
            }
            else
            {
                this.s_logger.warn("Startup method " + method_name +
                              " for " + a_language +
                              " not defined");
            }
        }
    }

    this.lexiconSetup();
};

/**
 * loads the converter object
 * by default loads the base Alph.Convert object
 * override to use a language-specific converter
 */
Alph.LanguageTool.prototype.loadConverter = function()
{
    this.d_converter = new Alph.Convert();  
};

/**
 * load lemma id lookup files
 * @returns true if successful, otherwise false
 * @type boolean
 */
Alph.LanguageTool.prototype.loadLexIds = function()
{
    this.d_idsFile = Array();
    this.d_fullLexCode = Alph.BrowserUtils.getPref("dictionaries.full",
                                      this.d_sourceLanguage).split(',');
    var contentUrl = Alph.BrowserUtils.getContentUrl(this.d_sourceLanguage);
    var langCode = this.getLanguageCode();
    var langString = this.getLanguageString();

    for (var i = 0; i < this.d_fullLexCode.length; ++i)
    {
        var lexCode = this.d_fullLexCode[i];
        var fileName = contentUrl +
                       '/dictionaries/' +
                       lexCode +
                       '/' +
                       langCode +
                       '-' +
                       lexCode +
                       "-ids.dat";
        try
        {
            this.d_idsFile[i] = new Alph.Datafile(fileName, "UTF-8");
            this.s_logger.info(
                "Loaded " +
                langString +
                " ids for " +
                this.d_fullLexCode[i] +
                "[" +
                this.d_idsFile[i].getData().length +
                " bytes]");
        }
        catch (ex)
        {
            // the ids file might not exist, in particular for remote,
            // non-alpheios-provided dictionaries
            // so just quietly log the error in this case
            // later code must take a null ids file into account
            this.s_logger.error("error loading " +
                                langString +
                                " ids from " +
                                fileName +
                                ": " +
                                ex);
            return false;
        }
    }
    return true;
}

/**
 * Initializes lexicon search parameters
 */
Alph.LanguageTool.prototype.lexiconSetup = function()
{
    // nothing to do if no language defined
    var language = this.d_sourceLanguage;
    if (!language || typeof language == "undefined")
        return;

    // read lexicon parameters
    // look first for lexicon-specific values and then, if not found,
    // for generic lexicon-independent values
    this.s_logger.debug("Reading params for " + language);
    this.d_lexiconSearch = Array();
    var codeList;
    try 
    {
        codeList = Alph.BrowserUtils.getPref("dictionaries.full", language)
    }
    catch(a_e){
        // the preference might not be defined
        codeList = null;
    }
    var codes = (codeList ? codeList.split(',') : Array());
    var defaultBase = "dictionary.full.search.";
    for (var i = 0; i < codes.length; ++i)
    {
        var code = codes[i];
        var base = "dictionary.full." + code + ".search.";
        this.d_lexiconSearch[code] = Array();
        this.d_lexiconSearch[code]["url"] =
            Alph.BrowserUtils.getPref(base + "url", language);

        // if lexicon-specific URL is defined
        if (this.d_lexiconSearch[code]["url"])
        {
            // read lexicon-specific values
            this.d_lexiconSearch[code]["lemma"] =
                Alph.BrowserUtils.getPref(base + "lemma_param", language);
            this.d_lexiconSearch[code]["id"] =
                Alph.BrowserUtils.getPref(base + "id_param", language);
            this.d_lexiconSearch[code]["multiple"] =
                Alph.BrowserUtils.getPref(base + "multiple", language);
            this.d_lexiconSearch[code]["convert"] =
                Alph.BrowserUtils.getPref(base + "convert_method", language);
            this.d_lexiconSearch[code]["transform"] =
                Alph.BrowserUtils.getPref(base + "transform_method", language);
        }
        // else use lexicon-independent values
        else
        {
            this.d_lexiconSearch[code]["url"] =
                Alph.BrowserUtils.getPref(defaultBase + "url", language);
            this.d_lexiconSearch[code]["lemma"] =
                Alph.BrowserUtils.getPref(defaultBase + "lemma_param", language);
            this.d_lexiconSearch[code]["id"] =
                Alph.BrowserUtils.getPref(defaultBase + "id_param", language);
            this.d_lexiconSearch[code]["multiple"] =
                Alph.BrowserUtils.getPref(defaultBase + "multiple", language);
            this.d_lexiconSearch[code]["convert"] =
                Alph.BrowserUtils.getPref(defaultBase + "convert_method",
                                  language);
            this.d_lexiconSearch[code]["transform"] =
                Alph.BrowserUtils.getPref(defaultBase + "transform_method",
                                  language);
        }
    }
};

/**
 * source langage for this instance
 * this is used often, so its set as a regular property
 * rather than wrapped in the auto-generated accessor methods
 * @private
 * @type String
 */
Alph.LanguageTool.prototype.d_sourceLanguage = '';

/**
 * Creates accessor methods on the instance for the
 * supplied properties object
 * @private
 * @param {Properties} a_properties properties for which to set accessors
 *                      if a property value is a function, this
 *                      function will be called and its value returned
 *                      by the get accessor, otherwise,the value will
 *                      be returned as-is
 */
Alph.LanguageTool.prototype.setAccessors = function(a_properties)
{
    var myobj = this;
    for ( var prop in a_properties )
    {
        ( function()
        {
            var myprop = prop;
            myobj[ "get"+ myprop ] = function()
            {
                if (typeof a_properties[myprop] == 'function')
                {
                    return a_properties[myprop]();
                }
                else
                {
                    return a_properties[myprop];
                }
            };

            myobj[ "set" + myprop ] = function(val)
            {
                a_properties[myprop] = val;
            };

        }
        )();
    }
};

/**
 * Sets the findSelection method for the instance of the class.
 * This is derived according to the language-specific configuration.
 * @see #findSelection
 * @private
 */
Alph.LanguageTool.prototype.setFindSelection = function()
{
    // get the base unit
    // default to 'word' if not defined
    var base_unit =
        Alph.BrowserUtils.getPref('base_unit',
                         this.d_sourceLanguage) || 'word';
    if (base_unit == 'word')
    {
        /**
         * @ignore
         */
        this.findSelection = function(a_ro, a_rangstr)
            {
                var alphtarget = this.doSpaceSeparatedWordSelection(a_ro, a_rangstr);
                return this.handleConversion(alphtarget);
            }
    }
    else if (base_unit == 'character')
    {
        /**
         * @ignore
         */
        this.findSelection = function(a_ro, a_rangstr)
            {
                var alphtarget = this.doCharacterBasedWordSelection(a_ro, a_rangstr);
                return this.handleConversion(alphtarget);
            }
    }
    else
    {
        // unknown
    }
};

/**
 * Given a string and an offset into that string find the word or words
 * which encompass the range offset (to be fed to a lexicon tool).
 * @param {int} a_ro the range offset
 * @param {String} a_rngstr the string of characters containing the range offset
 * @returns {@link Alph.SourceSelection} object
 * @type Alph.SourceSelection
 */
Alph.LanguageTool.prototype.findSelection = function(a_ro, a_rngstr)
{
    alert("No selection method defined");
    return {};
};

/**
 * Sets the lexiconLookup method for the instance of the class.
 * This is derived according to the language-specific configuration.
 * @see #lexiconLookup
 * @private
 */
Alph.LanguageTool.prototype.setLexiconLookup = function()
{
    var lexicon_method =
        Alph.BrowserUtils.getPref("methods.lexicon",this.d_sourceLanguage);
    
    if (lexicon_method == 'webservice')
    {        
        
        /**
         * @ignore
         */
        this.lexiconLookup = function(a_alphtarget,a_onsuccess,a_onerror)
        {
            this.s_logger.info("Query word: " + a_alphtarget.getWord());

            var url = Alph.BrowserUtils.getPref("url.lexicon",this.d_sourceLanguage);
            // override local daemon per main prefs
            if (Alph.Util.isLocalUrl(url) && Alph.BrowserUtils.getPref("morphservice.remote"))
            {
		   url = Alph.BrowserUtils.getPref("morphservice.remote.url");
             
            }
            url = url + Alph.BrowserUtils.getPref("url.lexicon.request",this.d_sourceLanguage);
            url = url.replace(/\<WORD\>/,
                                  encodeURIComponent(a_alphtarget.getWord()));
            // TODO add support for the context in the lexicon url

    
            Alph.$.ajax(
                {
                    type: "GET",
                    url: url,
                    timeout: Alph.BrowserUtils.getPref("url.lexicon.timeout",this.d_sourceLanguage),
                    dataType: 'html', //TODO - get from prefs
                    error: function(req,textStatus,errorThrown)
                    {
                        a_onerror(textStatus||errorThrown);
                    },
                    success: function(data, textStatus)
                        { a_onsuccess(data); }
                   }
            );
        }
        
    }
    else if (typeof this[lexicon_method] == 'function')
    {
        this.lexiconLookup = this[lexicon_method];
    }
    else
    {
        this.s_logger.error("methods.lexicon invalid or undefined: " + lexicon_method);
    }
}

/**
 * Looks up the target selection in the lexicon tool
 * @param {Alph.SourceSelection} a_alphtarget the target selection object (as returned by findSelection)
 * @param {function} a_onsuccess callback upon successful lookup.
 *                               Takes the lexicon output as an argument.
 * @param {function} a_onerror callback upon successful lookup.
 *                             Takes an error message as argument.
 */
Alph.LanguageTool.prototype.lexiconLookup = function(a_alphtarget,a_onsuccess,a_onerror)
{
    a_onerror(Alph.Main.getString("alph-error-nolexicon",[this.d_sourceLanguage]));
};

/**
 * Set the contextHandler method for the instance of the class.
 * This is derived according to the language-specific configuration.
 * @see #contextHandler
 * @private
 */
Alph.LanguageTool.prototype.setContextHandler = function()
{
    var context_handler =
        Alph.BrowserUtils.getPref("context_handler",this.d_sourceLanguage);
    if (typeof this[context_handler] == 'function')
    {
        this.contextHandler = this[context_handler];
    }
    else
    {
        this.s_logger.info("No context_handler defined for " + this.d_sourceLanguage);
    }

}
/**
 * Method which can be used to add language-specific
 * handler(s) to the body of the popup
 * @param {Document} a_doc the content document for the window
 * TODO - does this really need to be the whole document
 *        or just the popup?
 */
Alph.LanguageTool.prototype.contextHandler = function(a_doc)
{
    // default is to do nothing
    return;
};

/**
 * Set the shiftHandler method for the instance of the class.
 * This is derived according to the language-specific configuration.
 * @see #shiftHandler
 * @private
 */
Alph.LanguageTool.prototype.setShiftHandler = function()
{
    var shift_handler =
        Alph.BrowserUtils.getPref("shift_handler",this.d_sourceLanguage);
    if (typeof this[shift_handler] == 'function')
    {
        this.shiftHandler = this[shift_handler];
    }
    else
    {
        this.s_logger.debug("No shift_handler defined for " + this.d_sourceLanguage);
    }
}
/**
 * Method which can be used to add a handler for the shift key
 * TODO - this should really be a generic keypress handler
 * @param {Event} a_event the keypress event
 * @param {Node} a_node the target node
 */
Alph.LanguageTool.prototype.shiftHandler = function(a_event,a_node)
{
    // default is to do nothing
    return;
};

/**
 * Helper method for {@link #findSelection} which
 * identifies target word and surrounding
 * context for languages whose words are
 * space-separated
 * @see #findSelection
 * @private
 */
Alph.LanguageTool.prototype.doSpaceSeparatedWordSelection =
function(a_ro, a_rngstr)
{

    var result = new Alph.SourceSelection();

    // clean string:
    //   convert punctuation to spaces
    a_rngstr =
      a_rngstr.replace(new RegExp("[" + this.getPunctuation() + "]","g")," ");        
    this.s_logger.debug("In doSpaceSeparatedWordSelection for " + a_rngstr);

    // If the user selected whitespace in the margins of a range
    // just return.
    if (this.selectionInMargin(a_ro, a_rngstr))
    {
        // return for mouseover whitespace
        return result;
    }

    // skip back to end of previous word
    while ((a_ro > 0) && (a_rngstr[--a_ro] == ' '));

    // remove leading white space
    var nonWS = a_rngstr.search(/\S/);
    a_rngstr = a_rngstr.substr(nonWS).replace(/(\r|\n)/, " ");
    a_ro -= nonWS;

    // find word
    var wordStart = a_rngstr.lastIndexOf(" ", a_ro) + 1;
    var wordEnd = a_rngstr.indexOf(" ", a_ro);

    if (wordEnd == -1)
        wordEnd = a_rngstr.length;


    // if empty, nothing to do
    if (wordStart == wordEnd)
    {
        return result;
    }

    //extract word
    var word = a_rngstr.substring(wordStart,wordEnd);


    /* Identify the words preceeding and following the focus word
     * TODO - if the content is marked up, and the word is the only
     * word in the parent of the rangeParent text node, we should
     * traverse the DOM tree to pull in the surrounding context.
     *
     * We also need to be able to pull surrounding context for text
     * nodes that are broken up by formatting tags (<br/> etc))
     */
    var context_forward = this.getContextForward();
    var context_back = this.getContextBack();

    var context_str = null;
    var context_pos = 0;

    if (context_forward || context_back) {
        var startstr = a_rngstr.substring(0, wordEnd);
        var endstr = a_rngstr.substring(wordEnd+1, a_rngstr.length);
        var pre_wordlist = startstr.split(/\s+/);
        var post_wordlist = endstr.split(/\s+/);

        // limit to the requested # of context words
        // prior to the selected word
        // the selected word is the last item in the
        // pre_wordlist array
        if (pre_wordlist.length > context_back + 1) {
            pre_wordlist =
            pre_wordlist.slice(pre_wordlist.length-(context_back + 1));
        }
        // limit to the requested # of context words
        // following to the selected word
        if (post_wordlist.length > context_forward)
        {
            post_wordlist = post_wordlist.slice(0, context_forward);
        }

        /* TODO: should we put the punctuation back in to the
        * surrounding context? Might be necessary for syntax parsing.
        */
        context_str =
            pre_wordlist.join(" ") + " " + post_wordlist.join(" ");
        context_pos = pre_wordlist.length - 1;
    }

    result.setWord(word);
    result.setWordStart(nonWS + wordStart);
    result.setWordEnd(nonWS + wordEnd);
    result.setContext(context_str);
    result.setContextPos(context_pos);
    return result;
};

/**
 * Helper method for {@link #findSelection} which identifies
 * target word and surrounding context for languages
 * whose words are character based
 * @see #findSelection
 * @private
 */
Alph.LanguageTool.prototype.doCharacterBasedWordSelection =
function(a_ro, a_rngstr)
{
    var result = new Alph.SourceSelection();

    // clean string:
    //   convert punctuation to spaces
    a_rngstr.replace(new RegExp("[" + this.getPunctuation() + "]","g")," ");

    // If the user selected whitespace in the margins of a range
    // just return.
    if (this.selectionInMargin(a_ro, a_rngstr))
    {
        // return for mouseover whitespace
        return result;
    }

    // remove leading white space
    var nonWS = a_rngstr.search(/\S/);
    a_rngstr = a_rngstr.substr(nonWS).replace(/(\r|\n)/, " ");
    a_ro -= nonWS;

    // TODO - handle spaces between characters

    // find word
    var wordStart = a_ro;
    var wordEnd = a_ro;
    //a_rngstr.indexOf(" ", a_ro);

    //if (wordEnd == -1)
    //    wordEnd = a_rngstr.length;


    // if empty, nothing to do
    //if (wordStart == wordEnd)
    //{
    //    return result;
    //}

    //extract word
    var word = a_rngstr.charAt(a_ro);


    /* Identify the words preceeding and following the focus word
     * TODO - if the content is marked up, and the word is the only
     * word in the parent of the rangeParent text node, we should
     * traverse the DOM tree to pull in the surrounding context.
     *
     * We also need to be able to pull surrounding context for text
     * nodes that are broken up by formatting tags (<br/> etc))
     */
    var context_forward = this.getContextForward();
    var context_back = this.getContextBack();

    var context_str = null;
    var context_pos = 0;

    if (context_forward || context_back) {
        var startstr = a_rngstr.substring(0, wordEnd);
        var next_space = a_rngstr.indexOf(" ", a_ro);

       var endstr;
       if ( next_space != -1 &&
            context_forward > 0 &&
            (next_space-a_ro) < context_forward)
       {
            endstr = a_rngstr.substring(wordEnd+1,next_space)
        }
        else
        {
            endstr = a_rngstr.substr(wordEnd+1, context_forward);
        }

        context_str = word + endstr;
        context_pos = 0;
    }
    result.setWord(word);
    result.setWordStart(nonWS + wordStart);
    result.setWordEnd(nonWS + wordEnd);
    result.setContext(context_str);
    result.setContextPos(context_pos);
    return result;
}

/**
 * Generic method to apply any necessary conversion
 * to the source text selection.
 * Delegates to a language-specific
 * conversion method.
 * @private
 * @param {Alph.SourceSelection} a_alphtarget the object returned by {@link #findSelection}
 */
Alph.LanguageTool.prototype.handleConversion = function(a_alphtarget)
{
    var self = this;
    var convert_method =
        Alph.BrowserUtils.getPref("methods.convert",this.d_sourceLanguage);

    if (convert_method != null
        && typeof this.d_converter[convert_method] == 'function'
        && a_alphtarget.getWord())
    {
        a_alphtarget.convertWord( function(a_word) { return self.d_converter[convert_method](a_word); } );
    }

    return a_alphtarget;
};

Alph.LanguageTool.prototype.convertString = function(a_str)
{
  var convert_method =
        Alph.BrowserUtils.getPref("methods.convert",this.d_sourceLanguage);

    if (convert_method != null
        && typeof this.d_converter[convert_method] == 'function')
    {
        a_str = this.d_converter[convert_method](a_str);
    }
    return a_str;
}


/**
 * Handler which can be used as the contextHander.
 * It uses language-specific configuration to identify
 * the elements from the alph-text popup which should produce links
 * to the language-specific grammar.
 * @see #contextHandler
 */
Alph.LanguageTool.prototype.grammarContext = function(a_doc)
{
    var myobj=this;
    var links = this.getGrammarLinks();

    for (var link_name in links)
    {
        if (links.hasOwnProperty(link_name))
        {
            Alph.$(".alph-entry ." + link_name,a_doc).bind('click',link_name,
                function(a_e)
                {
                      // build target inside grammar
                      var target = a_e.data;
                      var rngContext = Alph.$(this).attr("context");
                      if (rngContext != null)
                      {
                        target += "-" + rngContext.split(/-/)[0];
                      }
                      myobj.openGrammar(a_e.originaEvent,this,target);
                }
            );
        }
    }
};

/**
 * Open the Grammar defined for the language.
 * @param {Event} a_event the event which triggered the request
 * @param {Node} a_node the DOM node to show a loading message next to (optional)
 * @param {String} a_target a string to be added to the Grammar url (replacing the <ITEM> placeholder (optional)
 * @param {Object} a_params parameters object to pass to the Grammar window (optional)
 */
Alph.LanguageTool.prototype.openGrammar = function(a_event,a_node,a_target,a_params)
{
    var thisObj = this;
    var targetURL = Alph.BrowserUtils.getPref("url.grammar",this.d_sourceLanguage) || "";
    targetURL = targetURL.replace(/\<ITEM\>/, a_target || "");

    var grammar_loading_msg = Alph.Main.getString("alph-loading-grammar");
    var features =
    {
        screen: Alph.BrowserUtils.getPref("grammar.window.loc")
    };

    // TODO - list of parameters to pass should come from
    // preferences
    var params = Alph.$.extend(
        {
            target_href: a_target,
            callback: a_node ? 
                      function() { Alph.Xlate.hideLoadingMessage(a_node.ownerDocument) }
                      : function() {},
            lang_tool: thisObj
        },
        a_params || {}
    );
    // open or replace the grammar window
    Alph.Xlate.openSecondaryWindow(
        "alph-grammar-window",
        targetURL,
        features,
        params,
        Alph.Xlate.showLoadingMessage,
            [a_node||{},grammar_loading_msg]
    );
};

/**
 * Default Diagram window - assumes treebank diagram url points at a fully
 * functional external treebank editor and which specifies any required parameters
 * with placeholders for the dynamically selected SENTENCE and WORD.
 * @param {Event} a_event the event which triggered the request
 * @param {String} a_title the window title
 * @param {Node} a_node the DOM node to show a loading message next to (optional)
 * @param {Object} a_params parameters object to pass to the window (optional)
 */
Alph.LanguageTool.prototype.openDiagram = function(a_event,a_title,a_node,a_params)
{
    var thisObj = this;   
    if (! a_title)
    {
        // translation panel and source document diagrams should open in separate windows
        if (Alph.Translation.getBrowser(Alph.$(a_node).get(0).ownerDocument))
        {
            a_title = 'alph-trans-diagram-window';   
        } 
        else
        {
            a_title = 'alph-diagram-window';
        }
    }
    
    var features = {};

    var window_url = Alph.BrowserUtils.getContentUrl() + "/diagram/alpheios-diagram.xul";
    var params = Alph.$.extend(
        {
            e_callback: a_node ? 
                      function() { Alph.Xlate.hideLoadingMessage(a_node.ownerDocument) }
                      : function() {},
            e_langTool: thisObj,
            e_srcDoc: a_node ? a_node.ownerDocument : null,
            e_proxiedEvent: thisObj.getPopupTrigger(),
            e_proxiedHandler: Alph.Main.doXlateText,
            e_dataManager : Alph.DataManager,
            e_viewer: true,
            e_metadata: { 'alpheios-getSentenceURL': window_url,
                        'alpheios-putSentenceURL': window_url }            
        },
        a_params || {}
    );
            

    var loading_node = Alph.$("#alph-word-tools",a_node).get(0);    
    if (a_node && ! params.e_url)
    {
        var treebankUrl = Alph.Site.getTreebankDiagramUrl(a_node.ownerDocument);
        var tbrefs = a_params.tbrefs;
        var sentence;
        var word;
        if (treebankUrl && tbrefs)
        {
            try
            {
                // just use the first reference as the focus if there are multiple
                var allrefs = tbrefs.split(' ');
                var parts = allrefs[0].split(/-/);
                sentence = parts[0];
                word = parts[1];
            }
            catch(a_e)
            {
                Alph.Main.s_logger.error("Error identifying sentence and id: " + a_e);                   
            }
        }
        if (sentence)
        {
            treebankUrl = treebankUrl.replace(/SENTENCE/, sentence);
            treebankUrl = treebankUrl.replace(/WORD/, word);
            params.e_url = treebankUrl;
        }
    }
    
    if (params.e_url)
    {
        // open or replace the diagram window
        Alph.Xlate.openSecondaryWindow(
            a_title,
            window_url,            
            features,
            params,
            Alph.Xlate.showLoadingMessage,
                [loading_node||{}, Alph.Main.getString("alph-loading-misc")]                
        );
    }
    else
    {
        this.s_logger.warn("No tree url");
        Alph.BrowserUtils.doAlert(window,"alph-general-dialog-title","alph-error-tree-notree");
    }
};

/**
 * Handler which can be used to show context-specific inflection tables
 * @param {Event} a_event the target event
 * @param {Object} a_otherparams option object to supply default parameters
 * @param {Node} a_node the node which contains the context
 */
Alph.LanguageTool.prototype.handleInflections = function(a_event,a_node,a_otherparams)
{

    var params = a_otherparams || {};

    // if we weren't explicitly handled a node to work with, try to find the popup
    // in the default content document
    if (! a_node)
    {
        a_node = Alph.$("#alph-text", Alph.Xlate.getLastDoc()).clone();
    }
    if (Alph.$(a_node).length != 0)
    {
            params = this.getInflectionTable(a_node,params);
    }

    if (typeof params.showpofs == 'undefined')
    {
        params.xml_url =
            Alph.BrowserUtils.getContentUrl(this.d_sourceLanguage)
            + "/inflections/alph-infl-index.xml";
        params.xslt_processor = Alph.BrowserUtils.getXsltProcessor('alph-infl-index.xsl');
    }
    params.source_node = a_node;

    // give the inflections window a reference to this language tool
    params.lang_tool = this;

    if (params.query_mode)
    {
        params.xslt_params.e_showOnlyMatches = true;
    }
    this.s_logger.debug("Handling inflections for " + params.showpofs);

    // send the word endings to the declension table
    // if the window isn't already open, open it
    // TODO window features should be language-specific
    var features =
    {
        width:"300",
        height:"620",
        screen: Alph.BrowserUtils.getPref("shift.window.loc")
    }
    // add a callback to hide the loading message
    var loading_msg = Alph.Main.getString("alph-loading-inflect");

    var loading_node;
    if (Alph.$(a_node).length >0)
    {
        /**
         * @ignore
         */
        params.callback = function() { Alph.Xlate.hideLoadingMessage(Alph.$(a_node).get(0).ownerDocument) };
        loading_node = Alph.$("#alph-word-tools",a_node).get(0);
    }
    else
    {
        /**
         * @ignore
         */
        params.callback = function() {};
        loading_node = {};
    }
     
    Alph.Xlate.openSecondaryWindow(
                    "alph-infl-table",
                    Alph.BrowserUtils.getContentUrl() + "/infl/alpheios-infl.xul",
                    features,
                    params,
                    Alph.Xlate.showLoadingMessage,[loading_node,loading_msg]
    );
    this.s_logger.info("Inflections window should have focus with "
            + Alph.Main.getStateObj().getVar("word"));
}

/**
 * Handler which can be used to show context-specific inflection tables
 * for the morpohology panel
 * @param {Event} a_event the target event
 * @param {Node} a_node the node which contains the context
 */
Alph.LanguageTool.prototype.handleInflectionsForMorphWindow = function(a_event,a_node)
{
    var morph_doc = Alph.$("#alph-morph-body").get(0).contentDocument;
    var morph_text = Alph.$("#alph-text",morph_doc);
    this.handleInflections(a_event,morph_text);
}

/**
 * Check to see if this language tool can produce an inflection table display
 * for the current node
 */
Alph.LanguageTool.prototype.canInflect = function(a_node)
{
    var params = this.getInflectionTable(a_node,{},true);
    return (typeof params.showpofs == 'string');
}

/**
 * Helper function to determine if the user's selection
 * is in the margin of the document
 * @private
 * @param {int} a_ro the range offset for the selection
 * @param {String} a_rngstr the enclosing string
 * @returns true if in the margin, false if not
 * @type Boolean
 */
Alph.LanguageTool.prototype.selectionInMargin = function(a_ro, a_rngstr)
{
    // Sometimes mouseover a margin seems to set the range offset
    // greater than the string length, so check that condition,
    // as well as looking for whitepace at the offset with
    // only whitespace to the right or left of the offset
    var inMargin =
        a_ro >= a_rngstr.length ||
        ( a_rngstr[a_ro].indexOf(" ") == 0 &&
            (a_rngstr.slice(0,a_ro).search(/\S/) == -1 ||
             a_rngstr.slice(a_ro+1,-1).search(/\S/) == -1)
        );
    return inMargin;
};

/**
 * Adds the language specific stylesheet to the window
 * content document, to apply to the display of the popup
 * @param {Document} a_doc the window content document
 * @param {String} a_name name of the stylesheet
 *                        (optional - if not specified package
 *                        name will be used)
 */
Alph.LanguageTool.prototype.addStyleSheet = function(a_doc,a_name)
{
    var pkgname = this.getPkgName();
    var css_url = Alph.BrowserUtils.getStyleUrl(this.d_sourceLanguage);
    if (typeof a_name == "undefined")
    {
        a_name = pkgname;
    }
    css_url = css_url + '/' + a_name + ".css"
    
    // only add the stylesheet if it's not already there
    if (Alph.$("link[href='"+ css_url + "']",a_doc).length == 0)
    {
        this.s_logger.debug("adding stylesheet: " + css_url);
        var css = a_doc.createElementNS(
            "http://www.w3.org/1999/xhtml","link");
        css.setAttribute("rel", "stylesheet");
        css.setAttribute("type", "text/css");
        css.setAttribute("href", css_url);
        css.setAttribute("id", a_name + "-css");
        css.setAttribute("class","alpheios-lang-css");
        Alph.$("head",a_doc).append(css);
    }
};

/**
 * Removes the language specific stylesheet
 *  from the window content document.
 * @param {Document} a_doc the window content document
 * @param {String} a_name name of the stylesheet
 *                       (optional - if not specified package
 *                       name will be used)
 */
Alph.LanguageTool.prototype.removeStyleSheet = function(a_doc,a_name)
{
    var pkgname = this.getPkgName();
    var css_url = Alph.BrowserUtils.getStyleUrl(this.d_sourceLanguage);
    if (typeof a_name == "undefined")
    {
        a_name = pkgname;
    }
    css_url = css_url + '/' + a_name + ".css"
    Alph.$("link[href='"+css_url + "']",a_doc).remove();
};

/**
 * Method which can be used to apply post-transformation
 * changes to the transformed lexicon output
 * @param {Node} a_node the HTML DOM node containing the lexicon output
 */
Alph.LanguageTool.prototype.postTransform = function(a_node)
{
    // no default behavior
};

/**
 * Method which should be used to retrieve the path to
 * the correct parameters for the inflection window given the
 * properties of the target word.
 * @param {Node} a_node the node containing the target word
 * @param {String} a_params optional requested parameters
 * @param {Boolean} a_skipload optional flag to indicate the xslt load should be skipped
 * @returns the parameters object for the inflection window
 */
Alph.LanguageTool.prototype.getInflectionTable = function(a_node, a_params, a_checkonly)
{
    // no default behavior
    return;
};

/**
 * Method which checks the availability of a specific feature
 * @param {String} a_id the id of the feature
 * @returns {Boolean} true if enabled, otherwise false
 */
Alph.LanguageTool.prototype.getFeature = function(a_id)
{
    var enabled = Alph.BrowserUtils.getPref("features."+a_id,this.d_sourceLanguage);
    this.s_logger.debug("Feature " + a_id + " for " + this.d_sourceLanguage + " is " + enabled);
    return enabled;
};

/**
 * Method which returns the requested command
 * @param {String} a_cmd the name of the command
 * @returns {String} the name of the function associated with the command
 *                  or undefined.
 */
Alph.LanguageTool.prototype.getCmd = function(a_cmd)
{
    return Alph.BrowserUtils.getPref("cmds."+a_cmd,this.d_sourceLanguage);
};

/**
 * Method returns a language-specific file from the index_files directory
 * of the language chrome.
 * Temporary until we figure out how we really want to handle this
 * @param {String} a_docid The id (name) of the file to retrieve
 */
Alph.LanguageTool.prototype.getIndexFile = function(a_docid)
{
    return Alph.BrowserUtils.getContentUrl(this.d_sourceLanguage) + "/index_files/" + a_docid;
};

/**
 * Method which applies language-specific post-processing to the
 * inflection table display
 * @param {Element} a_tbl the inflection table DOM element
 */
Alph.LanguageTool.prototype.handleInflectionDisplay = function(a_tbl)
{
  // default does nothing
};

/**
 * Check to see if one or more full dictionaries are available
 * @returns true if a dictionary is available, false if not
 * @type Boolean
 */
Alph.LanguageTool.prototype.hasDictionary = function()
{
    // if no dictionary is defined for the language, return null
    var has_dict = false;
    var codeList;
    try 
    {
        codeList = Alph.BrowserUtils.getPref("dictionaries.full",this.d_sourceLanguage).split(/,/);
    }
    catch(a_e){
        // the preference might not be defined
        codeList = [];
    }
    
    var remote_disabled = Alph.BrowserUtils.getPref("disable.remote");
    for (var i=0; i<codeList.length; i++)
    {
        var code = codeList[i];
        // if a dictionary wasn't setup properly
        // disable the dictionary feature
        if (typeof this.d_lexiconSearch[code] == 'undefined')
        {
            has_dict = false;
            break;
        }
        // if remote features are disabled and any of  the dictionaries 
        // uses a remote url, disable the dictionary feature
        else if ( remote_disabled &&  
                  ! Alph.Util.isLocalUrl(this.d_lexiconSearch[code].url)
                )
         {
            has_dict = false;
            break;        
         }
         // otherwise dictionary was setup so feature is enabled
         else
         {
            has_dict = true;  
         }    
    }
    return has_dict;
}

/**
 * Get the browse url of the current dictionary
 * @param {String} a_dict the requested dictionary (use default if null)
 * @param {Node} a_entry the dictionary entry node 
 * @param {Boolean} a_browseRoot flag to browse to a specific root entry
 * @returns the browse url of the dictionary or null if none defined
 * @type String
 */
Alph.LanguageTool.prototype.getDictionaryBrowseUrl = function(a_dict,a_entry,a_browseRoot)
{
    var browse_url = null;
    var dict = a_dict;
    if (dict == null)
    {
    	dict = this.getDictionary();
    }    
    if (dict != null)
    {
		var body_key = Alph.$(a_entry).attr("body-key");
		var key_url =Alph.BrowserUtils.getPref(
                "dictionary.full." + dict + ".browse.url." + body_key,
                this.d_sourceLanguage);
		if (body_key && key_url)
		{
			browse_url = key_url;
		}
		else
		{
			browse_url =
	            Alph.BrowserUtils.getPref(
	                "dictionary.full." + dict + ".browse.url",
	                this.d_sourceLanguage);	
		}    	    	
    	if (a_browseRoot && Alph.$(a_entry).attr("root"))
    	{    		    		
    		var root_param = Alph.BrowserUtils.getPref(
                    "dictionary.full." + dict + ".browse.root_param",
                    this.d_sourceLanguage);
    		if (root_param != null)
    		{      	                
    			var cvt = 
    				Alph.BrowserUtils.getPref("dictionary.full." + dict
    						+ ".browse.convert_method", this.d_sourceLanguage);
    			var root_term = Alph.$(a_entry).attr("root");
    			if (cvt != null
    				        && typeof this.d_converter[cvt] == 'function')                
                {
                    root_term = this.d_converter[cvt](root_term);
    			}
    			root_param = root_param.replace(/\<ROOT\>/, encodeURIComponent(root_term));
    			browse_url = browse_url + root_param; 
    		}
    	}
    	 
    }    
    return browse_url;
}

/**
 * Get html for a link to the current dictionary
 * @returns html to add to an element to produce a link to the dictionary
 * @type String
 */
Alph.LanguageTool.prototype.getDictionaryLink = function()
{
    var link = '';
    if (this.hasDictionary())
    {
        var dict_alt_text = Alph.Main.getString('alph-dictionary-link');
        link = '<div class="alph-tool-icon alpheios-button alph-dict-link" ' +
               'href="#alph-dict" title="' + dict_alt_text + '">' +
               '<img src="' + Alph.BrowserUtils.getStyleUrl() + '/icons/wordlist_16.png" ' +
               'alt="' + dict_alt_text + '"/>' + 
               '<div class="alpheios-icon-label">' + dict_alt_text + '</div></div>';
    }
    return link;
}

/**
 * Returns a callback to the current dictionary for the language
 * which can be used to populate a display with HTML including a full
 * definition for a lemma or list of lemmas. The HTML produced by the lookup
 * method should include a separate div for each lemma, with an attribute named
 * 'lemma' set to the name of the lemma.
 * @returns {function} a function which accepts the following parameters:
 *                      {String} a_dict_name dictionary_name,
 *                      {Array}  a_lemmas list of lemmas
 *                      {function} a_success callback function for successful lookup
 *                      {function} a_error callback function for error
 *                      {function} a_complete callback function upon completion
 * @returns {Object} null if no default dictionary is defined for the language
 */
Alph.LanguageTool.prototype.getDictionaryCallback = function()
{
    // if we have a specific method defined for producing
    // the dictionary urls for this dictionary, then use it
    // otherwise use the default method
    var dict_method = null;
    if (this.hasDictionary())
    {
        dict_method =
            Alph.BrowserUtils.getPref(
                "methods.dictionary.full.default",
                this.d_sourceLanguage);
    }

    var lang_obj = this;
    var dict_callback =
        function(a_lemmas,a_success,a_error,a_complete)
        {
            lang_obj[dict_method](a_lemmas,a_success,a_error,a_complete);
        };

    return dict_callback;
}

/**
 * Default dictionary lookup method to call a webservice.
 * The url for the webservice is expected to be defined in the language-specific
 * preference setting: url.dictionary.full.<dict_name> and the name of a url parameter
 * to set to the lemma in url.dictionary.full.dict_name.lemma_param. If the setting
 * methods.dictionary.full.default.multiple_lemmas_allowed is true, then a single
 * request  will be issued for all lemmas, otherwise, separate requests for
 * each lemma.
 * @param {Array} a_lemmas the list of lemmas to be looked up
 * @param {function} a_success callback to be executed upon successful lookup
 * @param {function} a_error callback to be executed upon error
 * @param {function} a_complete callback to be executed upon completion
 */
Alph.LanguageTool.prototype.defaultDictionaryLookup =
    function(a_lemmas, a_success, a_error, a_complete)
{
    var lang_obj = this;
    var lastLemma = -1;

    // see if we can add any ids
    a_lemmas.forEach(
        function(a_lemma, a_i)
        {
            // if no id found yet
            if (!a_lemma[0])
            {
                // try to find id
                var lemma_id = lang_obj.getLemmaId(a_lemma[1]);
                a_lemma[0] = lemma_id[0];
                a_lemma[3] = lemma_id[1];
                if (a_lemma[0])
                {
                    lang_obj.s_logger.debug("found id " + a_lemma[0] +
                                  " for lemma " + a_lemma[1] +
                                  " in " + a_lemma[3]);
                }
            }

            // convert any lemma that has no id
            if (!a_lemma[0] && a_lemma[1] && a_lemma[3])
            {
                // if conversion method specified, apply it
                var cvt = lang_obj.d_lexiconSearch[a_lemma[3]]["convert"];
                if (cvt)
                    a_lemma[1] = Alph.Convert[cvt](a_lemma[1]);
            }

            // remember last lemma with a lexicon
            if (a_lemma[3])
                lastLemma = a_i;
        });
    // TODO: What if no language is specified?
    // Should we handle multiple languages?

    // remove any trailing unusable lemmas and check for empty set
    a_lemmas.splice(lastLemma + 1, a_lemmas.length - (lastLemma + 1));
    if (a_lemmas.length == 0)
    {
        // call error and completion routines
        a_error("No results found", "");
        a_complete();
        return;
    }

    // for each lemma
    var url = null;
    a_lemmas.forEach(
        function(a_lemma, a_i)
        {
            var code = a_lemma[3];
            if (!code)
                return;

            // build URL with id if available else lemma
            if (!url)
            {
                url = lang_obj.d_lexiconSearch[code]["url"];
                url = url.replace(/\<LEXICON\>/, encodeURIComponent(code));
            }
            if (a_lemma[0] && lang_obj.d_lexiconSearch[code]["id"])
            {
                // Note: Not correct for lexicons not supporting
                // multiple values.

                // for each id
                var ids = a_lemma[0].split(',');
                for (var i = 0; i < ids.length; i++)
                {
                    // add search for id
                    url += "&" +
                           lang_obj.d_lexiconSearch[code]["id"] +
                           "=" +
                           encodeURIComponent(ids[i]);
                }
            }
            else if (a_lemma[1] && lang_obj.d_lexiconSearch[code]["lemma"])
            {
                // add search for lemma
                url += "&" +
                       lang_obj.d_lexiconSearch[code]["lemma"] +
                       "=" +
                       encodeURIComponent(a_lemma[1]);
            }

            // if lexicon does not support multiple values
            // or we need to submit multi-valued URL
            // (because lexicon is about to change or this is last lemma)
            if (!lang_obj.d_lexiconSearch[code]["multiple"] ||
                (a_i == (a_lemmas.length - 1)) ||
                (code != a_lemmas[a_i + 1][3]))
            {
                // build success method
                var on_success;
                var xform_method =
                        lang_obj.d_lexiconSearch[code]["transform"];
                if (xform_method != null)
                {
                    on_success =
                        function(a_html, a_dict_name)
                        {
                            lang_obj.s_logger.debug("calling " + xform_method);
                            a_html = lang_obj[xform_method](a_html);
                            a_success(a_html, a_dict_name);
                        }
                }
                else
                {
                    on_success = a_success;
                }

                // call dictionary
                // but only use real completion for last item
                lang_obj.s_logger.debug("Calling dictionary at " + url);
                lang_obj.doDefaultDictionaryLookup(
                    code,
                    url,
                    on_success,
                    a_error,
                    (a_i < (a_lemmas.length - 1)) ? function(){} : a_complete);

                // start a new URL for next lemma
                url = null;
            }
        });
};

/**
 * Helper method which calls the dictionary webservice
 * @param {String} a_dict_name the dictionary name
 * @param {String} a_url the url to GET
 * @param {function} a_callback callback upon successful lookup
 * @param {function} a_error callback upon error
 * @param {function} a_complete callback upon completion
 */
Alph.LanguageTool.prototype.doDefaultDictionaryLookup =
    function(a_dict_name,a_url,a_success,a_error,a_complete)
{
    Alph.$.ajax(
        {
            type: "GET",
            url: a_url,
            dataType: 'html',
            timeout: Alph.BrowserUtils.getPref("methods.dictionary.full.default.timeout",
                                        this.d_sourceLanguage),
            error: function(req,textStatus,errorThrown)
            {
                a_error(textStatus||errorThrown,a_dict_name);

            },
            success: function(data, textStatus)
            {
                var lemma_html;
                // TODO This is a hack. We should really create a DOM from
                // the response and use that to extract the body contents
                // but for some reason I can't get that to work with jQuery.
                // For now, just using string matching to pull whatever is in
                // the body out, or if no body tags are present, use the
                // string as is.
                var body_start = data.match(/(<body\s*(.*?)>)/i);
                var body_end =data.match(/<\/body>/i);
                var lemma_html;
                if (body_start && body_end)
                {
                    var body_tag_length = body_start[1].length;
                    lemma_html = data.substring(body_start.index+body_tag_length+1,body_end.index);
                }
                else
                {
                    lemma_html = data;
                }
                a_success(lemma_html,a_dict_name);
            },
            complete: a_complete
        }
    );
};

/**
 * language-specific method to handle runtime changes to language-specific
 * preferences
 * @param {String} a_name the name of the preference which changed
 * @param {Object} a_value the new value of the preference
 */
Alph.LanguageTool.prototype.observePrefChange = function(a_name,a_value)
{
    // default does nothing
};

/**
 * Get the unique id for a lemma from a dictionary index file
 * @param {String} a_lemma_key the lemma key
 * @returns {Array} (lemma id, dict code) or (null, null) if not found
 */
Alph.LanguageTool.prototype.getLemmaId = function(a_lemma_key)
{
    //default returns null
    return Array(null, null);
};

/**
 * Get a language-specific string property
 * @param {String} a_name the name of the property
 * @param {Array} a_replace Optional list of replacement strings
 * @returns the requested string (or empty string if not found)
 * @type String
 */
Alph.LanguageTool.prototype.getString = function(a_name,a_replace)
{

    return Alph.Main.getLanguageString(this.d_sourceLanguage,a_name,a_replace)
}

/**
 * Get a language specific string, or the default string for all languages
 * @param {String} a_name the name of the property
 * @param {Array} a_replace Optional list of replacement strings
 * @returns the requested string (or empty string if not found)
 * @type String
*/
Alph.LanguageTool.prototype.getStringOrDefault = function(a_name,a_replace)
{
    var str = this.getString(a_name,a_replace);
    if (str == '')
    {
        str = Alph.Main.getString(a_name,a_replace);
    }
    return str;
}

/**
 * Add the language-specific tools to the word lookup
 * @paramaters {Node} a_node the node which contains the results
 *                              of the word lookup
 * @params {Alph.SourceSelection} a_target the target element of the user's selection
 */
Alph.LanguageTool.prototype.addWordTools = function(a_node, a_target)
{
    var lang_tool = this;

    var icon_url = Alph.BrowserUtils.getStyleUrl() + '/icons/'; 
    var tools_node = Alph.$("#alph-word-tools",a_node);
    if (Alph.BrowserUtils.getPref('smallicons'))
    {
        Alph.$(tools_node).addClass("smallicons");
    }
    // add diagram link, if appropriate (only add if we have a treebank reference
    // and we're not already on the tree
    if (a_target.getTreebankRef() &&
        Alph.Site.getTreebankDiagramUrl(Alph.$(a_node).get(0).ownerDocument) &&
        Alph.$("#dependency-tree",Alph.$(a_node).get(0).ownerDocument).length == 0)
    {
        var diagram_alt_text = Alph.Main.getString('alph-diagram-link');
        Alph.$('' +
            '<div class="alph-tool-icon alpheios-button alph-diagram-link" ' +
            'href="#alpheios-diagram" title="' + diagram_alt_text + '">'+
            '<img src="' + icon_url + 'diagram_16.png"' +
            ' alt="' + diagram_alt_text + '" />' + 
            '<div class="alpheios-icon-label">' + diagram_alt_text + '</div></div>',a_node)
            .appendTo(tools_node);
        var diagram_func;
        var diagram_cmd = lang_tool.getCmd('alpheios-diagram-cmd');
        // for version > 0 of treebank metadatum, use treebank diagramming command
        // defined per language (defaults to external treebank editor)
        if (diagram_cmd && 
            Alph.Site.getMetadataVersion("alpheios-treebank-diagram-url",
                Alph.$(a_node).get(0).ownerDocument) > 0)
        {   
            diagram_func = function(a_e)
            {
                Alph.Xlate.showLoadingMessage([tools_node,Alph.Main.getString("alph-loading-misc")]);
                lang_tool[diagram_cmd](a_e,null,Alph.$(a_node).get(0),{tbrefs:a_target.getTreebankRef()});
                return false;
            }
        }
        else
        {
            // early alpha versions used the internal tree panel implementation
            // TODO remove this once all enhanced texts have been updated to version > 0 of the
            // treebank metadatum
            diagram_func = function(a_e)
            {                 
                Alph.$("#alpheios-tree-open-cmd").get(0).doCommand(a_e);
                return false;
            }
        }
        Alph.$('#alph-word-tools .alph-diagram-link',a_node).click(diagram_func);
    }
    // add language-specific dictionary link, if any
    var lemmas = [];
    Alph.$(".alph-dict",a_node).each(
        function()
        {
            var lemma_key = this.getAttribute("lemma-key"); 
            if ( lemma_key )
            {
                lemmas.push([lemma_key,this.getAttribute("lemma-lex")]);
            }
        }
    );
    if (lemmas.length > 0)
    {
        Alph.$("#alph-word-tools",a_node).append(this.getDictionaryLink());
        // TODO the dictionary handler should be defined in Alph.Dict
        // rather than here. also doesn't work from a detached window yet.
        Alph.$('#alph-word-tools .alph-dict-link',a_node).click(
            function(a_event)
            {
                Alph.Main.broadcastUiEvent(Alph.Constants.EVENTS.SHOW_DICT,{src_node: Alph.$(a_node).get(0)});
            }
        );
    }

    // add the inflection tool, if any
    if (this.getFeature('alpheios-inflect') && this.canInflect(a_node))
    {
        var inflect_alt_text = Alph.Main.getString('alph-inflect-link');
        Alph.$("#alph-word-tools",a_node).append(
            '<div class="alph-tool-icon alpheios-button alph-inflect-link" ' +
            'href="#alpheios-inflect" title="' + inflect_alt_text + '">' +
            '<img src="' + icon_url + 'inflection_16.png" ' +
            'alt="' + inflect_alt_text + '"/>' + 
            '<div class="alpheios-icon-label">' + inflect_alt_text + '</div></div>'
        );

        Alph.$('#alph-word-tools .alph-inflect-link',a_node).click(
            function(a_e)
            {
                Alph.Xlate.showLoadingMessage([tools_node,Alph.Main.getString("alph-loading-inflect")]);
                lang_tool.handleInflections(a_e,a_node);
                return false;
            }
        );
    }
    
    if (this.getFeature('alpheios-speech') 
        && Alph.BrowserUtils.getPref("url.speech",this.d_sourceLanguage)
        // Currently speech function piggy backs on morphservice.remote setting because
        // espeak is called through mhttpd and must be enabled only if mhttpd is
        && !(Alph.BrowserUtils.getPref("morphservice.remote")))
    {
        var alt_text = Alph.Main.getString('alph-speech-link');
        var link = Alph.$(
            '<div class="alph-tool-icon alpheios-button alph-speech-link" ' +
            'href="#alpheios-speech" title="' + alt_text + '">' +
            '<img src="chrome://alpheios/skin/icons/speech_16.png" ' +
            'alt="' + alt_text + '"/>' + 
            '<div class="alpheios-icon-label">' + alt_text + '</div></div>',a_node
        );
        link.click(
            function(a_e)
            {
                Alph.Xlate.showLoadingMessage([tools_node,Alph.Main.getString("alph-loading-speech")]);
                lang_tool.handleSpeech(a_e,a_node);
                return false;
            }
        );
        Alph.$("#alph-word-tools",a_node).append(link);
    }
    
    var wordlist = lang_tool.getWordList();     
    if (wordlist && 
        lemmas.length > 0 &&
        // hide the learned button on the wordlist display
        Alph.$("#alpheios-wordlist",Alph.$(a_node).get(0).ownerDocument).length == 0)       
    {
        var normalizedWord = lang_tool.normalizeWord(a_target.getWord());        
        var alt_text = Alph.Main.getString('alph-mywords-link');
        var added_msg = Alph.Main.getString('alph-mywords-added',[normalizedWord]);
        var link = Alph.$(  
            '<div class="alph-tool-icon alpheios-button alph-mywords-link" ' +
            'href="#alpheios-mywords" title="' + alt_text + '">' +
            '<img src="chrome://alpheios/skin/icons/vocablist_16.png" ' +
            'alt="' + alt_text + '"/>' + 
            '<div class="alpheios-icon-label">' + alt_text + '</div></div>',a_node
        );
        Alph.$(link).click(
            function(a_e)
            {
                if (Alph.BrowserUtils.doConfirm(window,'alpheios-confirm-dialog',added_msg))
                {
                    lang_tool.addToWordList(a_node,true,true);
                    Alph.Site.toggleWordStatus(
                            lang_tool,Alph.$(a_node).get(0).ownerDocument,normalizedWord);
                }
                return false;
            }
        );
        Alph.$("#alph-word-tools",a_node).append(link);
    }

    if (Alph.$("#alph-word-tools",a_node).children().length > 0)
    {
        if (Alph.$("#alph-word-tools",a_node).prepend(
            '<span class="alpheios-toolbar-label">' + Alph.Main.getString("alph-tools")
            + '</span>')
        );
    }
}

/**
 * Copy the tools for the Quiz window from the original source node,
 * replacing the click handlers with ones which first make sure the
 * correct tab is current in the browser window, because some of the
 * tools require that the current browser tab be the same as the one which
 * did the lookup in the first place
 * @param {Node} a_node the source node which produced the query display
 * @returns {Element} the Element containing the tools 
 */
Alph.LanguageTool.prototype.getToolsForQuery = function(a_node)
{
    var lang_tool = this;    
    var tools = Alph.$("#alph-word-tools",a_node).clone();
    // hide the learned button in the quiz for now
    // TODO word should be automatically identified as learned or not according to user's answer
    Alph.$('.alph-mywords-link',tools).remove();
    var from_tree = Alph.$("#dependency-tree",Alph.$(a_node).get(0).ownerDocument).length > 0;
    Alph.$('.alph-diagram-link',tools).click(
        function(a_e)
        {
            if (Alph.BrowserUtils.selectBrowserForDoc(window,a_node.ownerDocument))
            {
                // just pass the diagram click back to the originating node to handle
                Alph.$(".alph-diagram-link",a_node).click();
            }
            else
            {
                alert("Unable to locate source browser");
            }
            return false;
        }
    );
    // if the node is from the dependency tree diagram, the call to selectBrowserForDoc
    // will fail, in which case we should just try to pass the click back to the originating node     
    Alph.$('.alph-inflect-link',tools).click(
        function(a_e)
        {
            if ( Alph.BrowserUtils.selectBrowserForDoc(window,a_node.ownerDocument))
            {
                Alph.Xlate.showLoadingMessage([tools,Alph.Main.getString("alph-loading-inflect")]);
                lang_tool.handleInflections(a_e,a_node);
            }
            else if (from_tree)
            {
                Alph.$(".alph-inflect-link",a_node).click();
            }
            else {
                alert("Unable to locate source browser");
            }
            return false;
        }
    );
    Alph.$('.alph-dict-link',tools).click(
        function(a_event)
        {
            if (Alph.BrowserUtils.selectBrowserForDoc(window,Alph.$(a_node).get(0).ownerDocument))
            {
                Alph.Main.broadcastUiEvent(
                    Alph.Constants.EVENTS.SHOW_DICT,{src_node: Alph.$(a_node).get(0)});
            }
            else if (from_tree)
            {
                Alph.$(".alph-dict-link",a_node).click();
            }
            else
            {
                alert("Unable to locate source browser");
            }
            return false;
        }
    );
    Alph.$(".alph-speech-link",tools).click(
        function(a_e)
        {
            if ( Alph.BrowserUtils.selectBrowserForDoc(window,Alph.$(a_node).get(0).ownerDocument))
            {                
                Alph.Xlate.showLoadingMessage([tools,Alph.Main.getString("alph-loading-speech")]);
                lang_tool.handleSpeech(a_e,a_node);
            }
            else if (from_tree)
            {
                Alph.$(".alph-speech-link",a_node).click();
            }
            else {
                alert("Unable to locate source browser");
            }
            return false;
        }
    );
    return tools;
}

/**
 * Add language-specific help links to the inflections component of the
 * word lookup output (if any)
 * @paramaters {Node} a_node the node which contains the results
 *                              of the word lookup
 * @params {Alph.SourceSelection} a_target the target element of the user's selection
*/
Alph.LanguageTool.prototype.addInflHelp = function(a_node, a_target)
{
    var form = Alph.Main.getString("alph-morph-form");
    var stem = Alph.Main.getString("alph-morph-stem");
    var suffix = Alph.Main.getString("alph-morph-suffix");
    var prefix = Alph.Main.getString("alph-morph-prefix");
    var icon_url = Alph.BrowserUtils.getStyleUrl() + '/icons/';
    Alph.$(".alph-term",a_node).each(
        function()
        {
            var suff_elem = Alph.$('.alph-suff',this);
            var pref_elem = Alph.$('.alph-pref',this);
            var message = (suff_elem.length == 0 || suff_elem.text() == '')
                ?  form : stem + "+" + suffix;
            if (pref_elem.length != 0 || pref_elem.text() != '')
            {
                message = prefix + "+" + message;
            }
            
            
            var help_node = Alph.$('<span class="alph-form-end"/>',a_node);
            help_node.append(Alph.$('<span class="alph-help-link"><img src="' + icon_url + 'information-16.png" alt="Info" /></span>',
                a_node).hover(
                   function()
                   {
                       Alph.$(this).after(
                           '<span class="alph-tooltip">' + message + '</span>');
                   },
                   function()
                   {
                       Alph.$(this).next('.alph-tooltip').remove();
                   }
                )
            );
            Alph.$(this).after(help_node);
        }
    );

    Alph.$(".alph-infl",a_node).each(
        function()
        {

            var atts = [];
            Alph.$("span",this).each(
                function()
                {
                    var title;
                    var class_list = Alph.$(this).attr("class");
                    if ( class_list && (title = class_list.match(/alph-(\w+)/)))
                    {
                        var name;
                        try
                        {
                            if (Alph.$(this).nextAll(".alph-"+title[1]).length > 0)
                            {
                                name =
                                    Alph.Main.getString("alph-morph-" +title[1] + '-plural');
                            }
                            else
                            {
                                name =
                                    Alph.Main.getString("alph-morph-" +title[1]);
                            }
                            // only display attributes for which we have explicitly
                            // defined strings, and which we haven't already added
                            if (name && Alph.$(this).prevAll(".alph-"+title[1]).length == 0)
                            {
                                atts.push(name);
                            }
                        }
                        catch(a_e)
                        {
                            // quietly ignore missing strings
                        }

                    }
                }
            );
            if (atts.length > 0)
            {
                var message = atts.join(',');
                Alph.$(this).append(
                    '<span class="alph-infl-end"><span class="alph-help-link">' + 
                    '<img src="' + icon_url + 'information-16.png" alt="Info" /></span></span>');

                Alph.$('.alph-help-link',this).hover(
                    function()
                    {
                        Alph.$(this).after(
                            '<span class="alph-tooltip">' + message + '</span>');
                    },
                    function()
                    {
                        Alph.$(this).next('.alph-tooltip').remove();
                    }
                );
            }
        }
    );
}

/**
 * Match a single inflection with only one set of attribute values
 * against an inflection which may contain multiple possible attribute values
 * @param {Element} a_match_infl the .alph-infl element to match (single-valued) 
 * @param {Element} a_infls the .alph-infl element to match against (multi-valued)
 */
Alph.LanguageTool.prototype.matchInfl = function(a_match_infl, a_infls)
{
    var must_match = 0;
    var matched = 0;
    var atts = ['num','gend','tense','voice','pers','mood','case'];
    atts.forEach(
        function(a_att)
        {
            var match_val;
            match_val = Alph.$('.alph-'+ a_att,a_match_infl).attr('context') ||
                    Alph.$('.alph-'+ a_att,a_match_infl).text();
            var possible = Alph.$('.alph-'+ a_att,a_infls);
            // only check those attributes which are defined in the inflection
            // we want to match
            if (match_val)
            {
                must_match++;
                var found_match = false;
                // iterate through the values found for this attribute
                // in the element we're matching against and if at least
                // one instance matches, return a positive match
                for (var i=0; i<possible.length; i++)
                {
                    var poss_val = Alph.$(possible[i]).attr('context') || Alph.$(possible[i]).text();
                    if (match_val == poss_val)
                    {
                       found_match = true;
                       break;
                    }
                }
                // if at least one matching value for this attribute
                // was found, increase the matched count
                if (found_match)
                {
                    matched++;
                }
            }
        }
    );
    return (matched == must_match);
}

/**
 * Get the string to be used in the interface for this language
 * @returns the string to be used in the interface for this language
 * @type String
 */
Alph.LanguageTool.prototype.getLanguageString = function()
{
    var str = this.getString(this.d_sourceLanguage + '.string');
    if (str == '')
    {
        str = this.d_sourceLanguage;
    }
    return str;
}

/**
 * Check to see if the supplied language code is supported by this tool
 * @param {String} a_code the language code
 * @returns true if supported false if not
 * @type Boolean
 */
Alph.LanguageTool.prototype.supportsLanguage = function(a_lang)
{
    var supported = false;
    try
    {
        var codes = Alph.BrowserUtils.getPref("languagecode",this.d_sourceLanguage).split(',');  
        for (var i=0; i<codes.length; i++)
        {
            if (a_lang == codes[i])
            {
                supported = true;
                break;
            }
        }
    }
    catch(a_e)
    {
        this.s_logger.warn("No language codes registered for " + this.d_sourceLanguage);
        supported = false;
    }
    return supported;
};

Alph.LanguageTool.prototype.handleSpeech= function(a_event,a_node)
{
    var lang_obj = this;
    var form = Alph.$(".alph-word",a_node).attr("context");
    this.s_logger.debug("Speak word: " + form);
    var url = Alph.BrowserUtils.getPref("url.speech",this.d_sourceLanguage);
    url = url.replace(/\<WORD\>/,encodeURIComponent(form));
    // send asynchronous request to the speech service
    this.s_logger.debug("Speech url " + url);
    Alph.$.ajax(
    {
        type: "GET",
        url: url,
        timeout: Alph.BrowserUtils.getPref("url.speech.timeout",lang_obj.d_sourceLanguage),
        error: function(req,textStatus,errorThrown)
        {
            Alph.Xlate.hideLoadingMessage(Alph.$(a_node).get(0).ownerDocument);
        },
        success: function(data, textStatus)
        { Alph.Xlate.hideLoadingMessage(Alph.$(a_node).get(0).ownerDocument); }
    });
};

/**
 * Return a normalized version of a word which can be used to compare the word for equality
 * @param {String} a_word the source word
 * @returns the normalized form of the word (default version just returns the same word, 
 *          override in language-specific subclass)
 * @type String
 */
Alph.LanguageTool.prototype.normalizeWord = function(a_word)
{
    return a_word;
}


/**
 * Get the user's wordlist for the language
 * @returns the wordlist, or null if user features aren't enabled
 * @type Alph.DataType (WordList implementation)
 */
Alph.LanguageTool.prototype.getWordList = function()
{
    return (Alph.DataManager.getDataObj('words',this.d_sourceLanguage,true));
};

/**
 * Add add a looked up word to the wordlist for the language
 * @param {Node} a_node the node containing the lookup results
 * @param {Boolean} a_learned flag to indicate if the user 
 *                            has learned the word
 * @param {Boolean} a_userAction flag to indicate if the request was automatic (false)
 *                               or user-initiated (true)                             
 */
Alph.LanguageTool.prototype.addToWordList = function(a_node,a_learned,a_userAction)
{
    var self = this;
    var wordlist = self.getWordList();
    if (!wordlist)
    {
        // don't do anything if we have no wordlist
        return;
    }
        
    var seenLemmas = new Array();
    var updated = false;
    Alph.$(".alph-word .alph-dict",a_node).each(
        function()
        {
            var lemma_key = this.getAttribute("lemma-key"); 
            if ( lemma_key )
            {
                
                // TODO compose a real CTS urn for the dictionary entry
                var urn = lemma_key + ':' + this.getAttribute("lemma-lex");                
                // remove special flags and trailing digits from lemmas
                var lemma = lemma_key.replace(/^@/,'');
                lemma = lemma.replace(/\d+$/,'');
                lemma = self.normalizeWord(lemma);
                if (! seenLemmas[lemma])
                {
                    seenLemmas[lemma] = true;
                    var normalizedWord =
                        self.normalizeWord(Alph.$(this).parents(".alph-word").attr("context"));                                            
                    wordlist.updateFormEntry(
                        window,
                        self.getLanguageCode(),
                        normalizedWord,
                        lemma,
                        urn,
                        a_learned,
                        a_userAction);
                    updated = true;
                }
            }        
        }
    );
    if (updated)
    {
        Alph.Main.broadcastUiEvent(Alph.Constants.EVENTS.VOCAB_UPDATE, { src_node: Alph.$(a_node).get(0) });        
    }
};

/**
 * Get a list of valid puncutation for this language
 * @returns {String} a string containing valid puncutation symbols
 */
Alph.LanguageTool.prototype.getPunctuation = function()
{
    return ".,;:!?'\"(){}\\[\\]<>\/\\\u00A0\u2010\u2011\u2012\u2013\u2014\u2015\u2018\u2019\u201C\u201D\u0387\u00B7\n\r";        
}
