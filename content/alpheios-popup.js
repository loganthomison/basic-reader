/**
 * @fileoverview This file contains the Alph.xlate class with generic 
 * Mouseover translation functions
 * 
 * @version $Id$
 * 
 * Copyright 2008-2009 Cantus Foundation
 * http://alpheios.net
 * 
 * Based upon PeraPera-Kun
 * A modded version of Rikai-Chan by Justin Kovalchuk
 * Original Author: Jonathan Zarate
 * Copyright (C) 2005-2006 
 * http://www.polarcloud.com/
 * 
 * Based on rikaiXUL 0.4 by Todd Rudick
 * http://rikaixul.mozdev.org/
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
 * Alph.xlate contains the generic popup functionality
 * @singleton
 */
Alph.xlate = {
    
    /**
     * An XSLT Processor for the lexicon xml output
     * @private
     * @type XSLTProcessor
     */
    xsltProcessor: null,

    /**
     * Transforms xml text adhering to the alpheios schema to html
     * TODO transform stylesheet may need to be language specific
     * @private
     * @param {String} a_text the text to be transformed
     * @return an HTML Node containing the transformed text
     * @type Node
     */
    transform: function(a_text)
    {
        /* initialze the xsltProcessor if we haven't done so already */
        if (this.xsltProcessor == null)
        {
            var xmlDoc = document.implementation.createDocument("", "", null);
            xmlDoc.async = false;
            xmlDoc.load("chrome://alpheios/skin/alpheios.xsl");
            this.xsltProcessor = new XSLTProcessor();
            this.xsltProcessor.importStylesheet(xmlDoc);
        }
        var wordHTML = '';
        try
        {
            var wordXML = (new DOMParser()).parseFromString(a_text,"text/xml");
            wordHTML = this.xsltProcessor.transformToDocument(wordXML);
        }
        catch (e)
        {
            Alph.util.log(e);
        }
        return wordHTML;
    },

    /**
     * Handler for the popup trigger event.
     * @param {Event} a_e the Event
     */
    doMouseMoveOverText: function(a_e)
    {
        if (!a_e)
            a_e = window.event;

        var rp = a_e.rangeParent;
        var ro = a_e.rangeOffset;

        // Check to see if the user has selected text from within an SVG diagram
        var is_svg_text = (
            rp instanceof SVGElement &&
            rp.tagName == 'text' && 
            rp.firstChild && 
            rp.firstChild.nodeType == 3
        );
        // if no data, nothing to do
        if (typeof rp == "undefined" || rp == null || 
            (! rp.data && ! is_svg_text))
        {
            return;
        }

        /*
         * This is code originates from peraperakun. It checks to make sure the target
         * of the event is either an SVG text node, a regular text node (nodeType of 3) 
         * or an element in a form.
         * This prevents the popup from displaying when the mouse moves over whitespace
         * in the enclosing element.
         * The explicitOriginalTarget property of the event is a mozilla-specific
         * property which provides access to the precise node that received the event.
         * By contrast, in Mozilla the target property always points to the containing 
         * element object whose nodeType will always be 1.
         * See O'Reilly's Dynamic HTML 3rd Edition and also
         * http://developer.mozilla.org/en/docs/DOM:event.explicitOriginalTarget
         * and https://bugzilla.mozilla.org/show_bug.cgi?id=185889
         * However, this does not seem to work the same for the dbleclick event
         * so this should be limited to use of the mousemove trigger.  
         */
        if ( Alph.main.getXlateTrigger() == 'mousemove' &&
             ! is_svg_text &&
             (a_e.explicitOriginalTarget.nodeType != 3) && !("form" in a_e.target)) {
            this.clearSelection();                
            return;
        }

        // disable the translate function if and the mouse is over an 
        // element in a section of the page we've been told to ignore
        // (e.g. web site interface text as opposed to source text)
        if ( Alph.$(a_e.explicitOriginalTarget).hasClass('alpheios-ignore') ||
             Alph.$(a_e.explicitOriginalTarget).parents('.alpheios-ignore').length > 0)
        {
            this.clearSelection();
            return;
        }

        /* The rangeParent is going to be a #text node.
         * Get the parentNode of the text node for use in traversing
         * for the context if the node contains only a single word.
         */
        var rp_parent = rp.parentNode;

        var range = document.createRange();
        range.selectNode(rp);
        var rngstr;
        // when the selected element is an svg text element, retrieve the text from
        // the child textNode directly rather than from the range parent.
        // But when the trigger is dbleclick, the range parent text node is empty
        // so the text must be retrieved from the explicitOriginalTarget instead.  
        if (is_svg_text)
        {
            rngstr = rp.firstChild.nodeValue || 
                (a_e.explicitOriginalTarget.firstChild ? 
                    a_e.explicitOriginalTarget.firstChild.nodeValue : ""); 
        }
        else
        {
            rngstr = range.toString();
        }
        /* detachs the range from the parent document so that DOM no longer tracks it */
        range.detach();

        /* There is apparently a bug in mozilla's handling of the mouse events -- 
         * if the text in the range string is preceded only by spaces or new lines 
         * then the the first non-whitepace character is never set as the rangeOffset
         * of the event. This does not seem to affect use of the case for the &nbsp; entity
         * or whitespace in a pre tag, so we should be safe just advancing the range offset
         * while not affecting later tests for the mouse being in the margins
         */
        var testchar;
        while ( ro < rngstr.length )
        { 
            var testchar = rngstr.charCodeAt(ro);
            if (testchar == 32 || testchar == 9 || testchar == 10)
            {
                ++ro;
                Alph.util.log("Advancing range offset past whitespace.");
            }
            else
            {
                break;
            }
        }

        // if we advanced past the end of the string without finding anything 
        // then it was empty space so just clear the selection and return 
        if (ro >= rngstr.length) {
            
            this.clearSelection();
            return;
        }
        var alphtarget = Alph.main.getLanguageTool().findSelection(ro,rngstr);

        // if we couldn't identify the target word, return without doing anything
        if (! alphtarget.getWord())
        {
            this.clearSelection();
            return;
        }
        
        // add the range parent object to the target
        // so that the user's selection can be highlighted
        // again differently after translation, if necessary
        alphtarget.setRangeParent(rp);
            
        // nothing to do if same word as last AND the popup is shown
        // (hidePopup removes the last word from the state variable),
        // unless we're in query  mode and the popup isn't showing,
        // in which case selecting the same word
        // again should act like a reset
        var alph_state = Alph.main.get_state_obj();
        var lastSelection = alph_state.get_var("lastSelection");
        if (alphtarget.equals(lastSelection))
        {
            if (Alph.interactive.enabled() && (! this.popupVisible()) )
            {
                Alph.interactive.closeQueryDisplay(Alph.main.getCurrentBrowser());
            }
            else
            {
                return;
            }
        }

        alph_state.set_var("lastWord",alphtarget.getWord());
        alph_state.set_var("lastSelection", alphtarget);

        // This code fails for an svg element; For now just skip it
        // but we should eventually also highlight the selection within the svg  
        if (! is_svg_text)
        {
            // Add the range back to the document highlighted as the selected range
            var doc = rp.ownerDocument;
            var r = doc.createRange();
            r.setStart(rp, alphtarget.getWordStart());
            r.setEnd(rp, alphtarget.getWordEnd());
            var sel = doc.defaultView.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
        }
        
        // do we have a treebank query for this word?
        var treebank_ref = Alph.$(rp).attr("tbref") || Alph.$(rp).parents().attr("tbref");
        
        // if we're in the dependency tree diagram, the treebank reference will 
        // be in the id attribute of the parent tree-node element
        if (! treebank_ref && is_svg_text)
        {
            treebank_ref = Alph.$(rp).parents('.tree-node').attr("id");
        }
        if (treebank_ref)
        {
            var treebank_url = 
                Alph.$("meta[name=alpheios-treebank-url]",doc).attr("content");
            // if we're in the dependency tree diagram, we will have a treebank reference
            // but no treebank_url. get the treebank url from the main browser window
            // in that case.
            if (!treebank_url && is_svg_text )
            {
                treebank_url = 
                    Alph.$("meta[name=alpheios-treebank-url]",
                        Alph.main.getCurrentBrowser().contentDocument).attr("content");
            }
            if (treebank_url)
            {
                alphtarget.setTreebankQuery(treebank_url.replace(/WORD/,treebank_ref));
            }
        }
        // show output
        this.showPopup(a_e,alphtarget);
    },


    /**
     * Displays an error in the popup. Supplied as a callback argument
     * to the {@link Alph.LanguageTool#lexiconLookup} method. 
     * @param {String} a_msg the error message
     * @param a_doc_array Array of Documents which holds the morphological details
     * @param a_lang_tool the Alph.Language object which initiated the lookup
     */
    translationError: function (a_msg,a_doc_array)
    {
        var err_msg =
            document
                .getElementById("alpheios-strings")
                .getFormattedString(
                    "alph-loading-error",
                    [a_msg ]);
        Alph.util.log("Query Response (Error): " + err_msg);
        //if (Alph.main.useLocalDaemon() && 
        //    typeof Alph.main.getCurrentBrowser()
        //                  .alpheios.daemonPid == "undefined")
        //{
        //    err_msg = err_msg + '<br/>' +  
        //        document.getElementById("alpheios-strings")
        //                .getString("alph-error-mhttpd-notstarted");
        //}
        
        // the first document in the array is the main one
        var a_topdoc = a_doc_array[0];

        a_doc_array.forEach(
           function(a_doc)
           {
                Alph.$("#alph-text-loading",a_doc).remove();
        
                // replace any earlier error
                Alph.$("#alph-loading-error",a_doc).remove();

                Alph.$("#alph-text",a_doc).append(
                    '<div id="alph-loading-error">' +
                    err_msg +
                    '</div>'
                );
           }
       );
       Alph.main.broadcast_ui_event(Alph.main.events.SHOW_TRANS);
    },

    /**
     * Shows the results of the lexicon lookup in the popup.
     * Supplied as a callback argument to the 
     * {@link Alph.LanguageTool#lexiconLookup} method.
     * @param {String} a_xml the xml string containing the lexicon response
     * @param {Object} a_alphtarget the details on the target of the event which triggered the popup
     *                 (as returned by {@link Alph.LanguageTool#findSelection})
     * @param a_doc_arry the array of documents which contain the morphological text
     * @param a_lang_tool the Alph.Language object which initiated the lookup  
     */
    showTranslation: function(a_xml,a_alphtarget,a_doc_array,a_lang_tool) {
        Alph.util.log("Query response:" + a_xml);
        
        // the first document in the array is the main one
        var a_topdoc = a_doc_array[0];
        
        var wordHTML = Alph.xlate.transform(a_xml);
        // don't display an empty popup
        if (   (wordHTML == '')
            || (   (Alph.$(".alph-entry",wordHTML).size() == 0)
                && (Alph.$(".alph-unknown",wordHTML).size() == 0)
                && (Alph.$(".alph-error",wordHTML).size() == 0)))
        {
            Alph.util.log("No valid entries to display.");
            a_doc_array.forEach(
                function(a_doc)
                {
                    Alph.xlate.hidePopup(a_doc);        
                }
            );            
        }
        
        // add a class to the first word in the response 
        Alph.$("div.alph-word:first",wordHTML).addClass("alph-word-first");
        
        a_doc_array.forEach(
            function(a_doc)
            {
        
                Alph.$("#alph-text",a_doc).remove();
            }
        );

        var alphtext_node = 
            window.content.document.importNode(wordHTML.getElementById("alph-text"),true);
        
        var disambiguate_id = null;
        if (a_alphtarget.getTreebankQuery())
        {
            disambiguate_id =
                (new Date()).getTime()
                + encodeURIComponent(a_alphtarget.getWord());
        }
        a_lang_tool.postTransform(alphtext_node);
        a_doc_array.forEach(
            function(a_doc)
            {
                if (disambiguate_id)
                {
                    Alph.$("#alph-window",a_doc).attr("alpheios-pending",disambiguate_id);
                }
                Alph.$("#alph-window",a_doc).append(Alph.$(alphtext_node).clone());
                // add the key to the language tool to the element
                Alph.$("#alph-text",a_doc).attr('alph-lang',
                    a_lang_tool.source_language);
                // add language-specific click handler, if any
                a_lang_tool.contextHandler(a_doc);
        
                Alph.$("#alph-text",a_doc).prepend('<div id="alph-word-tools"/>');
                a_lang_tool.add_word_tools(
                    Alph.$("#alph-text",a_doc),
                    a_alphtarget);
                
                a_lang_tool.add_infl_help(
                    Alph.$("#alph-text",a_doc),
                    a_alphtarget);                
            }
        );


        var rp = a_alphtarget.getRangeParent()
        
        // re-highlight the translated range in the source document
        // This code fails for an svg element; For now just skip it
        // but we should eventually also highlight the selection within the svg  
        if (rp && ! rp instanceof SVGElement) 
        {
            var doc = rp.ownerDocument;
            var r = doc.createRange();
            r.setStart(rp, a_alphtarget.getWordStart());
            r.setEnd(rp, a_alphtarget.getWordEnd());
            var sel = doc.defaultView.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
        }

        // focus on the popup window so that we make sure our event handlers
        // are going to be invoked (i.e. if a textbox elsewhere is focused, the keydown
        // event listener might be hijacked) See Bug 149.
        Alph.$("#alph-window-anchor",a_topdoc).focus();
        // TODO - we probably should reposition the popup now that we 
        // know it's final size
        
        // disambiguate if treebank is available
        if (disambiguate_id)
        {
            Alph.util.log("Disambiguating ..." + a_alphtarget.getTreebankQuery());
            // send asynchronous request to the lexicon service
            Alph.$.ajax(
                {
                    type: "GET",
                    url: a_alphtarget.getTreebankQuery(),
                    timeout: Alph.util.getPref("url.treebank.timeout") || 5000,
                    dataType: 'html',
                    error: function(req,textStatus,errorThrown)
                    {
                        Alph.util.log("Error disambiguating morphology: " + textStatus||errorThrown);
                        a_doc_array.forEach(
                            function(a_doc)
                            {
                                try
                                {
                                    Alph.$("#alph-window[alpheios-pending="+disambiguate_id+"]",a_doc)
                                        .get(0).removeAttribute("alpheios-pending");
                                }
                                catch(a_e)
                                {
                                    //it's possible that a new request came in and removed the 
                                    // attribute, so quietly ignore error removing it 
                                }
                            }
                        );
                        Alph.main.broadcast_ui_event(Alph.main.events.SHOW_TRANS);
                    },
                    success: function(data, textStatus) 
                    {
                    
                        Alph.xlate.updateTranslation(disambiguate_id,data,a_alphtarget,a_doc_array,a_lang_tool);
                        Alph.main.broadcast_ui_event(Alph.main.events.SHOW_TRANS);
                        Alph.interactive.openQueryDisplay(a_topdoc,a_alphtarget);
                    } 
                }   
            );
        }
        else
        {
            Alph.main.broadcast_ui_event(Alph.main.events.SHOW_TRANS);
            Alph.interactive.openQueryDisplay(a_topdoc,a_alphtarget);
        }
        
    },  
    /**
     * Update the results of the lexicon lookup in the popup.
     * @param {String} a_req_id unique identifier for the disambiguate request
     * @param {String} a_xml the xml string containing the lexicon response
     * @param {Object} a_alphtarget the details on the target of the event which triggered the popup
     *                 (as returned by {@link Alph.LanguageTool#findSelection})
     * @param a_doc_array the array of Documents which contain the morphological text
     * @param a_lang_tool the Alph.Language tool which initiated the request  
     */
     updateTranslation: function(a_req_id,a_xml,a_alphtarget,a_doc_array,a_lang_tool) 
     {          
        Alph.util.log("Query response:" + a_xml);
        
        // the first document in the array is the main one
        var a_topdoc = a_doc_array[0];

        var wordHTML = Alph.xlate.transform(a_xml);
        // just quietly display the morpheus output if the treebank query
        // returned an error or didn't include any data
        // note that not all parts of speech include inflection data
        // so we need to check for the presence of a dictionary entry
        if (   (wordHTML == '') ||
               Alph.$(".alph-dict",wordHTML).length == 0)        
        {
            a_doc_array.forEach(
                function(a_doc)
                {
                    try
                    {
                        Alph.$("#alph-window[alpheios-pending="+a_req_id+"]",a_doc)
                                    .get(0).removeAttribute("alpheios-pending");
                    }
                    catch(a_e){
                        //it's possible that a new request came in and removed the 
                        // attribute, so quietly ignore error removing it 
                    }
                }
            );
            Alph.util.log("No treebank entries to display.");
        }
        else
        {
            
            var new_text_node = 
                    window.content.document.importNode(
                    Alph.$("#alph-text",wordHTML).get(0),true);

            a_lang_tool.postTransform(new_text_node);
            a_lang_tool.contextHandler(new_text_node);
            a_lang_tool.add_infl_help(
                    new_text_node,a_alphtarget);        
            
            var new_entry = Alph.$(".alph-entry",new_text_node);
            var new_dict = Alph.$(".alph-dict",new_entry);
            var new_hdwd = Alph.$(new_dict).attr("lemma-key");
            var new_infl_node = 
                    Alph.$(".alph-infl",new_entry).get(0);
            var new_pofs = Alph.$('.alph-pofs',new_entry).attr('context');                    
            
            // iterate through the documents containing the morphology results
            // merging the disambiguated output into the original results
            // in each document
            for (var j=0; j<a_doc_array.length;j++)
            {
                var a_doc = a_doc_array[j];
                // if a request for a new word came in while waiting for the response
                // to the disambiguation requestion, the alpheios-pending attribute
                // won't match and we will just discard the disabmiguation
                // results rather than trying to merge them into a new words' results
                var popup = 
                        Alph.$("#alph-window[alpheios-pending=" + a_req_id + 
                                "] #alph-text",a_doc);
                if (popup.length == 0)
                {
                    Alph.util.log("Discarding disamibuguation " + a_req_id);
                    continue;
                }
                    
                // remove the old word tool icons from the popup, we need to refresh
                // them with new tools after we incorporate the disambiguated output
                Alph.$("#alph-word-tools",popup).remove();
        
                // try to find an entry with the same lemma and replace the 
                // contents of the first inflection set for that entry 
                // with the treebank output
                var lemma_match_set = 
                    Alph.$(".alph-dict[lemma-key=" + new_hdwd +"]",popup)
                    .parents(".alph-entry");

                // if we didn't have a match, and the treebank lemma has a 1
                // at the end of it (which means 1st sense in the dictionary entry)
                // drop the 1 and try again
                if (lemma_match_set.length == 0 && new_hdwd.match(/1$/))
                {
                    new_hdwd = new_hdwd.replace(/1$/,'');
                }
                
                lemma_match_set = 
                    Alph.$(".alph-dict[lemma-key=" + new_hdwd +"]",popup)
                    .parents(".alph-entry");
                var pofs_match_set = [];
                if (lemma_match_set.length >0)
                {
                    pofs_match_set =
                        Alph.$('.alph-dict .alph-pofs[context='+new_pofs+']',lemma_match_set)
                            .parents('.alph-entry');
                    // if no matching lemma entries with matching part of speech
                    // at the dictionary level were found, check the pofs at the
                    // inflection set level
                    if (pofs_match_set.length == 0)
                    {
                        pofs_match_set =
                            Alph.$('.alph-infl-set .alph-pofs[context='+new_pofs+']',
                                lemma_match_set).parents('.alph-entry');
                    }
                }
                // if entries with matching part of speech and lemma were
                // found, just use the new entry -- we'll lose details
                // on the inflection but they wouldn't be right anyway
                if (pofs_match_set.length == 0)
                {
                    Alph.util.log("Can't find entry matching treebank");
                    Alph.$(".alph-word",popup).remove();
                    Alph.$(popup).prepend(
                            Alph.$(".alph-word",new_text_node).clone(true)
                                .addClass("tb-morph-word")
                                .addClass("alph-word-first")
                    );
                }
                else
                {
                    var good_entries = 0;
                    // if we still have multiple matching entries at this point,
                    // which seems unlikely, we may keep both if inflection 
                    // details match in both; iterate through them
                    // looking for the matching inflection
                    for (var i=0; i<pofs_match_set.length; i++)
                    {
                        var entry_match = pofs_match_set[i];
                        var morph_pofs =
                            Alph.$('.alph-dict .alph-pofs',entry_match)
                                .attr('context');
                
                        // if the part of speech indicated by the
                        // treebank differs from the original
                        // replace the entire dictionary section
                        // (conj and declension will likely also be wrong 
                        // - but these aren't identified by the treebank)
                        if (morph_pofs != new_pofs)
                        {
                            Alph.$('.alph-dict',entry_match)
                                .before(Alph.$(new_dict).clone(true))
                                .remove();
                        }
                        var infl_set_possible = Alph.$(".alph-infl-set",entry_match);
                        var infl_set_matches = [];
                
                        for (var i=0; i<infl_set_possible.length;i++)
                        {
                            var infl_set = infl_set_possible[i];
                            // insert the new inflection only into 
                            // an inflection set of the same part of speech 
                            // as the new entry 
                             var infl_pofs = 
                                Alph.$(".alph-pofs",infl_set)
                                    .attr('context')
                                || morph_pofs;
                            if (infl_pofs == 
                                Alph.$('.alph-pofs',new_entry).attr('context'))
                            {
                                infl_set_matches.push(i);
                            }
                        }
                        // if we found a single matching inflection set, let's
                        // just use it - chances are it is right
                        if (infl_set_matches.length == 1)
                        {
                            var matched_infl_set =
                                Alph.$(infl_set_possible).eq(infl_set_matches[0]);
                            Alph.$('.alph-infl',matched_infl_set).remove();
                            if (new_infl_node != null)
                            {
                                Alph.$(matched_infl_set)
                                    .append(Alph.$(new_infl_node).clone(true));
                            }
                            Alph.$(matched_infl_set).siblings(".alph-infl-set").remove();
                            good_entries = 1;
                            Alph.$(entry_match).attr("tb-match",true);
                        }
                        // if we have multiple matching inflection sets,
                        // prefer one which contains an matching inflection
                        else if (infl_set_matches.length >1)
                        {   
                            var merge_sets = [];
                            for (var i=0; i<infl_set_matches.length;i++)
                            {
                                merge_sets.push(  
                                    Alph.$(infl_set_possible).eq(infl_set_matches[i])
                                    .clone(true));
                            }
                            // remove all the old inflection sets, we're going
                            // to replace them with only inflection sets with
                            // matching inflections
                            Alph.$(infl_set_possible).remove();
                            merge_sets.forEach(
                                function(a_infl_set)
                                {
                                    var matches = 0;
                                    Alph.$(".alph-infl",a_infl_set).each(
                                        function(a_i)
                                        {
                                            if (a_lang_tool.match_infl(new_infl_node,this))
                                            {
                                                matches++;
                                            }                           
                                        }
                                    );
                                    if (matches > 0)
                                    {
                                        Alph.$('.alph-infl',a_infl_set).remove();
                                        Alph.$(a_infl_set)
                                            .append(Alph.$(new_infl_node).clone(true));
                                        Alph.$(entry_match).append(a_infl_set);
                                        good_entries++;
                                        Alph.$(entry_match).attr("tb-match",true);
                                    }
                                }  
                            );
                        }
                        else
                        {
                            // if we don't have any matching inflection sets
                            // just drop them all .. we'll create a new one
                            Alph.$(infl_set_possible).remove();
                        }
                    } // end iteration through matching entries
                    
                    if (good_entries == 0)
                    {
                        // if we couldn't find any matching inflection sets, then
                        // just use the first matching entry, and create a new
                        // inflection set
                        for (var i=1; i<pofs_match_set.length; i++)
                        {
                            pofs_match_set[i].remove();
                        }
                        pofs_match_set = pofs_match_set.eq(0);    
                        Alph.$(pofs_match_set).attr("tb-match",true);
                        if (new_infl_node != null)
                        {
                            Alph.$(new_infl_node).clone(true).appendTo(pofs_match_set);
                            Alph.$(".alph-infl",pofs_match_set)
                                .wrap('<div class="alph-infl-set"></div>',a_doc);
                        }
                    }
                    // remove any entries which didn't match
                    Alph.$(".alph-entry:not([tb-match])",popup).remove();
                       
                    for (var i=0; i<pofs_match_set.length; i++)
                    {
                       var entry_match = pofs_match_set[i];
                      
                       // remove any pofs on the inflection set because
                       // disambiguated output will always list the pofs 
                       // of the dictionary entry as the pofs of the inflection set
                       Alph.$(".alph-infl-set .alph-pofs",entry_match).remove();

                       if (Alph.$(".alph-infl-set",entry_match).length == 0)
                       { 
                            // if we don't have any inflection set at all, make
                            // sure we remove the form label from the popup too
                            Alph.$(".alpheios-form-label",entry_match).remove();
                        }
                    }
                    var final_word_set = 
                        Alph.$(pofs_match_set).parents(".alph-word").clone();
                    
                    // remove all the old word elements from the popup
                    Alph.$(".alph-word",popup).remove();
                    // iterate through the final word elements, adding them 
                    // back into the popup
                    for (var i=0; i<final_word_set.length; i++)
                    {
                        var word = final_word_set[i];
                        if (i == 0)    
                        {
                            Alph.$(word).addClass("alph-word-first");
                        }
                        Alph.$(word).addClass("tb-morph-word")
                        Alph.$(popup).append(word);
                    }
                }
                Alph.$(popup).prepend('<div id="alph-word-tools"/>');
                Alph.main.getLanguageTool().add_word_tools(
                    Alph.$(popup),a_alphtarget);

                // we're finally done, so get rid of the pending status on the
                // popup
                try
                {
                    Alph.$("#alph-window[alpheios-pending=" + a_req_id + 
                            "]",a_doc).get(0).removeAttribute("alpheios-pending");
                } 
                catch(a_e)
                {
                    //it's possible that a new request came in and removed the 
                    // attribute, so quietly ignore error removing it 
                }
            }
        }
                
        Alph.$("#alph-window-anchor",a_topdoc).focus();
    },
        
    /**
     * Determines whether or not the popup should be displayed in response
     * to the trigger event. Called by the {@link #doMouseMoveOverText} event handler.
     * @private
     * @param {Event} the event which triggered the popup
     * @param {Object} the details on the target of the event which triggered the popup
     *                 @see Alph.LanguageTool#findSelection
     */
    showPopup: function(a_e, a_alphtarget)
    {
    
        var a_elem = a_e.target;
        var a_x = a_e.screenX;
        var a_y = a_e.screenY;
        var pageX = a_e.pageX;
        var pageY = a_e.pageY;
        var lang_tool = Alph.main.getLanguageTool();
        const topdoc = a_elem.ownerDocument;
        var alph_state = Alph.main.get_state_obj();
        var popup;
        // check the alpheios state object for the prior element 
        if (alph_state.get_var("lastElem"))
        {
            popup = Alph.$("#alph-window",alph_state.get_var("lastElem").ownerDocument).get(0);
        }
        // if the popup window exists, and it's in a different document than
        // the current one, remove it from the prior document
        if (popup && (topdoc != alph_state.get_var("lastElem").ownerDocument))
        {
            this.removePopup(Alph.main.getCurrentBrowser());
            popup = null;
        }
                        
        // popup element not found or removed, so create a new one
        if (!popup)
        {
            // add the base alpheios stylesheet
            var css = topdoc.createElementNS("http://www.w3.org/1999/xhtml",
                                             "link");
            css.setAttribute("rel", "stylesheet");
            css.setAttribute("type", "text/css");
            css.setAttribute("href", "chrome://alpheios/skin/alpheios.css");
            css.setAttribute("class", "alpheios-css");
            Alph.$("head",topdoc).append(css);
            var css_os = Alph.$(css).clone()
                .attr("href","chrome://alpheios/skin/alpheios-os.css");
            Alph.$("head",topdoc).append(css_os);
            

            // add any language-specific stylesheet
            lang_tool.addStyleSheet(topdoc);
            
            popup = topdoc.createElementNS("http://www.w3.org/1999/xhtml", "div");
            popup.setAttribute("id", "alph-window");

            /* cancel the mousemove and dblclick events over the popup */
            popup.addEventListener("mousemove", this.cancelMouseMove, false);
            popup.addEventListener("dblclick", this.cancelDoubleClick, false);
            
            Alph.$("body",topdoc).append(popup);
        
            
            // add a close link 
            Alph.$(popup).append('<div class="alph-title-bar"><div class="alph-close-button">&#160;</div></div>')
            Alph.$(".alph-close-button",topdoc).bind("click",
                function()
                {
                    Alph.xlate.hidePopup()
                }
            );
                
            var anchor = topdoc.createElementNS("http://www.w3.org/1999/xhtml",
                                                 "a");
            anchor.setAttribute("name","alph-window-anchor");
            anchor.setAttribute("id","alph-window-anchor");
            popup.appendChild(anchor);
        }

        // add the element to the alpheios state object in the browser,
        // so that it can be accessed to remove the popup later
        alph_state.set_var("lastElem",a_elem);

        popup.style.width = "auto";
        popup.style.height = "auto";

        var frame_offset;
        var frame_scroll;

        // get the frame offset and scroll coordines, if the selected
        // element is in a frame
        if (a_elem.ownerDocument.defaultView.frameElement != null)
        {
            try 
            {
                frame_offset = Alph.$(a_elem.ownerDocument.defaultView.frameElement).offset();
                frame_scroll = {};
                var frame_body = Alph.$("body",topdoc).get(0);                       
                frame_scroll.left = frame_body.scrollLeft;
                frame_scroll.top = frame_body.scrollTop;
            }
            catch(e)
            {
                Alph.util.log("Error getting frame coords: " + e);
            }
        }

        // TODO this should be a config option
        popup.style.maxWidth = "600px";

        /* reset the contents of the popup */
        var xlate_loading =
            document
                .getElementById("alpheios-strings")
                .getFormattedString("alph-loading-translation",[a_alphtarget.getWord()]);
        Alph.$("#alph-text",popup).remove();
        Alph.$("#alph-window",topdoc).get(0).removeAttribute("alpheios-pending");
        Alph.$("#alph-window",topdoc).append(
            '<div id="alph-text"><div id="alph-text-loading">' +
            xlate_loading +
            '</div></div>'
        );

        // move the popup to just below the mouse coordinates
        // (using height of current element isn't reliable because it might 
        //  a single element which contains a large block of text)
        if (a_elem)
        {
            pageY = pageY + 12;
        }

        popup.style.left = pageX + "px";
        popup.style.top = pageY + "px";
        popup.style.display = "";

        // add the original word to the browser's alpheios object so that the
        // other functions can access it
        alph_state.set_var("word",a_alphtarget.getWord());

        var doc_array = [topdoc];
        Alph.$(".alph-lexicon-output").each(
            function() 
            {
                var doc = Alph.$(this).get(0).contentDocument
                lang_tool.addStyleSheet(doc);
                Alph.$("#alph-window",doc).css("display","block");
                doc_array.push(doc);
            }
        );
        // lookup the selection in the lexicon
        // pass a callback to showTranslation to populate
        // the popup and any other lexicon 
        // output browsers (i.e. in the morph panel)
        // with the results on success,
        // and a call back to translationError to populate
        // the popup with an error message on failure
        lang_tool.lexiconLookup(
            a_alphtarget,
            function(data)
            {
                Alph.xlate.showTranslation(data,a_alphtarget,doc_array,lang_tool);

            },
            function(a_msg)
            {   
                Alph.xlate.translationError(a_msg,doc_array,lang_tool);
            }
        );
    },

    /**
     * Hides the popup and removes the alpheios stylesheets from the 
     * browser content document.
     * @param {Node} a_node - the node which contains the popup
     */
    hidePopup: function(a_node)
    {
        var topdoc = a_node || this.getLastDoc();
        Alph.$("#alph-window",topdoc).css("display","none");
        Alph.$("#alph-text",topdoc).remove();
        this.clearSelection(topdoc);
        // remove the last word from the state
        var alph_state = Alph.main.get_state_obj();
        if (alph_state.get_var("enabled"))
        { 
            alph_state.set_var("lastWord", null);
            alph_state.set_var("lastSelection",null);
        
        }
        Alph.main.broadcast_ui_event(Alph.main.events.HIDE_POPUP);
        // keep the last element in the state, so that we can find
        // the popup (and stylesheets) again
    },

    /**
     * Stops propagation of the mousemove trigger event
     * @private
     * @param {Event} a_e the event
     */
    cancelMouseMove: function(a_e)
    {
        a_e.stopPropagation();
    },

    /**
     * Stops propagation of the dbleclick trigger event
     * @private
     * @param {Event} a_e the event
     */
    cancelDoubleClick: function(a_e)
    {
        a_e.stopPropagation();
    },
    
    /**
     * Closes any secondary windows opened by the extension.
     * @param a_bro the current browser
     */
    closeSecondaryWindows: function(a_bro)
    {
        // return if the extension isn't enabled for this browser
        if (! Alph.main.is_enabled(a_bro))
        {
            return;
        }
        var windows = Alph.main.get_state_obj(a_bro).get_var("windows");
        for (var win in windows)
        {
            Alph.util.log("Checking status of window " + win);
            if (windows[win] != null && ! windows[win].closed)
            {
                windows[win].close();
                windows[win] = null;
            }
        }
    },

    /**
     * Opens or replaces a popup window and adds a reference to it to the
     * alpheios state variable on the current browser.
     *  @param {String} a_name the name of the new window
     *  @param {String} a_url the url to load in the window
     *  @param {Properties} a_feature optional feature properties for the window
     *  @param {Array} a_window_args optional array of arguments to pass
     *                                to the new window
     *  @param {function} a_start_call optional callback to be executed
     *                                 just before opening the window
     *  @param {Array} a_start_args optional array of arguments to pass to the
     *                              a_start_call callback
     *  @param {function} a_load_call optional callback to be installed as an
     *                                onload event handler in the new window
     *  @return the window 
     */
    openSecondaryWindow: function(
        a_name,
        a_url,
        a_features,
        a_window_args,
        a_start_call,
        a_start_args,
        a_load_call)
    {

        // the target window can call the passed in function
        // to remove the loading message

        // it doesn't seem possible to reset the window.arguments
        // so if arguments are being passed to the new window,
        // just proceed as if opening a new window
        var windows = 
            Alph.main.get_state_obj(Alph.main.getCurrentBrowser())
            .get_var("windows");
        
        var a_window = windows[a_name];
                
        // if the window exists already, is open, has the same location
        // and an update_args_callback property has been added to 
        // the window arguments, just call that with the new arguments
        // rather than reloading the window 
        if (a_window &&
            ! a_window.closed &&
            a_window.location.href == a_url &&
            a_window.arguments && 
            a_window.arguments[0].update_args_callback != null)
        {
            Alph.util.log("Calling update_args_callback for window " + a_name);
            a_window.arguments[0].update_args_callback(a_window_args);
        }
        // if the window doesn't exist, or is closed, or has arguments
        // and didn't meet the prior condition, 
        // reload it with the new arguments
        else if (a_window == null || a_window.closed || a_window_args)
        {

            Alph.util.log("Opening new window named: " + a_name);
            // add a loading message to notify the user we're loading
            // the grammar - really this should come from a
            // stringbundle if we're going to keep it
            if (a_start_call != null) {
                a_start_call(a_start_args);
            }

            // set the feature string for the new window
            // adding in any overrides from the arguments
            // note that the chrome feature seems to impact
            // the behavior of javascript installed in the chrome
            // of the newly opened window
            var features =
            {
                chrome: "yes",
                dialog: "no",
                resizable: "yes",
                width: "800",
                height: "600",
                scrollbars: "yes"
            };

            for (var prop in a_features)
            {
                // calculate actual screenX,screenY
                if (prop == 'screen') {
                    var target_width;
                    var target_height;
                    if (a_features.width != null)
                    {
                        target_width = a_features.width;
                    }
                    else
                    {
                        target_width = features.width;
                    }
                    if (a_features.height != null)
                    {
                        target_height = a_features.height;
                    }
                    else
                    {
                        target_height = features.height;
                    }

                    var right_x = window.outerWidth - target_width;
                    if (right_x < 0)
                    {
                        right_x = window.screenX;
                    }
                    var bottom_y = window.outerHeight - target_height;
                    if ( bottom_y < 0 ){
                        bottom_y = window.screenY;
                    }
                    Alph.util.log("Screen: " + a_features[prop]);
                    switch(a_features[prop])
                    {
                        case "topright":
                        {
                            features.screenY = window.screenY;
                            features.screenX = right_x;
                            break;
                        }
                        case "bottomleft":
                        {
                            features.screenX = window.screenX;
                            features.screenY = bottom_y;
                            break;
                        }
                        case "bottomright":
                        {
                            features.screenX = right_x;
                            features.screenY = bottom_y;
                            break;
                        }
                        default: //"topleft"
                        {
                            features.screenX = window.screenX;
                            features.screenY = window.screenY;
                        }
                    }
                }
                else
                {
                    features[prop] = a_features[prop];
                }
            };

            var feature_list = [];
            for (var prop in features)
            {
                feature_list.push(
                    prop + "=" + features[prop]);
            }

            Alph.util.log("Features: " + feature_list.join(","));
            a_window = window.openDialog(
                a_url,
                a_name,
                feature_list.join(","),
                a_window_args
                );

            // install the onload handler in the new window
            if (a_load_call != null)
            {
                a_window.addEventListener(
                            "load",
                            a_load_call,
                            false);
            }
        }
        // the target window is already open, replace the location
        else
        {
            var current_location = a_window.location;

            var match_result =
                a_url.match(/^(\w+):\/\/([^\/]+)(\/\S*?)(#.+)?$/);
            // if a match, full string is in match_result[0]
            var target_host = match_result[2];
            var target_path = match_result[3];
            var target_hash = match_result[4];

            // if the target url is the same as the current url
            // and both specify a named location in the same file,
            // replace just the hash part of the location to prevent
            // reloading the window with the new location
            if (target_hash != null &&
                current_location.host == target_host &&
                current_location.pathname == target_path &&
                a_window.location.hash != null &&
                a_window.location.hash != ''
                )
            {
                Alph.util.log("Replacing location hash with " + target_hash);
                a_window.location.hash = target_hash;
            }
            // otherwise, just replace the location and allow the window
            // to reload. It should come into focus before replacing the
            // location, so adding loading message to the source window
            // shouldn't be necessary
            else
            {
                Alph.util.log("Replacing location with " + a_url);
                a_window.location = a_url;
                
            }

        }
        // now focus the window
        a_window.focus();
        Alph.util.log("Secondary window should have focus at "+ a_url);
        windows[a_name] = a_window;
        return a_window;
    },

    /**
     * Callback to hide the loading message in the popup.
     * @param {Document} document which contains the loading message 
     */
    hideLoadingMessage: function(a_doc)
    {
        
        var topdoc = a_doc || Alph.xlate.getLastDoc(); 
        try {
            // we can't use the event target, because the event is 
            // in the 2ndary window not the one showing the message
            Alph.$("#alph-secondary-loading",topdoc).remove();
            
            // also check the morphology and dictionary windows
            Alph.main.panels['alph-morph-panel'].get_current_doc().forEach
            (
                function(a_doc)
                {
                    Alph.$("#alph-secondary-loading",a_doc).remove();
                }
            );
            Alph.$(".alph-lexicon-output").each( 
                function() {
                    var doc = Alph.$(this).get(0).contentDocument;
                    Alph.$("#alph-secondary-loading",doc).remove();
                }
            );
        }
        catch(e)
        {
            Alph.util.log("Error hiding loading message: " + e);
        }
    },

    /**
     * Show a loading message in the popup.
     * @param {Array} a_args an arry containing
     *                [0] - the Node at which to show the message
     *                [1] - the message
     */
    showLoadingMessage: function(args)
    {
        if (Alph.$("#alph-secondary-loading",args[0]).length == 0 )
        {
            Alph.$(args[0]).append(
                '<div id="alph-secondary-loading">' + args[1] + '</div>');
        }
    },
    
    
    /**
     * Remove the alph-window element and related css from the
     * browser content document
     * @param a_bro the browser 
     * @param a_lang_tool the LanguageTool which last populated the alpheios
     *                    elements in the browser (optional - if not supplied
     *                    the current tool will be used)
     */
     removePopup: function(a_bro,a_lang_tool)
     {
        var last_doc = this.getLastDoc();
        // remove the main alpheios stylesheet
        Alph.$(".alpheios-css",last_doc).remove();
        
        if (typeof a_lang_tool == "undefined")
        {
            a_lang_tool = Alph.main.getLanguageTool();
        }
        if (a_lang_tool)
        {   
            a_lang_tool.removeStyleSheet(last_doc);
        }
        // remove the alpheios window element
        Alph.$("#alph-window",last_doc).remove();
        
        // also clear the morphology and dictionary panels
        Alph.$(".alph-lexicon-output").each( 
            function() {
                var doc = Alph.$(this).get(0).contentDocument;
                Alph.$("#alph-window",doc).html("");
                if (a_lang_tool)
                {
                    a_lang_tool.removeStyleSheet(doc);
                }
            }
        );
        Alph.main.broadcast_ui_event(Alph.main.events.REMOVE_POPUP);

     },
     
     /**
      * Determines if the popup is currently being displayed, 
      * based upon the lastElem object in the alpheios state variable
      * @return true if it was found and visible, otherwise false
      * @type Boolean
      */
     popupVisible: function()
     {
        var topdoc = this.getLastDoc();
        return Alph.$("#alph-window",topdoc).is(':visible');
     },
     
     /**
      * get the document object for the last shown popup
      * @return the Document object
      * @type Document
      */
     getLastDoc: function()
     {
        var lastdoc;
        var lastElem = Alph.main.get_state_obj().get_var("lastElem");
        if ( lastElem != null )
        {
            lastdoc = lastElem.ownerDocument;
        } 
        if (typeof lastdoc == "undefined" || lastdoc == null)
        {
            // default to the window content document which is the majority case
            lastdoc = Alph.main.getCurrentBrowser().contentDocument;
        }
        return lastdoc;
     },
    
     /**
     * Clears the last selection
     * @param {Document} a_doc the source document 
     */
     clearSelection: function(a_doc)
     {
        if (typeof a_doc == 'undefined')
        {
            a_doc = this.getLastDoc();
        }
    
        try {
            a_doc.defaultView.getSelection().removeAllRanges();
        } 
        catch(a_e)
        {
            //TODO sometimes we get a null defaultView. Need to figure
            // out why and fix, rather than just logging it.
            Alph.util.log("no default view");
        }
     }
     
};
