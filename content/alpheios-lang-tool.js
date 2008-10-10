/**
 * @fileoverview This file defines the Alph.LanguageTool class prototype.
 *
 * @version $Id$
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
    // some properties for which we can't allow changes without reinstanting
    // the object.
    var default_properties =
    {
        context_forward: function()
            { 
                return Alph.util.getPref("context_forward",a_language) 
                    || 0;
            },
        context_back: function()
            { 
                return Alph.util.getPref("context_back",a_language) 
                    || 0;
            },
        chromepkg: function(){ return Alph.util.getPref("chromepkg",a_language) || "alpheios"},
        popuptrigger: function() 
            { 
                // individual language may override the popuptrigger,
                // but they don't have to
                return Alph.util.getPrefOrDefault("popuptrigger",a_language); 
            },
        usemhttpd : function(){ return Alph.util.getPref("usemhttpd",a_language) },
        grammarlinks: function() 
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
            }
    };

    this.set_accessors(default_properties);
    this.set_accessors(a_properties);
   
    // TODO - should the list of methods to call here generate the language-specific
    // functionality be automatically determined from the configuration?
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
                // TODO should we throw an error if the startup method returns false?
            }
            // TODO - do we want to support eval of javascript code present as a string in the config? 
            else
            {
                Alph.util.log("Startup method " + method_name + "for " + a_language + " not defined");
            }
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
    a_rngstr = a_rngstr.replace(/[.,;:!?'\"(){}\[\]\/\\\xA0\n\r]/g, " ");
    
    Alph.util.log("In doSpaceSeparatedWordSelection for " + a_rngstr);

    // If the user selected whitespace in the margins of a range
    // close the popup and return.
    if (this.selectionInMargin(a_ro, a_rngstr))
    {
        // return and hide popup for mouseover whitespace
        Alph.xlate.hidePopup();
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
    // close the popup and return.
    if (this.selectionInMargin(a_ro, a_rngstr))
    {
        // return and hide popup for mouseover whitespace
        Alph.xlate.hidePopup();
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
    Alph.$("#alph-text",a_doc).bind(
        "click", 
        function(a_e)
        {
            var rp = a_e.rangeParent;
            var ro = a_e.rangeOffset;
            var range = document.createRange();
            range.selectNode(rp);

            // get class and context from containing span
            var attrs = range.startContainer.attributes;
            var rngClass = null;
            var rngContext = null;
            for (var i = 0; i < attrs.length; ++i)
            {
                if (attrs[i].name == "class")
                    rngClass = attrs[i].value;
                if (attrs[i].name == "context")
                    rngContext = attrs[i].value;
            }

            // if this is one of the classes we want to handle
            if ( links[rngClass] )
            {
                // build target inside grammar
                var target = rngClass;
                if (rngContext != null)
                {
                    target += "-" + rngContext.split(/-/)[0];
                }
    
                myobj.openGrammar(a_e,range.startContainer,target);
            }            
         }
     );
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
            callback: Alph.xlate.hideLoadingMessage
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
        a_node = Alph.$("#alph-text", content.document).clone();
    }
    if (Alph.$(a_node).length == 0)
    {
        return;
    }
    params = this.getInflectionTable(a_node,params)
    if (! params)
    {
        return;
    }
    if (typeof params.showpofs != 'undefined')
    {
        params.source_node = a_node;
        Alph.util.log("Handling inflections for " + params.showpofs);
        
        // send the word endings to the declension table
        // if the window isn't already open, open it
        // TODO window features should be language-specific
        var features =
        {
            width:"300",
            height:"620",
            screen: Alph.util.getPref("shift.window.loc"),
            menubar: "yes",
            toolbar: "yes"
        }
        Alph.xlate.openSecondaryWindow(
                        "alph-infl-table",
                        "chrome://alpheios/content/alpheios-infl.xul",
                        features,
                        params);
            Alph.util.log("Inflections window should have focus with " 
                + Alph.main.get_state_obj().get_var("word"));
    }
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
 * Handler which can be used as the {@link #shiftHandler} 
 * to produce a context-specific deleclenstion table popup
 * @param {Event} a_event the keypress event
 * @param {String} a_showcase the requested case to display in the popup
 *                  (if not defined the first case displayed will be used) 
 */
Alph.LanguageTool.prototype.showDeclensionTable = function(a_event,a_showcase)
{
    
    if(! Alph.xlate.popupVisible()) 
    {
        return;    
    }
    //TODO supported cases should come from prefs
    var params = { suffixes: { noun: [],
                               adjective: []
                             },
                   word: Alph.main.get_state_obj().get_var("word"),
                   showcase: a_showcase
                 };
    var supported_cases = 
        { noun: 'noun',
          verb_participle: 'noun',
          adjective: 'adjective'
        };

    var popup = Alph.$("#alph-text", content.document);

    // The word will have one more more alph-infl-set elements
    // Each alph-infl-set element should have a alph-suffix element
    // and one or more alph-case elements.  Iterate through the alph-infl-sets
    // retrieving the alph-suffix elements which are applicable to
    // each supported case
    Alph.$(".alph-infl-set",popup).each(
        function(i)
        {
            for (var supported_case in supported_cases)
            {
                var map_case = supported_cases[supported_case];
                var has_case = 
                    Alph.$(".alph-case[context$='" + map_case + "']",
                    this);
                if ( has_case.length > 0 )
                {
                    // if a particular case wasn't requested
                    // and this is the first case processed, set it
                    // as the default
                    if (typeof params.showcase == 'undefined')
                    {
                        params.showcase = map_case;
                    }
                    params.suffixes[map_case].push(
                        Alph.$(".alph-suff",this).get());

                }                
            }
        }
    );

    if (typeof params.showcase != 'undefined')
    {
        // send the word endings to the declension table
        // if the window isn't already open, open it
        // TODO window features should be language-specific
        var features =
        {
            width:"300",
            height:"620",
            screen: Alph.util.getPref("shift.window.loc")
        }
        Alph.xlate.openSecondaryWindow(
                    "alph-decl-table",
                    "chrome://alpheios/content/alpheios-decl.xul",
                    features,
                    params);
        Alph.util.log("Declension table should have focus with " 
            + Alph.main.get_state_obj().get_var("word"));
    }
};

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
 */
Alph.LanguageTool.prototype.addStyleSheet = function(a_doc)
{
    var chromepkg = this.getchromepkg();
    var chromecss = "chrome://" + chromepkg + "/skin/" + chromepkg + ".css"
    // only add the stylesheet if it's not already there
    if (Alph.$("link[href='"+ chromecss + "']",a_doc).length == 0)
    {
        var css = document.createElementNS(
            "http://www.w3.org/1999/xhtml","link");
        css.setAttribute("rel", "stylesheet");
        css.setAttribute("type", "text/css");
        css.setAttribute("href", chromecss);
        css.setAttribute("id", chromepkg + "-css");
        Alph.$("head",a_doc).append(css);
    }
};

/**
 * Removes the language specific stylesheet 
 *  from the window content document.
 *  @param {Document} a_doc the window content document
 */
Alph.LanguageTool.prototype.removeStyleSheet = function(a_doc)
{
    var css_id = this.getchromepkg() + "-css";
    Alph.$("#"+css_id,a_doc).remove();
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

Alph.LanguageTool.prototype.handleInflectionDisplay = function(a_tbl)
{
  // default does nothing   
};