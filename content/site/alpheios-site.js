/**
 * @fileoverview This file defines the Alph.Site class, which 
 * contains the functionality injected by the Alpheios
 * extension into sites which support Alpheios pedagogical functionality.
 *  
 * @version $Id: alpheios-site.js 1464 2009-02-17 20:54:28Z BridgetAlmas $
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
 * @class functionality injected into sites which are tagged as supporting Alpheios  
 */
Alph.Site = {
    
    /**
     * logger for the object
     * @type Log4Moz.Logger
     * @private
     */
    s_logger: Alph.BrowserUtils.getLogger('Alpheios.Site'),
    
    /**
     * Check to see if this site supports the pedagogical functionality
     * @param {Array} a_docs the array of content documents loaded on the site
     * @returns the Array of languages identified in the html elements of any documents
     *          flagged as Alpheios pedagogical texts, if any 
     * @type Array{String}
     */
    isPedSite: function(a_docs)
    {       
        var page_langs = [];
        // TODO for now only one language per page is supported but so take the first one found
        // but in the future it would be good to support multiple frames with different languages
        Alph.$("meta[name=alpheios-pedagogical-text]",a_docs).each(
            function()
            {
                var lang = this.ownerDocument.documentElement.getAttribute("xml:lang") ||
                           this.ownerDocument.documentElement.getAttribute("lang");
                if (lang)
                {
                    page_langs.push(lang);
                }
            }
        );
        return page_langs;
    },
    
    /**
     * Check to see if the site is one we have registered automatic
     * support for
     * @param nsIURI a_url the url object
     * @returns the language we have registered for this site, or null if it
     *         is not registered
     * @type String
     */
    isBasicSite: function(a_url)
    {
        var lang_list = Alph.Languages.getLangList();
        var allowed_lang = null;
        for (var i=0; i<lang_list.length; i++)
        {
            var lang = lang_list[i];
            if (Alph.PermissionMgr.testPermission(a_url,'alpheios-auto-enable-'+lang)
                == Alph.PermissionMgr.ALLOW_ACTION)
            {
                // just return the first language registered for this iste for now
                // eventually need to support multiple languages per site?
                allowed_lang = lang;
                break;
            }
        }
        return allowed_lang;
    },
    
    /**
     * Check to see if the site is one we which has declared some text to be
     * activated for alpheios
     * @param {Array} a_docs the array of content documents loaded on the site
     * @returns the Array of languages identified in the alpheios-enabled-text elements 
     *          in those documents, if any
     * @type Array{String}
     */
    isMixedSite: function(a_docs)
    {
        var enabled_langs = [];
        Alph.$('.alpheios-enabled-text',a_docs).each(
            function()
            {
                var lang = this.getAttribute("xml:lang") || this.getAttribute("lang");
                if (lang)
                {
                    enabled_langs.push(lang);
                }
            }
        );
        return enabled_langs;
    },

    /**
     * register sites for automatic support
     */
    registerSites: function()
    {
        var lang_list = Alph.Languages.getLangList();
        var allowed_lang = null;
        // iterate through the supported languages, registering any sites
        // which haven't yet been registered for this language
        for (var i=0; i<lang_list.length; i++)
        {
            var lang = lang_list[i];
            try 
            {
                var key = 'alpheios-auto-enable-'+lang;
                var sites = Alph.BrowserUtils.getPref('sites.autoenable',lang).split(',');
                this.s_logger.info("Registering sites for " + lang + ":" + sites);
                sites.forEach(
                    function(a_url)
                    {
                        var uri = 
                            Alph.BrowserUtils.getSvc('IO').newURI(a_url,"UTF-8",null);
                        if (Alph.PermissionMgr.testPermission(uri,key)
                            == Alph.PermissionMgr.UNKNOWN_ACTION)
                        {
                            Alph.Site.s_logger.info("Registering " + a_url);
                            Alph.PermissionMgr.add(uri,key,Alph.PermissionMgr.ALLOW_ACTION)
                        }
                    }
                );
            }
            catch(a_e)
            {
                this.s_logger.warn("Not registering sites for " + lang + ":"+ a_e);
                // quiety ignore missing preference
            }
        }
        
    },
    
    /**
     * injects the browser content document with Alpheios pedagogical
     * functionality
     * @param {Array} a_docs array of documents loaded in the browser window
     * @param {String} a_type the browser type (one of Alph.Translation.INTERLINEAR_TARGET_SRC
     *                        or Alph.Translation.INTERLINEAR_TARGET_TRANS)  
     */
    setupPage: function(a_docs,a_type)
    {
        
        // unless interactivity is enabled,
        // add the mouseover handlers for the parallel alignment
        // and the interlinear alignment toggle
        Alph.$(".alpheios-aligned-word",a_docs).mouseover(  
            function(e) { Alph.Site.toggleAlignment(e,this,a_type,true)}
        );
            
        Alph.$(".alpheios-aligned-word",a_docs).mouseout( 
            function(e) { Alph.Site.toggleAlignment(e,this,a_type,false)}
        );
            
        // wrap a div around each target word so that the aligned text can
        // be floated under it
        if (Alph.$(".alpheios-word-wrap",a_docs).length == 0)
        {
            Alph.$(".alpheios-aligned-word",a_docs)
                .wrap("<div class='alpheios-word-wrap'></div>");
        }
                

        if (a_type == Alph.Translation.INTERLINEAR_TARGET_SRC)
        {
            this.addInterlinearToggle(a_docs);
        }
        
        this.enableToolbar(a_docs);
        var bro = Alph.Main.getCurrentBrowser();
        var trigger = Alph.Main.getXlateTrigger(bro);
        var lang_tool = Alph.Main.getLanguageTool(bro);
        // run site-defined alpheios enabled event handler
        a_docs.forEach(
            function(a_doc)
            {
                Alph.Site.addTriggerHint(bro,a_doc,trigger,lang_tool);
                var callback_elem = Alph.$("#alpheios-enabled-callback",a_doc).get(0);
                if (callback_elem)
                {
                    var evt = a_doc.createEvent("Events");
                    evt.initEvent("AlpheiosEnabled", true, false);
                    callback_elem.dispatchEvent(evt);
                }
            }
            
        );

    },
    
    /**
     * If the site contains an element with the class 'alpheios-toolbar',
     * adds the toolbar handlers to the child elements
     * @param {Array} a_docs array of documents loaded in the browser window
     */
    enableToolbar: function(a_docs)
    {
        
        for (var i=0; i<a_docs.length; i++)
        {
            var a_doc = a_docs[i];
            
            if (this.getTranslationUrl(a_doc))
            {
                Alph.$(".alpheios-toolbar-translation",a_doc).bind(
                    'click',
                    {alpheios_panel_id: 'alph-trans-panel'},
                    this.togglePanelHandler
         
                );
            }
            else
            {
                Alph.$(".alpheios-toolbar-translation",a_doc).css("display","none");
            }            
            
            Alph.$(".alpheios-toolbar-options",a_doc).bind(
                'click',
                {alpheios_cmd_id: 'alpheios-options-cmd'},
                this.doCommandHandler
            );
            Alph.$(".alpheios-toolbar-about",a_doc).bind(
                'click',
                { alpheios_cmd_id: 'alpheios-about-cmd'},
                this.doCommandHandler
            );
            Alph.$(".alpheios-toolbar-feedback",a_doc).bind(
                'click',
                { alpheios_cmd_id: 'alpheios-feedback-cmd'},
                this.doCommandHandler
            );
    
            Alph.$(".alpheios-toolbar-level",a_doc).bind(
                'click',
                function()
                {
                    var mode = this.getAttribute('alpheios-value');
                    if (mode)
                    {
                        Alph.Main.setMode(null,mode);
                    }
                }
            );
            
            Alph.$(".alpheios-toolbar-inflect",a_doc).bind(
                'click',
                { alpheios_cmd_id: 'alpheios-inflect-cmd' },
                this.doCommandHandler
            );
            Alph.$(".alpheios-toolbar-grammar",a_doc).bind(
                'click',
                { alpheios_cmd_id: 'alpheios-grammar-cmd' },
                this.doCommandHandler
            );
            Alph.$(".alpheios-toolbar-wordlist",a_doc).bind(
                'click',
                { alpheios_cmd_id: 'alpheios-wordlist-cmd' },
                this.doCommandHandler
            );
            Alph.$(".alpheios-toolbar-help",a_doc).bind(
                'click',
                {alpheios_cmd_id: 'alpheios-help-cmd'},
                this.doCommandHandler
            );
            var lang_tool = Alph.Main.getLanguageTool();
            var wordlist;
            if (lang_tool)
            {
                wordlist = lang_tool.getWordList();
            }
            if (wordlist && 
                     (Alph.$(".alpheios-word",a_doc).length > 0 || 
                      Alph.$(".alpheios-aligned-word",a_doc).length >0)
                    )
            {
                Alph.$(".alpheios-toolbar-scanwords",a_doc).bind(
                    'click',
                    function()
                    {
                        var loading_msg = Alph.Main.getString("alph-loading-wordlist");
                        Alph.$(this)
                            .after('<div id="alpheios-loading-wordlist" class="alpheios-loading">' 
                                + loading_msg + '</div>');
            
                        Alph.Site.scanWords(
                            lang_tool,
                            a_doc,
                            function() {Alph.$("#alpheios-loading-wordlist",a_doc).remove() }
                        )
                    }
                );
            }
            else
            {
                Alph.$(".alpheios-toolbar-scanwords",a_doc).css("display","none");
            }
        }
        this.updateUserToolbar(a_docs);
               
    },
    
    /**
     * Update user-variable items on the toolbar
     * @param {Array} a_docs array of documents loaded in the browser window
     */
    updateUserToolbar: function(a_docs)
    {
        for (var i=0; i<a_docs.length; i++)
        {
            var a_doc = a_docs[i];

            var diagram = Alph.$(".alpheios-toolbar-user-diagram",a_doc);
            if (document.getElementById('alpheios-user-diagram-cmd').getAttribute('disabled') == 'false')
            {                
                diagram.unbind(
                    'click',this.doCommandHandler);
        
                diagram.bind(
                        'click',
                        {alpheios_cmd_id: 'alpheios-user-diagram-cmd'},
                        this.doCommandHandler
                );    
                diagram.removeClass("disabled");
            }
            else
            {
                diagram.addClass("disabled");
            }
            var vocab = Alph.$(".alpheios-toolbar-vocab",a_doc);
            if (document.getElementById('alpheios-vocab-toggle-cmd').getAttribute('disabled') == 'false')
            {
                vocab.unbind(
                    'click',this.doCommandHandler);       
                vocab.bind(
                        'click',
                        {alpheios_cmd_id: 'alpheios-vocab-toggle-cmd'},
                        this.doCommandHandler
                );    
                vocab.removeClass("disabled");
            }
            else
            {
                vocab.addClass("disabled");
            }
                         
            var user_cmds = Alph.$(".alpheios-toolbar-usertools li",a_doc).length;
            var disabled_user_cmds = Alph.$(".alpheios-toolbar-usertools li.disabled",a_doc).length;
            if (disabled_user_cmds == user_cmds)
            {
                Alph.$(".alpheios-toolbar-usertools",a_doc).addClass("disabled");
            }
            else
            {
                Alph.$(".alpheios-toolbar-usertools",a_doc).removeClass("disabled");
            }
        }
    },
    

    /**
     * set current mode
     * @param {Array} a_docs the array of Documents loaded in the current browser window
     * @param {String} a_mode the new Alpheios mode
     */
    setCurrentMode: function(a_docs,a_mode)
    {
        try
        {
            Alph.$(".alpheios-toolbar-level[alpheios-value=" + a_mode + "]",a_docs).each
            (
                function()
                {
                    Alph.$(this).addClass("alpheios-current");
                    Alph.$(this)
                        .siblings(".alpheios-toolbar-level")
                        .removeClass("alpheios-current");
                    Alph.$("#alpheios-current-level",a_docs).attr("alpheios-value",a_mode);
                    Alph.$("#alpheios-current-level *:not([alpheios-value="+a_mode+"])",a_docs)
                        .removeClass("alpheios-current");
                    Alph.$("#alpheios-current-level *[alpheios-value="+a_mode+"]",a_docs)
                        .addClass("alpheios-current");
                    Alph.$("body",a_docs).attr("alpheios-level",a_mode);
                    ;
                    Alph.$("body",(Alph.Main.d_panels['alph-trans-panel'].getCurrentDoc())[0])
                        .attr("alpheios-level",a_mode);
                }
            );
        }
        catch(a_e)
        {
            this.s_logger.error("Unable to update menu with new mode " + a_e);
        }
    },
    
    /**
     * update panel status
     * @param {Array} a_docs the array of Documents loaded in the browser window
     * @param {String} a_id the id of the toolbar panel
     * @param {String} a_status the new panel status
     */
    setToolbarPanelStatus: function(a_docs,a_panel_id,a_status)
    {
        // for now, only update the toolbar buttons for the translation panel 
        var toolbar_class = 
                a_panel_id == 'alph-trans-panel' ? 'alpheios-toolbar-translation'
                : null;

        if (!toolbar_class)
        {
            return;
        }
        
        if (a_status == Alph.Panel.STATUS_SHOW)
        {
            Alph.$("."+toolbar_class,a_docs).addClass("alpheios-current");
        }
        else
        {
            Alph.$("."+toolbar_class,a_docs).removeClass("alpheios-current");
        }
    },
    
    /**
     * handler method for click on a toolbar item which 
     * controls an Alpheios panel
     * @param {Event} a_event the click event - the panel id should
     *                        be defined in a custom event property named alpheios_panel_id
     */
    togglePanelHandler: function(a_event)
    {
        // 'this' is the toolbar element
        var panel_status = 
            Alph.Main.togglePanel(a_event,a_event.data.alpheios_panel_id);
    },
    
    /**
     * handler method for click on a toolbar item which
     * executes an Alpheios command
     * @param {Event} a_event the click event - the id of the command to be executed should
     *                        be defined in a custom event property named alpheios_cmd_id
     */
    doCommandHandler: function(a_event)
    {
        // 'this' is the toolbar element
        var command = document.getElementById(a_event.data.alpheios_cmd_id);
        if (command != null)
        {
            command.doCommand(a_event);
        }
        else
        {
            alert("Command " + a_event.data.alpheios_cmd_id + " not implemented.");
        }
    },
    

    /**
     * adds the interlinear toggle element to the page
     * @param {Array} a_doc the array of documents loaded in the browser window
     */
    addInterlinearToggle: function(a_docs)
    {        
        for (var i=0; i<a_docs.length; i++)
        {
            var a_doc = a_docs[i];
            
            // don't add the toggle if we don't have an aligned translation to use
            if ( ! Alph.Site.getTranslationUrl(a_doc) ||  
                   Alph.$(".alpheios-aligned-word",a_doc).length == 0)
            {
                continue;
            }
            
            // add handlers to interlinear translation controls 
            // in the source text display, but only do it if this feature
            // is turned on
            if ( Alph.BrowserUtils.getPref("features.alpheios-interlinear") )
            {
                
                var my_obj = this;
    
                Alph.$(".alpheios-interlinear-toggle",a_doc)
                    .bind('click', Alph.Site.handleInterlinearToggle);        
    
                // update the checked state of the interlinear toggle in the source text
                // document with the state of the XUL control
                if (Alph.$("#alpheios-trans-opt-inter-src").attr('checked') == 'true')
                {
                    Alph.$(".alpheios-interlinear-toggle",a_doc).attr("checked",true);
                    if (! Alph.Interactive.enabled())
                    {
                        Alph.Site.handleInterlinearToggle(null,
                            Alph.$(".alpheios-interlinear-toggle",a_doc).get(0));
                    }
                }   
                Alph.$("#alpheios-interlinear-parent",a_doc).css("display","block");
                
            }
            else
            {
                Alph.$("#alpheios-interlinear-parent",a_doc).css("display","none");
            }

        }
    },

    /**
     * Toggle the interlinear display
     * @param {Event} a_event the triggering event
     * @param {Object} a_toggle (Optional)
     */
    handleInterlinearToggle: function(a_event,a_toggle)
    {                      
        var toggle_elem;
        var checked;
        
        // if called directly, assume we want to show the interlinear text
        if (a_event == null)
        {
            toggle_elem = a_toggle;
            checked = true;
        }
        else
        {
            toggle_elem = this;
            checked = Alph.$(this).attr('checked');
        }
        
        
        // keep the state of the XUL control and the document
        // control in sync
        Alph.$("#alpheios-trans-opt-inter-src").attr('checked',
            checked ? 'true' : 'false');
               
        var trans_url = Alph.Site.getTranslationUrl(toggle_elem.ownerDocument);
        var words = Alph.$(".alpheios-word-wrap",toggle_elem.ownerDocument).get();
        if (checked)
        {
            var loading_msg = Alph.Main.getString("alph-loading-interlinear");
            Alph.$(toggle_elem)
                .after('<div id="alpheios-loading-interlinear">' + loading_msg + '</div>');
                
            // Reload the interlinear translation document rather than just retrieving
            // it from the translation panel, because the translation panel may
            // not be open. We may also eventually want to be able to use a different document 
            // for the interlinear than the side by side alignment.
            Alph.Site.loadAlignment(toggle_elem.ownerDocument,
                function(a_align_doc)
                {
                    Alph.Site.populateInterlinear(
                        words,
                        a_align_doc,
                        function() {
                            Alph.$("#alpheios-loading-interlinear",
                            toggle_elem.ownerDocument).remove();
                        });
                },
                function(a_e)
                {
                    Alph.$("#alpheios-loading-interlinear",
                        toggle_elem.ownerDocument).remove();
                    Alph.Site.s_logger.error("Unable to parse translation: " + a_e);
                }
            );                  
        } else {
            Alph.Site.hideInterlinear(words);

        }
    },

    /**
     * Resize the source text display, adding line breaks where needed
     * @param {Document} a_doc the contentDocument for the source text
     */
    resizeInterlinear: function(a_doc)
    {
    },
    
    /**
     * toggle the state of the target and parallel aligned text
     * @param {Event} a_event the event which triggered the action
     * @param {Element} a_elem the target element
     * @param {String} a_type type of target text 
     *                (one of @link Alph.Translation.INTERLINEAR_TARGET_SRC or
     *                 @link Alph.Translation.INTERLINEAR_TARGET_TRANS)
     * @param {Boolean} a_on is the element toggling on (true) or off (false)
     */
    toggleAlignment: function(a_event,a_elem,a_type,a_on)
    {
        // don't do alignment highlighting for quiz mode,
        // or if the translation panel is not open
        if (Alph.Interactive.enabled() || 
            ! Alph.Main.d_panels['alph-trans-panel'].isVisibleInline())
        {
            return;
        }
        // toggle the selector class for the source text
        if (a_on)
        {
            Alph.$(a_elem).addClass('alpheios-highlight-source');
            var nrefs = Alph.$(a_elem).attr("nrefs");
            if (nrefs == null || nrefs == '')
            {
                Alph.$(a_elem).after(
                    '<span class="alpheios-aligned-nomatch alpheios-tooltip">' + 
                    Alph.Main.getString("alph-align-nomatch") +
                    '</span>');
            }
        }
        else
        {
            Alph.$(a_elem).removeClass('alpheios-highlight-source');
            Alph.$(a_elem).next(".alpheios-aligned-nomatch").remove();
        }
        
        
        // toggle the selection of the parallel aligned text
        try {
            var panel_obj = Alph.Main.d_panels['alph-trans-panel'];
            panel_obj.toggleParallelAlignment(a_elem,a_type,a_on);
        }
        catch(a_e)
        {
            Alph.Site.s_logger.error("Error toggling alignment: " + a_e);
        }
    },
    
    /**
     * Retrieve the interlinear aligned translation and add it to the display
     * @param {Array} a_words array of words within the document for which to 
     *                        retrieve the interlinear display
     * @param {Document} a_source the document containing the aligned translation
     * @param {Function} a_end_callback Callback function to execute once request
     *                                  is finished. 
     */
    populateInterlinear: function(a_words,a_source,a_end_callback)
    {    
        /*
         * This code is a little convoluted.  We want to issue
         * the request to retrieve and insert the interlinear translation
         * in a background thread (launched by setTimeout()) so that the remainder
         * of the javascript processing for the page can finish without waiting
         * for this to complete.  Because the function called by setTimeout operates
         * in a separate thread, it needs to be called from with a closure
         * so that it still has access to the underlying objects.
         */
        var populate_thread = function()
        {
            this.run = function(a_ms)
            {
                var _self = this;
                setTimeout(_self.execute,a_ms);
            };
            
            this.execute = function()
            {
                var next_offset = 0;
                var wordlist = Alph.Main.getLanguageTool().getWordList();
                Alph.Site.s_logger.debug("Start inserting interlinear.");
                // add the aligned text to each source word
                a_words.forEach(
                    function(parent)
                    {
                   
                        var word_text = Alph.$(parent).text();
                        if (Alph.$(parent).attr("aligned-offset"))
                        {
                            Alph.$(parent).css("padding-left",Alph.$(parent).attr("aligned-offset"));     
                            Alph.$(".alpheios-aligned-trans",parent).css("display","block");
                        }
                        else
                        {
                            var a_elem = Alph.$(".alpheios-aligned-word",parent); 
                            if (Alph.$(parent).prev().length == 0)
                            {
                                next_offset = 0;                    
                            }
                            
                            // reset the offset if this is the first word in a block
                            if (next_offset > 0)
                            {
                                Alph.$(parent).css("padding-left",next_offset+"px");                    
                            }
                            var offset_left = 0;
                            var offset_top = Alph.$(a_elem).height()/2;
                            var target_width = Alph.$(a_elem).width();
                                
                            if (Alph.$(a_elem).attr("nrefs"))
                            {
                                
                                var my_ids = Alph.$(a_elem).attr("nrefs").split(/\s|,/);
                                for (var i=0; i<my_ids.length; i++) {
                                   if (my_ids[i]) { 
                                       var elem = Alph.$(".alpheios-aligned-word[id='" 
                                        + my_ids[i] + "']",a_source);
                                       if (elem.length == 0) {
                                            continue;
                                       }
                                       var id_copy = Alph.$(Alph.$(elem)[0]).clone().appendTo(parent);
                                       Alph.$(id_copy).attr("id", "il-" + my_ids[i]);
                                       Alph.$(id_copy).addClass("alpheios-aligned-trans").css("display","inline");
                                       Alph.$(id_copy).removeClass("alpheios-aligned-word");
                                       Alph.$(id_copy).css("top",offset_top); 
                                       Alph.$(id_copy).css("left",offset_left + next_offset);
                                       offset_left = offset_left + Alph.$(id_copy).width();
                                       if (wordlist && wordlist.checkForm(word_text))
                                       {
                                            Alph.$(id_copy).addClass("alpheios-known-word");
                                       }
                                   }
                                }
                                // adjust the offset of the next element
                                // by the amount the additional words exceeds the original width;
                                var overage = offset_left - target_width;
                                if (overage > 0)
                                {
                                    next_offset = overage;
                                }
                                else
                                {
                                    next_offset = 0;
                                }
                            }
                            else
                            {
                                next_offset = 0;
                            }
            
                        }
                    }
                );
                a_end_callback();
                var end = (new Date()).getTime();
                Alph.Site.s_logger.debug("Done inserting interlinear.");
            };
        };
        var thread = new populate_thread();
        thread.run(500);
    },
    
    /**
     * Toggle the display of the interlinear aligned translation.  
     * @param {Array} a_words array of words within the document for which to 
     *                        toggle interlinear display 
     * @parma {Document} a_src_doc the source document containing the aligned translation
     * @param {Boolen} a_on flag to indicate whether the translation is being toggled
     *                      on (true) or off (false)                   
     */
    toggleInterlinear: function(a_words,a_src_doc,a_on)
    {
        if (a_checked)
        {
        }
    },
    
    /**
     * Remove the interlinear translation from teh display
     * @param {Array} a_words array of words within the document for which to 
     *                        remove the interlinear display 
     */
    hideInterlinear: function(a_words)
    {
        a_words.forEach(
            function(parent)
            {
                // capture the offset for the parent word-wrap elements so we don't
                // have to calculate it again
                Alph.$(parent).attr("aligned-offset",Alph.$(parent).css("padding-left"));     
                Alph.$(".alpheios-aligned-trans",parent).css("display","none");
                // reset the padding offset to zero so that the display looks normal
                // without the interlinear text
                Alph.$(parent).css("padding-left",0);
            }
        );
    },
    
    /**
     * Load the document contained the aligned text for the supplied source document
     * @param Document a_src_doc the source document
     * @param Function a_success success callback (gets the parsed alignment document
     *                           as the first parameter)
     * @param Function a_error error callback (gets the error message as the
     *                         first parameter
     * @returns the alignment document, parsed as xhtml+xml
     * @type Document
     */
    loadAlignment: function(a_src_doc,a_success,a_error)
    {
        var align_url = this.getTranslationUrl(a_src_doc);
        var align_doc = null;
        
        // using XMLHttpRequest directly here because the alignment document
        // may be in the chrome, which jQuery doesn't support
        var r = new XMLHttpRequest();
        r.onreadystatechange = function()
        {
            if (r.readyState == 4 && r.responseText) 
            {
                // TODO - should really handle 301 and 302 too?
                if (r.status == 200)
                { 
                    try {
                        align_doc = (new DOMParser()).parseFromString(
                        r.responseText,
                        "application/xhtml+xml");
                        a_success(align_doc);
                    }
                    catch(a_e)
                    {
                        a_error("Unable to parse translation: " + a_e);
                    }
                }
                else
                {
                     a_error("Unable to retrieve translation. Response: " +
                        r.status + ':' + r.responseText); 
                }
            }
            else 
            {
                Alph.Site.s_logger.info("Loading alignment from " + align_url + "...");
            }
        }
        r.open("GET", align_url);
        r.send(null);                                   
    },
    
    /**
     * Observe a ui event
     * @param {Browser} a_bro the current browser
     * @param {int} a_event_type the event type (one of @link Alph.Constants.events)
     * @param {Object} a_event_data optional event data object
     */
    observeUIEvent: function(a_bro,a_event_type,a_event_data)
    {
        var docs = Alph.Main.getBrowserDocs(a_bro);
        
        if (a_event_type == Alph.Constants.EVENTS.UPDATE_XLATE_TRIGGER)
        {
            for (var i=0; i<docs.length; i++)
            {
                this.addTriggerHint(
                        a_bro,docs[i],a_event_data.new_trigger,Alph.Main.getLanguageTool(a_bro));
            }
        }
        // observe change to config setting which enables interlinear
        else if (a_event_type == Alph.Constants.EVENTS.UPDATE_PREF 
                 && a_event_data.name.indexOf('features.alpheios-interlinear') >= 0)
        {
            this.addInterlinearToggle(docs);             
        }
        
    },
    
    /**
     * Add trigger hint
     * @param {Browser} a_bro the browser
     * @param {Document} a_doc the document
     * @param {String} a_trigger the current trigger
     * @pram {Alp.LanguageTool} a_lang_tool the current language tool 
     * 
     */
    addTriggerHint: function(a_bro,a_doc,a_trigger,a_lang_tool)
    {
        var mode = Alph.Main.getStateObj(a_bro).getVar("level");
        var hint_prop = 'alph-trigger-hint-'+a_trigger+'-'+mode;
        var lang = a_lang_tool.getLanguageString();
        var hint = a_lang_tool.getStringOrDefault(hint_prop,[lang]);
        Alph.$(".alpheios-trigger-hint",a_doc).html(hint);
    },
    
    /**
     * Get the title of the document
     * @param {Document} a_doc the document
     * @returns the title
     * @type String
     */
    getDocumentTitle: function(a_doc)
    {
      // return the value of the Dublin Core title metadatum if it exists, otherwise
      // the contents of the title element in the document head
 
      var title = Alph.$("meta[name=DC.Title]",a_doc).attr("content") ||
                  Alph.$("head title",a_doc).text();
      // if it's an alpheios document, string the "Alpheios:" prefix
      if (title)
      {
        title = title.replace(/^Alpheios:\s*/,'');
      }
      return title;
    },
    
    /**
     * Get the value of the content attribute of the specified metadata element,
     * excluding the version prefix, if any
     * @param {String} a_name metadata name
     * @param {Document} a_doc the document
     * @return the value of the content attribute, excluding the version prefix, or null if not defined
     * @type String
     */
    getMetadataContent: function(a_name,a_doc)
    {
        var content = Alph.$("meta[name=" + a_name + "]",a_doc).attr("content");
        if (content && content.match(/^version=([\d\.]+);/))
        {
            content=content.replace(/^version=([\d\.]+);/,'');
        }
        return content;
    },
    
    /** 
     * Get the version of a particular document metadata
     * @param {String} metadata name
     * @return version # if present, otherwise 0
     * @type int    
     */
    getMetadataVersion: function(a_name,a_doc)
    {
        var version = 0;
        try
        {
            var has_version = 
                Alph.$("meta[name=" + a_name + "]",a_doc).attr("content").match(/^version=([\d\.]+);/);         
            if (has_version)
            {        
                version = parseFloat(has_version[1]);                
            }        
        }
        catch (a_e)
        {
            this.s_logger.debug("Unable to retrieve version for " + a_name + " in " + a_doc.title + ":" + a_e);
        }
        return version;
    },


    /**
     * Get the vocabulary url for the document, if any
     * @param {Document} a_doc the document
     * @returns the url or null if not defined
     * @type {String}
     */
    getVocabularyUrl: function(a_doc)
    { 
        var url = this.getMetadataContent('alpheios-vocabulary-url',a_doc);        
        // if the vocabulary url is defined, but remote features are disabled and
        // the vocabulary url is remote, then act as if it's not defined
        if (url && Alph.BrowserUtils.getPref("disable.remote") && 
            ! Alph.Util.isLocalUrl(url)
           )
        {
           url = null; 
        }
        return (typeof url == "undefined" ? null : url);
    },

    
    /**
     * Get the treebank url for the document, if any
     * @param {Document} a_doc the document
     * @returns the url or null if not defined
     * @type {String}
     */
    getTreebankUrl: function(a_doc)
    { 
        var treebank_url = this.getMetadataContent('alpheios-treebank-url',a_doc);
        // if the treebank url is defined, but remote features are disabled and
        // the treebank url is remote, then act as if it's not defined
        if (treebank_url && Alph.BrowserUtils.getPref("disable.remote") && 
            ! Alph.Util.isLocalUrl(treebank_url)
           )
        {
           treebank_url = null; 
        }
        return (typeof treebank_url == "undefined" ? null : treebank_url);
    },
    
    /**
     * Get the treebank diagram url for the document, if any
     * @param {Document} a_doc the document
     * @returns the url or null if not defined
     * @type {String}
     */
    getTreebankDiagramUrl: function(a_doc)
    { 
        var url = this.getMetadataContent('alpheios-treebank-diagram-url',a_doc);
        // if the url is defined, but remote features are disabled and
        // the url is remote, then act as if it's not defined
        if (url && Alph.BrowserUtils.getPref("disable.remote") && 
            ! Alph.Util.isLocalUrl(url)
           )
        {
           url = null; 
        }
        return (typeof url == "undefined" ? null : url);
    },
    
    /**
     * Get the aligned translation url for the document, if any
     * @param {Document} a_doc the document
     * @returns the url or null if not defined
     * @type {String}
     */
    getTranslationUrl: function(a_doc)
    {
        var trans_url = Alph.$("#alph-trans-url",a_doc).attr("url");
        // if the translation url is defined, but remote features are disabled and
        // the translation url is remote, then act as if it's not defined
        if (trans_url && Alph.BrowserUtils.getPref("disable.remote") && 
            ! Alph.Util.isLocalUrl(trans_url))
        {
            trans_url = null;
        }
        return (typeof trans_url == "undefined" ? null : trans_url);
    },
    
    /**
     * Update the browser elements which correspond to the site tools
     * @param {Array} a_docs the array of Documents loaded in the browser window
     */
    updateSiteToolStatus: function(a_docs)
    {
        var has_translation = false;
        var has_treebank = false;;
        for (var i=0; i<a_docs.length; i++)
        {
            if (this.getTranslationUrl(a_docs[i]))
            {
                has_translation = true;        
            }
            if (this.getTreebankDiagramUrl(a_docs[i]))
            {
                has_treebank = true;
            }
        }
        // TODO for now the firefox toolbar status assumes that all documents
        // in the browser window should reflect the same status, but might
        // not always be the case.
        Alph.$("#alph-trans-status").attr("disabled",! has_translation);
        Alph.$("#alph-trans-status").attr("hidden", ! has_translation);
        Alph.$("#alph-tree-status").attr("disabled",! has_treebank);
        Alph.$("#alph-tree-status").attr("hidden",! has_treebank);               
    },
    
    /**
     * Toggle the alpheios-known-word class on any elements matching the supplied word
     * which are identified by the alpheios-aligned-word or alpheios-word class
     * @param {Alph.LanguageTool} a_lang_tool, the appropriate Alpheios language tool 
     * @param {Document} a_doc the document to check
     * @param {String} a_word the word to look for in the document
     */
    toggleWordStatus: function(a_langTool,a_doc,a_word)
    {
        
        Alph.$(".alpheios-aligned-word,.alpheios-word",a_doc).each(
            function()
            {
                if (a_langTool.normalizeWord(Alph.$(this).text()) == a_word)
                {
                    Alph.$(this).toggleClass("alpheios-known-word");
                    Alph.$(this).nextAll(".alpheios-aligned-trans").toggleClass("alpheios-known-word");
                }
            }
        );
    },
    
    /**
     * Iterate through elements identified with the alpheios-aligned-word or alpheios-word
     * class, toggling the alpheios-known-word class on them according to their presence
     * or absense on the user's wordlist
     * @param {Alph.LanguageTool} a_langTool the appropriate Alpheios Language Tool
     * @param {Document} a_doc the document to update
     * @param {Function} a_callback a function to call upon completion
     */
    scanWords: function(a_langTool,a_doc,a_callback)
    {
        var wordlist = a_langTool.getWordList();
        if (wordlist)
        {
            Alph.$(".alpheios-aligned-word,.alpheios-word",a_doc).each(
                function()
                { 
                    var word = a_langTool.normalizeWord(Alph.$(this).text());
                    if (wordlist.checkForm(word))
                    {
                        Alph.$(this).addClass("alpheios-known-word");
                    }
                    else
                    {
                        Alph.$(this).removeClass("alpheios-known-word");
                    }
                
                }
            );
        }
        a_callback();
    }
};