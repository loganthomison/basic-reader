/**
 * @fileoverview This file defines the Alph.LanguageTool class prototype.
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
    this.source_language = a_language;

    // TODO need to figure out which properties should be immutable.
    // Use of the function calls to Alph.util.getPref allows the properties
    // to change if the user modifies the preferences, but there may be
    // some properties for which we can't allow changes without reinstantiating
    // the object.
    var default_properties =
    {
        context_forward:
            function()
            {
                return Alph.util.getPref("context_forward",a_language)
                    || 0;
            },
        context_back:
            function()
            {
                return Alph.util.getPref("context_back",a_language)
                    || 0;
            },
        chromepkg:
            function()
            {
                return Alph.util.getPref("chromepkg",a_language) || "alpheios";
            },
        popuptrigger:
            function()
            {
                // individual language may override the popuptrigger,
                // but they don't have to
                return Alph.util.getPrefOrDefault("popuptrigger",a_language);
            },
        usemhttpd:
            function()
            {
                return Alph.util.getPref("usemhttpd",a_language);
            },
        grammarlinks:
            function()
            {
                var grammarlinklist = {};
                var links = Alph.util.getPref("grammar.hotlinks",a_language);
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
        pofs:
            function()
            {
                var pofs = Alph.util.getPrefOrDefault("partsofspeech",a_language);
                if (pofs)
                {
                    return pofs.split(/,/);
                }
                else
                {
                    return [];
                }

            }
    };

    this.set_accessors(default_properties);
    this.set_accessors(a_properties);

    // TODO - should the list of methods to call here to generate the
    // language-specific functionality be automatically determined from
    // the configuration?
    this.set_find_selection();
    this.set_lexicon_lookup();
    this.set_context_handler();
    this.set_shift_handler();

    var startup_methods = Alph.util.getPref("methods.startup",a_language);
    if (typeof startup_methods != "undefined")
    {
        startup_methods = startup_methods.split(/,/);
        for (var i=0; i<startup_methods.length; i++)
        {
            var method_name = startup_methods[i];
            // is the method in the Alph.LanguageTool object?
            if (typeof this[method_name] == 'function')
            {
                Alph.util.log("Calling " + method_name + " for " + a_language);
                this[method_name]();
                // TODO should we throw an error if the startup method returns
                // false?
            }
            // TODO - do we want to support eval of javascript code present
            // as a string in the config?
            else
            {
                Alph.util.log("Startup method " + method_name +
                              " for " + a_language +
                              " not defined");
            }
        }
    }

    this.lexicon_setup();
};

/**
 * Initializes lexicon search parameters
 */
Alph.LanguageTool.prototype.lexicon_setup = function()
{
    // nothing to do if no language defined
    var language = this.source_language;
    if (!language || typeof language == "undefined")
        return;

    // read lexicon parameters
    // look first for lexicon-specific values and then, if not found,
    // for generic lexicon-independent values
    Alph.util.log("Reading params for " + language);
    this.lexiconSearch = Array();
    var codeList;
    try 
    {
        codeList = Alph.util.getPref("dictionaries.full", language)
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
        this.lexiconSearch[code] = Array();
        this.lexiconSearch[code]["url"] =
            Alph.util.getPref(base + "url", language);

        // if lexicon-specific URL is defined
        if (this.lexiconSearch[code]["url"])
        {
            // read lexicon-specific values
            this.lexiconSearch[code]["lemma"] =
                Alph.util.getPref(base + "lemma_param", language);
            this.lexiconSearch[code]["id"] =
                Alph.util.getPref(base + "id_param", language);
            this.lexiconSearch[code]["multiple"] =
                Alph.util.getPref(base + "multiple", language);
            this.lexiconSearch[code]["convert"] =
                Alph.util.getPref(base + "convert_method", language);
            this.lexiconSearch[code]["transform"] =
                Alph.util.getPref(base + "transform_method", language);
        }
        // else use lexicon-independent values
        else
        {
            this.lexiconSearch[code]["url"] =
                Alph.util.getPref(defaultBase + "url", language);
            this.lexiconSearch[code]["lemma"] =
                Alph.util.getPref(defaultBase + "lemma_param", language);
            this.lexiconSearch[code]["id"] =
                Alph.util.getPref(defaultBase + "id_param", language);
            this.lexiconSearch[code]["multiple"] =
                Alph.util.getPref(defaultBase + "multiple", language);
            this.lexiconSearch[code]["convert"] =
                Alph.util.getPref(defaultBase + "convert_method",
                                  language);
            this.lexiconSearch[code]["transform"] =
                Alph.util.getPref(defaultBase + "transform_method",
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
Alph.LanguageTool.prototype.source_language = '';

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
Alph.LanguageTool.prototype.set_accessors = function(a_properties)
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
Alph.LanguageTool.prototype.set_find_selection = function()
{
    // get the base unit
    // default to 'word' if not defined
    var base_unit =
        Alph.util.getPref('base_unit',
                         this.source_language) || 'word';
    if (base_unit == 'word')
    {
        this.findSelection = function(a_ro, a_rangstr)
            {
                var alphtarget = this.doSpaceSeparatedWordSelection(a_ro, a_rangstr);
                return this.handleConversion(alphtarget);
            }
    }
    else if (base_unit == 'character')
    {
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
 * @return {Alph.SourceSelection} {@link Alph.SourceSelection} object
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
Alph.LanguageTool.prototype.set_lexicon_lookup = function()
{
    var lexicon_method =
        Alph.util.getPref("methods.lexicon",this.source_language);
    if (lexicon_method == 'webservice')
    {
        this.lexiconLookup = function(a_alphtarget,a_onsuccess,a_onerror)
        {
            Alph.util.log("Query word: " + a_alphtarget.getWord());

            var url =
                Alph.util.getPref("url.lexicon",this.source_language) +
                Alph.util.getPref("url.lexicon.request",this.source_language);
                url = url.replace(/\<WORD\>/,
                                  encodeURIComponent(a_alphtarget.getWord()));
                // TODO add support for the context in the lexicon url

            // send asynchronous request to the lexicon service
            Alph.$.ajax(
                {
                    type: "GET",
                    url: url,
                    timeout: Alph.util.getPref("url.lexicon.timeout",this.source_language),
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
        Alph.util.log("methods.lexicon invalid or undefined: " + lexicon_method);
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
    var err_msg =
        document
        .getElementById("alpheios-strings")
        .getFormattedString("alph-error-nolexicon",[this.source_language]);

    a_onerror(err_msg);
};

/**
 * Set the contextHandler method for the instance of the class.
 * This is derived according to the language-specific configuration.
 * @see #contextHandler
 * @private
 */
Alph.LanguageTool.prototype.set_context_handler = function()
{
    var context_handler =
        Alph.util.getPref("context_handler",this.source_language);
    if (typeof this[context_handler] == 'function')
    {
        this.contextHandler = this[context_handler];
    }
    else
    {
        Alph.util.log("No context_handler defined for " + this.source_language);
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
Alph.LanguageTool.prototype.set_shift_handler = function()
{
    var shift_handler =
        Alph.util.getPref("shift_handler",this.source_language);
    if (typeof this[shift_handler] == 'function')
    {
        this.shiftHandler = this[shift_handler];
    }
    else
    {
        Alph.util.log("No shift_handler defined for " + this.source_language);
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
      a_rngstr.replace(
        /[.,;:!?'\"(){}\[\]\/\\\u00A0\u2010\u2011\u2012\u2013\u2014\u2015\u2018\u2019\u201C\u201D\u0387\n\r]/g,
        " ");

    Alph.util.log("In doSpaceSeparatedWordSelection for " + a_rngstr);

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
    var context_forward = this.getcontext_forward();
    var context_back = this.getcontext_back();

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
    a_rngstr = a_rngstr.replace(/[.,;:!?'\"(){}\[\]\/\\\xA0\n\r]/g, " ");

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
    var context_forward = this.getcontext_forward();
    var context_back = this.getcontext_back();

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
 * conversion method in the Alph.convert namespace.
 * @private
 * @param {Alph.SourceSelection} a_alphtarget the object returned by {@link #findSelection}
 */
Alph.LanguageTool.prototype.handleConversion = function(a_alphtarget)
{
    var convert_method =
        Alph.util.getPref("methods.convert",this.source_language);

    if (convert_method != null
        && typeof Alph.convert[convert_method] == 'function'
        && a_alphtarget.getWord())
    {
        a_alphtarget.convertWord( function(a_word) { return Alph.convert[convert_method](a_word); } );
    }

    return a_alphtarget;
};

Alph.LanguageTool.prototype.convertString = function(a_str)
{
  var convert_method =
        Alph.util.getPref("methods.convert",this.source_language);

    if (convert_method != null
        && typeof Alph.convert[convert_method] == 'function')
    {
        a_str = Alph.convert[convert_method](a_str);
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
    var links = this.getgrammarlinks();

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
    var targetURL = Alph.util.getPref("url.grammar",this.source_language) || "";
    targetURL = targetURL.replace(/\<ITEM\>/, a_target || "");

    var grammar_loading_msg =
        document
        .getElementById("alpheios-strings")
        .getString("alph-loading-grammar");

    var features =
    {
        screen: Alph.util.getPref("grammar.window.loc")
    };

    // TODO - list of parameters to pass should come from
    // preferences
    var params = Alph.$.extend(
        {
            target_href: a_target,
            callback: a_node ? 
                      function() { Alph.xlate.hideLoadingMessage(a_node.ownerDocument) }
                      : function() {},
            lang_tool: thisObj
        },
        a_params || {}
    );
    // open or replace the grammar window
    Alph.xlate.openSecondaryWindow(
        "alph-grammar-window",
        targetURL,
        features,
        params,
        Alph.xlate.showLoadingMessage,
            [a_node||{},grammar_loading_msg]
    );
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
        a_node = Alph.$("#alph-text", Alph.xlate.getLastDoc()).clone();
    }
    if (Alph.$(a_node).length != 0)
    {
            params = this.getInflectionTable(a_node,params);
    }

    if (typeof params.showpofs == 'undefined')
    {
        params.xml_url =
                "chrome://"
                + this.getchromepkg()
                + "/content/inflections/alph-infl-index.xml";
        params.xslt_processor = Alph.util.get_xslt_processor('alpheios','alph-infl-index.xsl');
    }
    params.source_node = a_node;

    // give the inflections window a reference to this language tool
    params.lang_tool = this;

    if (params.query_mode)
    {
        params.xslt_params.show_only_matches = true;
    }
    Alph.util.log("Handling inflections for " + params.showpofs);

    // send the word endings to the declension table
    // if the window isn't already open, open it
    // TODO window features should be language-specific
    var features =
    {
        width:"300",
        height:"620",
        screen: Alph.util.getPref("shift.window.loc"),
    }
    // add a callback to hide the loading message
    var loading_msg = document.getElementById("alpheios-strings").getString("alph-loading-inflect");

    var loading_node;
    if (Alph.$(a_node).length >0)
    {
        params.callback = function() { Alph.xlate.hideLoadingMessage(a_node.ownerDocument) };
        loading_node = Alph.$("#alph-word-tools",a_node).get(0);
    }
    else
    {
        params.callback = function() {};
        loading_node = {};
    }
     
    Alph.xlate.openSecondaryWindow(
                    "alph-infl-table",
                    "chrome://alpheios/content/alpheios-infl.xul",
                    features,
                    params,
                    Alph.xlate.showLoadingMessage,[loading_node,loading_msg]
    );
    Alph.util.log("Inflections window should have focus with "
            + Alph.main.get_state_obj().get_var("word"));
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
    var params = this.getInflectionTable(a_node,{});
    return (typeof params.showpofs == 'string');
}

/**
 * Helper function to determine if the user's selection
 * is in the margin of the document
 * @private
 * @param {int} a_ro the range offset for the selection
 * @param {String} a_rngstr the enclosing string
 * @return true if in the margin, false if not
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
    var chromepkg = this.getchromepkg();
    var chromecss = "chrome://" + chromepkg + "/skin/";
    if (typeof a_name == "undefined")
    {
        a_name = chromepkg;
    }
    chromecss = chromecss + a_name + ".css"
    
    // only add the stylesheet if it's not already there
    if (Alph.$("link[href='"+ chromecss + "']",a_doc).length == 0)
    {
        Alph.util.log("adding stylesheet: " + chromecss);
        var css = document.createElementNS(
            "http://www.w3.org/1999/xhtml","link");
        css.setAttribute("rel", "stylesheet");
        css.setAttribute("type", "text/css");
        css.setAttribute("href", chromecss);
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
    var chromepkg = this.getchromepkg();
    var chromecss = "chrome://" + chromepkg + "/skin/";
    if (typeof a_name == "undefined")
    {
        a_name = chromepkg;
    }
    chromecss = chromecss + a_name + ".css"
    Alph.$("link[href='"+chromecss + "']",a_doc).remove();
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
 * @return the parameters object for the inflection window
 */
Alph.LanguageTool.prototype.getInflectionTable = function(a_node, a_params)
{
    // no default behavior
    return;
};

/**
 * Method which checks the availability of a specific feature
 * @param {String} a_id the id of the feature
 * @return {Boolean} true if enabled, otherwise false
 */
Alph.LanguageTool.prototype.getFeature = function(a_id)
{
    var enabled = Alph.util.getPrefOrDefault("features."+a_id,this.source_language);
    Alph.util.log("Feature " + a_id + " for " + this.source_language + " is " + enabled);
    return enabled;
};

/**
 * Method which returns the requested command
 * @param {String} a_cmd the name of the command
 * @return {String} the name of the function associated with the command
 *                  or undefined.
 */
Alph.LanguageTool.prototype.getCmd = function(a_cmd)
{
    return Alph.util.getPrefOrDefault("cmds."+a_cmd,this.source_language);
};

/**
 * Method returns a language-specific file from the index_files directory
 * of the language chrome.
 * Temporary until we figure out how we really want to handle this
 * @param {String} a_docid The id (name) of the file to retrieve
 */
Alph.LanguageTool.prototype.getIndexFile = function(a_docid)
{
    var chromepkg = this.getchromepkg();
    return "chrome://" + chromepkg + "/content/index_files/" + a_docid;
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
 * @return true if a dictionary is available, false if not
 * @type Boolean
 */
Alph.LanguageTool.prototype.hasDictionary = function()
{
    // if no dictionary is defined for the language, return null
    var has_dict = false;
    var codeList;
    try 
    {
        codeList = Alph.util.getPref("dictionaries.full",this.source_language).split(/,/);
    }
    catch(a_e){
        // the preference might not be defined
        codeList = [];
    }
    
    var remote_disabled = Alph.util.getPref("disable.remote");
    for (var i=0; i<codeList.length; i++)
    {
        var code = codeList[i];
        // if a dictionary wasn't setup properly
        // disable the dictionary feature
        if (typeof this.lexiconSearch[code] == 'undefined')
        {
            has_dict = false;
            break;
        }
        // if remote features are disabled and any of  the dictionaries 
        // uses a remote url, disable the dictionary feature
        else if ( remote_disabled &&  
                  ! Alph.util.is_local_url(this.lexiconSearch[code].url)
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
 * @return the browse url of the dictionary or null if none defined
 * @type String
 */
Alph.LanguageTool.prototype.getDictionaryBrowseUrl = function()
{
    var browse_url = null;
    /**
     * Not yet implemented
     * var default_dict = this.getDictionary();
     * if (default_dict)
     * {
     *   browse_url =
     *       Alph.util.getPref(
     *           "dictionary.full." + default_dict + ".browse.url",
     *           this.source_language);
     *}
    **/
    return browse_url;
}

/**
 * Get html for a link to the current dictionary
 * @return html to add to an element to produce a link to the dictionary
 * @type String
 */
Alph.LanguageTool.prototype.getDictionaryLink = function()
{
    var link = '';
    if (this.hasDictionary())
    {
        var strings = Alph.$("#alpheios-strings").get(0);
        var dict_alt_text = strings.getString('alph-dictionary-link');
        link = '<div class="alph-tool-icon alpheios-button alph-dict-link" ' +
               'href="#alph-dict" title="' + dict_alt_text + '">' +
               '<img src="chrome://alpheios/skin/icons/wordlist_16.png" ' +
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
 * @return {function} a function which accepts the following parameters:
 *                      {String} a_dict_name dictionary_name,
 *                      {Array}  a_lemmas list of lemmas
 *                      {function} a_success callback function for successful lookup
 *                      {function} a_error callback function for error
 *                      {function} a_complete callback function upon completion
 * @return {Object} null if no default dictionary is defined for the language
 */
Alph.LanguageTool.prototype.get_dictionary_callback = function()
{
    // if we have a specific method defined for producing
    // the dictionary urls for this dictionary, then use it
    // otherwise use the default method
    var dict_method = null;
    if (this.hasDictionary())
    {
        dict_method =
            Alph.util.getPrefOrDefault(
                "methods.dictionary.full.default",
                this.source_language);
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
Alph.LanguageTool.prototype.default_dictionary_lookup =
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
                var lemma_id = lang_obj.get_lemma_id(a_lemma[1]);
                a_lemma[0] = lemma_id[0];
                a_lemma[3] = lemma_id[1];
                if (a_lemma[0])
                {
                    Alph.util.log("found id " + a_lemma[0] +
                                  " for lemma " + a_lemma[1] +
                                  " in " + a_lemma[3]);
                }
            }

            // convert any lemma that has no id
            if (!a_lemma[0] && a_lemma[1] && a_lemma[3])
            {
                // if conversion method specified, apply it
                var cvt = lang_obj.lexiconSearch[a_lemma[3]]["convert"];
                if (cvt)
                    a_lemma[1] = Alph.convert[cvt](a_lemma[1]);
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
                url = lang_obj.lexiconSearch[code]["url"];
                url = url.replace(/\<LEXICON\>/, encodeURIComponent(code));
            }
            if (a_lemma[0] && lang_obj.lexiconSearch[code]["id"])
            {
                url += "&" +
                       lang_obj.lexiconSearch[code]["id"] +
                       "=" +
                       encodeURIComponent(a_lemma[0]);
            }
            else if (a_lemma[1] && lang_obj.lexiconSearch[code]["lemma"])
            {
                url += "&" +
                       lang_obj.lexiconSearch[code]["lemma"] +
                       "=" +
                       encodeURIComponent(a_lemma[1]);
            }

            // if lexicon does not support multiple values
            // or we need to submit multi-valued URL
            // (because lexicon is about to change or this is last lemma)
            if (!lang_obj.lexiconSearch[code]["multiple"] ||
                (a_i == (a_lemmas.length - 1)) ||
                (code != a_lemmas[a_i + 1][3]))
            {
                // build success method
                var on_success;
                var xform_method =
                        lang_obj.lexiconSearch[code]["transform"];
                if (xform_method != null)
                {
                    on_success =
                        function(a_html, a_dict_name)
                        {
                            Alph.util.log("calling " + xform_method);
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
                Alph.util.log("Calling dictionary at " + url);
                lang_obj.do_default_dictionary_lookup(
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
Alph.LanguageTool.prototype.do_default_dictionary_lookup =
    function(a_dict_name,a_url,a_success,a_error,a_complete)
{
    Alph.$.ajax(
        {
            type: "GET",
            url: a_url,
            dataType: 'html',
            timeout: Alph.util.getPref("methods.dictionary.full.default.timeout",
                                        this.source_language),
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
Alph.LanguageTool.prototype.observe_pref_change = function(a_name,a_value)
{
    // default does nothing
};

/**
 * Get the unique id for a lemma from a dictionary index file
 * @param {String} a_lemma_key the lemma key
 * @return {Array} (lemma id, dict code) or (null, null) if not found
 */
Alph.LanguageTool.prototype.get_lemma_id = function(a_lemma_key)
{
    //default returns null
    return Array(null, null);
};

/**
 * Get a language-specific string property
 * @param {String} a_name the name of the property
 * @param {Array} a_replace Optional list of replacement strings
 * @return the requested string (or empty string if not found)
 * @type String
 */
Alph.LanguageTool.prototype.get_string = function(a_name,a_replace)
{

    var str = "";
    var str_props = Alph.$("#alpheios-strings-"+this.source_language).get(0);
    if (str_props != null)
    {
        try
        {
            if (typeof a_replace == "undefined")
            {
                str = str_props.getString(a_name);
            }
            else
            {
                str = str_props.getFormattedString(a_name,a_replace);
            }
        }
        catch(a_e)
        {
            Alph.util.log("Error retrieving " + a_name + ":" + a_e);
        }
    }
    return str || "";
}

/**
 * Get a language specific string, or the default string for all languages
 * @param {String} a_name the name of the property
 * @param {Array} a_replace Optional list of replacement strings
 * @return the requested string (or empty string if not found)
 * @type String
*/
Alph.LanguageTool.prototype.get_string_or_default = function(a_name,a_replace)
{
    var str = this.get_string(a_name,a_replace);
    if (str == '')
    {
       try
       {
            str = Alph.$("#alpheios-strings").get(0)
                .getFormattedString(a_name,a_replace);
       }
       catch(a_e)
       {
            Alph.util.log("Error retrieving default string " + a_name + ":" + a_e);
            str = ''
       }
    }
    return str;
}

/**
 * Add the language-specific tools to the word lookup
 * @paramaters {Node} a_node the node which contains the results
 *                              of the word lookup
 * @params {Alph.SourceSelection} a_target the target element of the user's selection
 */
Alph.LanguageTool.prototype.add_word_tools = function(a_node, a_target)
{
    var lang_tool = this;
    var strings = Alph.$("#alpheios-strings").get(0);

    var tools_node = Alph.$("#alph-word-tools",a_node);
    if (Alph.util.getPref('smallicons'))
    {
        Alph.$(tools_node).addClass("smallicons");
    }
    // add diagram link, if appropriate (only add if we have a treebank reference
    // and we're not already on the tree
    if (a_target.getTreebankQuery() &&
        Alph.$("#dependency-tree",Alph.$(a_node).get(0).ownerDocument).length == 0)
    {
        var diagram_alt_text = strings.getString('alph-diagram-link');
        Alph.$('' +
            '<div class="alph-tool-icon alpheios-button alph-diagram-link" ' +
            'href="#alpheios-diagram" title="' + diagram_alt_text + '">'+
            '<img src="chrome://alpheios/skin/icons/diagram_16.png"' +
            ' alt="' + diagram_alt_text + '" />' + 
            '<div class="alpheios-icon-label">' + diagram_alt_text + '</div></div>',a_node)
            .appendTo(tools_node);
        Alph.$('#alph-word-tools .alph-diagram-link',a_node).click(
            function(a_e)
            {
                Alph.$("#alpheios-tree-open-cmd").get(0).doCommand(a_e);
                return false;
            }
        );
    }
    // add language-specific dictionary link, if any
    var lemmaCount = 0;
    Alph.$(".alph-dict",a_node).each(
        function()
        {
            if (this.getAttribute("lemma-key") ||
                this.getAttribute("lemma-id"))
            {
                ++lemmaCount;
            }
        }
    );
    if (lemmaCount > 0)
    {
        Alph.$("#alph-word-tools",a_node).append(this.getDictionaryLink());
        // TODO the dictionary handler should be defined in Alph.Dict
        // rather than here. also doesn't work from a detached window yet.
        Alph.$('#alph-word-tools .alph-dict-link',a_node).click(
            function(a_event)
            {
                Alph.main.broadcast_ui_event(Alph.main.events.SHOW_DICT);
            }
        );
    }

    // add the inflection tool, if any
    if (this.getFeature('alpheios-inflect') && this.canInflect(a_node))
    {
        var inflect_alt_text = strings.getString('alph-inflect-link');
        Alph.$("#alph-word-tools",a_node).append(
            '<div class="alph-tool-icon alpheios-button alph-inflect-link" ' +
            'href="#alpheios-inflect" title="' + inflect_alt_text + '">' +
            '<img src="chrome://alpheios/skin/icons/inflection_16.png" ' +
            'alt="' + inflect_alt_text + '"/>' + 
            '<div class="alpheios-icon-label">' + inflect_alt_text + '</div></div>'
        );
        var loading_msg = document.getElementById("alpheios-strings").getString("alph-loading-inflect");
        Alph.$('#alph-word-tools .alph-inflect-link',a_node).click(
            function(a_e)
            {
                Alph.xlate.showLoadingMessage([tools_node,loading_msg]);
                lang_tool.handleInflections(a_e,a_node);
                return false;
            }
        );
    }

    if (Alph.$("#alph-word-tools",a_node).children().length > 0)
    {
        if (Alph.$("#alph-word-tools",a_node).prepend(
            '<span class="alpheios-toolbar-label">' + strings.getString("alph-tools")
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
 * @return {Element} the Element containing the tools 
 */
Alph.LanguageTool.prototype.get_tools_for_query = function(a_node)
{
    var lang_tool = this;
    var tools = Alph.$("#alph-word-tools",a_node).clone();
    // if the node is from the dependency tree diagram, the call to select_browser_for_doc
    // will fail, but it should be unnecessary in this case, because the tree won't be available
    // if the browser that originated it isn't selected
    var from_tree = Alph.$("#dependency-tree",Alph.$(a_node).get(0).ownerDocument).length > 0;
    Alph.$('.alph-diagram-link',tools).click(
        function(a_e)
        {
            if (Alph.util.select_browser_for_doc(a_node.ownerDocument))
            {
                Alph.$("#alpheios-tree-open-cmd").get(0).doCommand(a_e);
            }
            else
            {
                alert("Unable to locate source browser");
            }
            return false;
        }
    );
    
    Alph.$('.alph-inflect-link',tools).click(
        function(a_e)
        {
            if (Alph.util.select_browser_for_doc(a_node.ownerDocument) || from_tree)
            {
                var loading_msg = document.getElementById("alpheios-strings").getString("alph-loading-inflect");
                Alph.xlate.showLoadingMessage([tools,loading_msg]);
                lang_tool.handleInflections(a_e,a_node);
            }
            else
            {
                alert("Unable to locate source browser");
            }
            return false;
        }
    );
    Alph.$('.alph-dict-link',tools).click(
        function(a_event)
        {
            if (Alph.util.select_browser_for_doc(a_node.ownerDocument) || from_tree)
            {
                Alph.main.broadcast_ui_event(
                    Alph.main.events.SHOW_DICT);
            }
            else
            {
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
Alph.LanguageTool.prototype.add_infl_help = function(a_node, a_target)
{
    var strings = Alph.$("#alpheios-strings").get(0);
    var form = strings.getString("alph-morph-form");
    var stem = strings.getString("alph-morph-stem");
    var suffix = strings.getString("alph-morph-suffix");
    Alph.$(".alph-term",a_node).each(
        function()
        {
            var suff_elem = Alph.$('.alph-suff',this);
            var message = (suff_elem.length == 0 || suff_elem.text() == '')
                ?  form : stem + "+" + suffix;
            var help_node = Alph.$('<span class="alph-form-end"/>',a_node);
            help_node.append(Alph.$('<span class="alph-help-link"><img src="chrome://alpheios/skin/icons/information-16.png" alt="Info" /></span>',
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
                                    strings.getString("alph-morph-" +title[1] + '-plural');
                            }
                            else
                            {
                                name =
                                    strings.getString("alph-morph-" +title[1]);
                            }
                            // only display attributes for which we have explicitly
                            // defined strings, and which we haven't already added
                            if (Alph.$(this).prevAll(".alph-"+title[1]).length == 0)
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
                Alph.$(this).append('<span class="alph-infl-end"><span class="alph-help-link"><img src="chrome://alpheios/skin/icons/information-16.png" alt="Info" /></span></span>');

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
Alph.LanguageTool.prototype.match_infl = function(a_match_infl, a_infls)
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
 * @return the string to be used in the interface for this language
 * @type String
 */
Alph.LanguageTool.prototype.get_language_string = function()
{
    var str = this.get_string(this.source_language + '.string');
    if (str == '')
    {
        str = this.source_language;
    }
    return str;
}

/**
 * Check to see if the supplied language code is supported by this tool
 * @param {String} a_code the language code
 * @return true if supported false if not
 * @type Boolean
 */
Alph.LanguageTool.prototype.supports_language = function(a_lang)
{
    var supported = false;
    try
    {
        var codes = Alph.util.getPref("languagecode",this.source_language).split(',');  
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
        Alph.util.log("No language codes registered for " + this.source_language);
        supported = false;
    }
    return supported;
}
