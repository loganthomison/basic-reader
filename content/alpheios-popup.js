/**
 * @fileoverview This file contains the Alph.xlate class with generic 
 * Mouseover translation functions
 * 
 * @version $Id$
 * 
 * Copyright 2008 Cantus Foundation
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
            /* TODO Revisit this. Probably ought to read directly from the
             * filesystem rather than loading via an ajax request to the chrome
             */
            this.xsltProcessor = new XSLTProcessor();
            var p = new XMLHttpRequest();
            p.open("GET", "chrome://alpheios/skin/alpheios.xsl", false);
            p.send(null);
            var xslRef = p.responseXML;
            this.xsltProcessor.importStylesheet(xslRef)
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

        // if no data, nothing to do
        if (typeof rp == "undefined" || rp == null || ! rp.data)
        {
            return;
        }

        /*
         * This is code from peraperakun. It checks to make sure the target
         * of the event is either a text node (nodeType of 3) or an element in a form.
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
             (a_e.explicitOriginalTarget.nodeType != 3) && !("form" in a_e.target)) {
            return Alph.xlate.hidePopup();
        }

        /* The rangeParent is going to be a #text node.
         * Get the parentNode of the text node for use in traversing
         * for the context if the node contains only a single word.
         */
        var rp_parent = rp.parentNode;

        var range = document.createRange();
        range.selectNode(rp);
        var rngstr = range.toString();
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
        // then it was empty space so just close the popup and return 
        if (ro >= rngstr.length) {
            return Alph.xlate.hidePopup();
        }
        var alphtarget = Alph.main.getLanguageTool().findSelection(ro,rngstr);

        // if we couldn't identify the target word, return without doing anything
        if (! alphtarget.getWord())
        {
            return
        }
                    
        // nothing to do if same word as last AND the popup is shown
        // (hidePopup removes the last word from the state variable),
        var alph_state = Alph.main.get_state_obj();
        var lastSelection = alph_state.get_var("lastSelection");
        if (alphtarget.equals(lastSelection))
        {
            return;
        }

        alph_state.set_var("lastWord",alphtarget.getWord());
        alph_state.set_var("lastSelection", alphtarget);

        // Add the range back to the document highlighted as the selected range
        var doc = rp.ownerDocument;
        var r = doc.createRange();
        r.setStart(rp, alphtarget.getWordStart());
        r.setEnd(rp, alphtarget.getWordEnd());
        var sel = doc.defaultView.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);

        // add the range parent object to the target
        // so that the user's selection can be highlighted
        // again differently after translation, if necessary
        alphtarget.setRangeParent(rp);
        
        // show output
        this.showPopup(a_e.target, a_e.screenX, a_e.screenY, alphtarget);
    },


    /**
     * Displays an error in the popup. Supplied as a callback argument
     * to the {@link Alph.LanguageTool#lexiconLookup} method. 
     * @param {String} a_msg the error message
     * @param a_topdoc The Document or Node which holds the popup
     */
    translationError: function (a_msg,a_topdoc)
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

        Alph.$("#alph-text-loading",a_topdoc).remove();
        
        // replace any earlier error
        Alph.$("#alph-loading-error",a_topdoc).remove();

        Alph.$("#alph-text",a_topdoc).append(
            '<div id="alph-loading-error">' +
            err_msg +
            '</div>'
        );
        Alph.main.broadcast_ui_event();
    },

    /**
     * Shows the results of the lexicon lookup in the popup.
     * Supplied as a callback argument to the 
     * {@link Alph.LanguageTool#lexiconLookup} method.
     * @param {String} a_xml the xml string containing the lexicon response
     * @param {Object} a_alphtarget the details on the target of the event which triggered the popup
     *                 (as returned by {@link Alph.LanguageTool#findSelection})
     * @param a_topdoc the Document or Node which contains the popup  
     */
    showTranslation: function(a_xml,a_alphtarget,a_topdoc) {
        Alph.util.log("Query response:" + a_xml);
        var wordHTML = Alph.xlate.transform(a_xml);
        // don't display an empty popup
        if (   (wordHTML == '')
            || (   (Alph.$(".alph-entry",wordHTML).size() == 0)
                && (Alph.$(".alph-unknown",wordHTML).size() == 0)
                && (Alph.$(".alph-error",wordHTML).size() == 0)))
        {
            Alph.util.log("No valid entries to display.");
            return Alph.xlate.hidePopup(a_topdoc);

        }
        
        // add a class to the first word in the response 
        Alph.$("div.alph-word:first",wordHTML).addClass("alph-word-first");
        
        Alph.$("#alph-text",a_topdoc).remove();
        var alphtext_node = 
            window.content.document.importNode(wordHTML.getElementById("alph-text"),true);
        Alph.main.getLanguageTool().postTransform(alphtext_node);
        Alph.$("#alph-window",a_topdoc).append(alphtext_node);

        // add language-specific click handler, if any
        Alph.main.getLanguageTool().contextHandler(a_topdoc);
        
        // re-highlight the translated range in the source document
        var rp = a_alphtarget.getRangeParent()
        if (rp)
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
        Alph.main.broadcast_ui_event();
        // TODO - we probably should reposition the popup now that we 
        // know it's final size
    },
        
    /**
     * Determines whether or not the popup should be displayed in response
     * to the trigger event. Called by the {@link #doMouseMoveOverText} event handler.
     * @private
     * @param {Element} a_elem the target Element of the event
     * @param {int} a_x the X-coordinate of the trigger event
     * @param {int} a_y the Y-coordinate of the trigger event
     * @param {Object} the details on the target of the event which triggered the popup
     *                 @see Alph.LanguageTool#findSelection
     */
    showPopup: function(a_elem, a_x, a_y, a_alphtarget)
    {
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
            css.setAttribute("id", "alpheios-css");
            Alph.$("head",topdoc).append(css);

            // add any language-specific stylesheet
            Alph.main.getLanguageTool().addStyleSheet(topdoc);
            
            popup = topdoc.createElementNS("http://www.w3.org/1999/xhtml", "div");
            popup.setAttribute("id", "alph-window");

            /* cancel the mousemove and dblclick events over the popup */
            popup.addEventListener("mousemove", this.cancelMouseMove, false);
            popup.addEventListener("dblclick", this.cancelDoubleClick, false);
            
            Alph.$("body",topdoc).append(popup);
        
            // add the element to the alpheios state object in the browser,
            // so that it can be accessed to remove the popup later
            alph_state.set_var("lastElem",a_elem);
            
            // add a close link if the popup is activated by a double-click
            // instead of mouseover
            if (Alph.main.getXlateTrigger() == 'dblclick')
            {
                var close_link =
                   topdoc.createElementNS("http://www.w3.org/1999/xhtml",
                                        "div");
                close_link.setAttribute("id","alph-close");
                close_link.innerHTML = "[x]";
                popup.appendChild(close_link);
                Alph.$("#alph-close",topdoc).bind("click",
                    function()
                    {
                        Alph.xlate.hidePopup()
                    }
                );
            }
            
            var anchor = topdoc.createElementNS("http://www.w3.org/1999/xhtml",
                                                 "a");
            anchor.setAttribute("name","alph-window-anchor");
            anchor.setAttribute("id","alph-window-anchor");
            popup.appendChild(anchor);
        }

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
        // TODO - just add a background loading if the popup has contents?

        var xlate_loading =
            document
                .getElementById("alpheios-strings")
                .getFormattedString("alph-loading-translation",[a_alphtarget.getWord()]);
        Alph.$("#alph-text",popup).remove();
        Alph.$("#alph-window",topdoc).append(
            '<div id="alph-text"><div id="alph-text-loading">' +
            xlate_loading +
            '</div></div>'
        );

        if (a_elem)
        {
            popup.style.top = "-1000px";
            popup.style.left = "0px";
            popup.style.display = "";

            var pW = popup.offsetWidth;
            var pH = popup.offsetHeight;

            // we may need to just guess!
            if (pW <= 0)
                pW = 200;
            if (pH <= 0)
            {
                pH = 0;
                var j = 0;
                // TODO figure out what to do here since we don't have the text yet
                //while ((j = a_text.indexOf("<br/>", j)) != -1)
                while (j < 5)
                {
                    j += 5;
                    pH += 22;
                }
                pH += 25;     
            }

            // these things are always on top, so go sideways
            if (a_elem instanceof Components.interfaces.nsIDOMHTMLOptionElement)
            {
                // find the position relative to top-most window
                a_x = 0;
                a_y = 0;

                var e = a_elem;
                while (e)
                {
                    a_x += e.offsetLeft;
                    a_y += e.offsetTop;
                    if (e.offsetParent)
                    {
                        e = e.offsetParent;
                    }
                    else
                    {
                        e = e.ownerDocument;
                        if ((!e) ||
                            (!e.defaultView) ||
                            (!e.defaultView.frameElement))
                        {
                           break;
                        }
                        e = e.defaultView.frameElement;
                    }
                }

                // need another loop since elements like scrollable DIVs
                // (any others?) are probably not in the path of offsetParent
                const mainBody = window.content.document.body;
                e = a_elem;
                while (e)
                {
                    if (e.scrollTop != null)
                    {
                        a_x -= e.scrollLeft;
                        a_y -= e.scrollTop;
                    }
                    if (e.parentNode)
                    {
                        e = e.parentNode;
                        if (e == mainBody)
                            break;
                    }
                    else
                    {
                        if ((!e.defaultView) || (!e.defaultView.frameElement))
                            break;
                        e = e.defaultView.frameElement;
                    }
                }

                if (a_x > (content.innerWidth - (a_x + a_elem.offsetWidth)))
                {
                    a_x = (a_x - popup.offsetWidth - 5);
                    if (a_x < 0)
                        a_x = 0;
                }
                else
                {
                    a_x += a_elem.offsetWidth + 5;
                }
            }
            // all html elements except option elements?
            else
            {
                const bbo = gBrowser.mCurrentBrowser.boxObject;

                a_x -= bbo.screenX;
                a_y -= bbo.screenY;
                
                if (typeof frame_offset != "undefined")
                {
                    a_x -= frame_offset.left;
                    a_y -= frame_offset.top;
                }
                
                // go left if necessary
                if ((a_x + pW) > (content.innerWidth - 15))
                {
                    a_x = (content.innerWidth - pW) - 15;
                    if (a_x < 0)
                        a_x = 0;
                }

                // below the mouse
                var v = 20;

                // under the popup title
                if ((a_elem.title) && (a_elem.title != ""))
                    v += 20;

                // go up if necessary
                if ((a_y + v + pH) > content.innerHeight)
                {
                    var t = a_y - pH - 20;
                    if (t >= 0)
                        a_y = t;
                }
                else
                    a_y += v;

                a_x += content.scrollX;
                a_y += content.scrollY;
                
                if (typeof frame_scroll != "undefined")
                {
                    a_x += frame_scroll.left;
                    a_y += frame_scroll.top;
                }
            }
        }
        else
        {
            a_x += content.scrollX;
            a_y += content.scrollY;
        }

        popup.style.left = a_x + "px";
        popup.style.top = a_y + "px";
        popup.style.display = "";

        // add the original word to the browser's alpheios object so that the
        // other functions can access it
        alph_state.set_var("word",a_alphtarget.getWord());

        // lookup the selection in the lexicon
        // pass a callback to showTranslation to populate
        // the popup and any other lexicon 
        // output browsers (i.e. in the morph panel)
        // with the results on success,
        // and a call back to translationError to populate
        // the popup with an error message on failure
        Alph.main.getLanguageTool().lexiconLookup(
            a_alphtarget,
            function(data)
            {
                Alph.xlate.showTranslation(data,a_alphtarget,topdoc);
                Alph.$(".alph-lexicon-output").each(
                    function() 
                    {
                        var doc = Alph.$(this).get(0).contentDocument
                        Alph.$("#alph-window",doc).css("display","block");
                        Alph.main.getLanguageTool().addStyleSheet(doc);
                        Alph.xlate.showTranslation(data,a_alphtarget,doc);
                    }
                );

            },
            function(a_msg)
            {   
                Alph.xlate.translationError(a_msg,topdoc);
                Alph.$(".alph-lexicon-output").each(
                    function() 
                    {
                        var doc = Alph.$(this).get(0).contentDocument
                        Alph.$("#alph-window",doc).css("display","block");
                        Alph.xlate.translationError(a_msg,doc);
                    }
                );
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
        topdoc.defaultView.getSelection().removeAllRanges();
        
        // remove the last word from the state
        var alph_state = Alph.main.get_state_obj();
        if (alph_state.get_var("enabled"))
        { 
            alph_state.set_var("lastWord", null);
            alph_state.set_var("lastSelection",null);
        
        }
        Alph.main.broadcast_ui_event();
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

        var a_window =
            Alph.main.getCurrentBrowser().
                alpheios.windows[a_name];
                
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
        Alph.main.getCurrentBrowser().
            alpheios.windows[a_name] = a_window;
    },

    /**
     * Callback to hide the loading message in the popup.
     * @param {Event} a_event the event which initiated the callback 
     */
    hideLoadingMessage: function(a_event)
    {
        
        try {
            // we can't use the event target, because the event is 
            // in the 2ndary window not the one showing the message
            var topdoc = Alph.xlate.getLastDoc();
            Alph.$("#alph-secondary-loading",topdoc).remove();
            
            // also check the morphology and dictionary windows
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
     */
     removePopup: function(a_bro)
     {
        var last_doc = this.getLastDoc();
        // remove the main alpheios stylesheet
        Alph.$("#alpheios-css",last_doc).remove();
        // remove the language specific stylesheet
        var lang_tool = Alph.main.getLanguageTool();
        if (lang_tool)
        {   
            lang_tool.removeStyleSheet(last_doc);
        }
        // remove the alpheios window element
        Alph.$("#alph-window",last_doc).remove();
        
        // also clear the morphology and dictionary panels
        Alph.$(".alph-lexicon-output").each( 
            function() {
                var doc = Alph.$(this).get(0).contentDocument;
                Alph.$("#alph-window",doc).html("");
                if (lang_tool)
                {
                    lang_tool.removeStyleSheet(doc);
                }
            }
        );
        Alph.main.broadcast_ui_event();

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
     }
};
