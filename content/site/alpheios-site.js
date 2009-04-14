/**
 * @fileoverview This file defines the Alph.site class, which 
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
 * @singleton
 */
Alph.site = {
    
    /**
     * injects the browser content document with Alpheios pedagogical
     * functionality
     * @param {Document} a_doc the browser content document
     */
    setup_page: function(a_doc,a_type)
    {
        
        // unless interactivity is enabled,
        // add the mouseover handlers for the parallel alignment
        // and the interlinear alignment toggle
        if (! Alph.interactive.enabled())
        {
            Alph.$(".alpheios-aligned-word",a_doc).mouseover(  
                function(e) { Alph.site.toggle_alignment(e,this,a_type,true)}
            );
            
            Alph.$(".alpheios-aligned-word",a_doc).mouseout( 
                function(e) { Alph.site.toggle_alignment(e,this,a_type,false) }
            );
            
            // wrap a div around each target word so that the aligned text can
            // be floated under it
            if (Alph.$(".alpheios-word-wrap",a_doc).length == 0)
            {
                Alph.$(".alpheios-aligned-word",a_doc)
                    .wrap("<div class='alpheios-word-wrap'></div>");
            }
                

            if (a_type == Alph.Translation.INTERLINEAR_TARGET_SRC)
            {
                this.add_interlinear_toggle(a_doc);
            }
        }
        this.enable_toolbar(a_doc);
        
        
    },
    
    /**
     * If the site contains an element with the class 'alpheios-toolbar',
     * adds the toolbar handlers to the child elements
     * @param {Document} a_doc the browser content document
     */
    enable_toolbar: function(a_doc)
    {
        
        var toolbars = Alph.$(".alpheios-toolbar",a_doc);
        // do nothing if we don't have a toolbar
        if (toolbars.length == 0)
        {
            return;
        }
        Alph.$(".alpheios-toolbar-translation",toolbars).bind(
            'click',
            {alpheios_panel_id: 'alph-trans-panel'},
            this.toggle_panel_handler
        );
        Alph.$(".alpheios-toolbar-tree",toolbars).bind(
            'click',
            {alpheios_cmd_id: 'alpheios-tree-open-cmd'},
            this.do_command_handler
        );
        Alph.$(".alpheios-toolbar-options",toolbars).bind(
            'click',
            {alpheios_cmd_id: 'alpheios-options-cmd'},
            this.do_command_handler
        );
        Alph.$(".alpheios-toolbar-about",toolbars).bind(
            'click',
            { alpheios_cmd_id: 'alpheios-about-cmd'},
            this.do_command_handler
        );
        Alph.$(".alpheios-toolbar-level",toolbars).bind(
            'click',
            function()
            {
                var mode = this.getAttribute('alpheios-value');
                if (mode)
                {
                    Alph.main.set_mode(null,mode);
                }
            }
        );
        
        Alph.$(".alpheios-toolbar-inflect",toolbars).bind(
            'click',
            { alpheios_cmd_id: 'alpheios-inflect-cmd' },
            this.do_command_handler
        );
        Alph.$(".alpheios-toolbar-grammar",toolbars).bind(
            'click',
            { alpheios_cmd_id: 'alpheios-grammar-cmd' },
            this.do_command_handler
        );
        Alph.$(".alpheios-toolbar-wordlist",toolbars).bind(
            'click',
            { alpheios_cmd_id: 'alpheios-wordlist-cmd' },
            this.do_command_handler
        );
        Alph.$(".alpheios-toolbar-help",toolbars).bind(
            'click',
            {alpheios_cmd_id: 'alpheios-help-cmd'},
            this.do_command_handler
        );
        
    },
    

    /**
     * set current mode
     */
    set_current_mode: function(a_doc,a_mode)
    {
        try
        {
            Alph.$(".alpheios-toolbar-level[alpheios-value=" + a_mode + "]",a_doc).each
            (
                function()
                {
                    Alph.$(this).addClass("alpheios-current");
                    Alph.$(this)
                        .siblings(".alpheios-toolbar-level")
                        .removeClass("alpheios-current");
                }
            );
        }
        catch(a_e)
        {
            Alph.util.log("Unable to update menu with new mode " + a_e);
        }
    },
    
    /**
     * update panel status
     */
    set_toolbar_panel_status: function(a_doc,a_panel_id,a_status)
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
            Alph.$("."+toolbar_class,a_doc).addClass("alpheios-current");
        }
        else
        {
            Alph.$("."+toolbar_class,a_doc).removeClass("alpheios-current");
        }
    },
    
    /**
     * handler method for click on a toolbar item which 
     * controls an Alpheios panel
     * @param {Event} a_event the click event - the panel id should
     *                        be defined in a custom event property named alpheios_panel_id
     */
    toggle_panel_handler: function(a_event)
    {
        // 'this' is the toolbar element
        var panel_status = 
            Alph.main.toggle_panel(a_event,a_event.data.alpheios_panel_id);
    },
    
    /**
     * handler method for click on a toolbar item which
     * executes an Alpheios command
     * @param {Event} a_event the click event - the id of the command to be executed should
     *                        be defined in a custom event property named alpheios_cmd_id
     */
    do_command_handler: function(a_event)
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
     * @param {Document} a_doc the browser content document
     */
    add_interlinear_toggle: function(a_doc)
    {
        
        // don't add the toggle if we don't have an aligned translation to use
        if ( (Alph.$("#alph-trans-url",a_doc).length == 0) ||  
               Alph.$(".alpheios-aligned-word",a_doc).length == 0)
        {
            return;
        }
        
        // add handlers to interlinear translation controls 
        // in the source text display, but only do it if this feature
        // is turned on
        if ( Alph.util.getPref("features.alpheios-interlinear") )
        {
            
            var my_obj = this;

            Alph.$(".alpheios-interlinear-toggle",a_doc)
                .bind('click', Alph.site.handle_interlinear_toggle);        

            // update the checked state of the interlinear toggle in the source text
            // document with the state of the XUL control
            if (Alph.$("#alpheios-trans-opt-inter-src").attr('checked') == 'true')
            {
                Alph.$(".alpheios-interlinear-toggle",a_doc).attr("checked",true);
                Alph.site.handle_interlinear_toggle(null,
                    Alph.$(".alpheios-interlinear-toggle",a_doc).get(0));
            }
            
        }
    },

    /**
     * Toggle the interlinear display
     * @param {Event} a_event the triggering event
     * @param {Object} a_toggle (Optional)
     */
    handle_interlinear_toggle: function(a_event,a_toggle)
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
               
        var trans_url = Alph.$("#alph-trans-url",toggle_elem.ownerDocument).attr("url");
        var words = Alph.$(".alpheios-word-wrap",toggle_elem.ownerDocument).get();
        if (checked)
        {
            var loading_msg = 
                Alph.$("#alpheios-strings").get(0).getString("alph-loading-interlinear");
            Alph.$(toggle_elem)
                .after('<div id="alpheios-loading-interlinear">' + loading_msg + '</div>');
                
            // Reload the interlinear translation document rather than just retrieving
            // it from the translation panel, because the translation panel may
            // not be open. We may also eventually want to be able to use a different document 
            // for the interlinear than the side by side alignment.
            // using XMLHttpRequest directly here because the interlinear may be in the
            // chrome, which jQuery doesn't support
            var r = new XMLHttpRequest();
            r.onreadystatechange = function()
            {
                if (r.readyState == 4 && r.responseText) 
                {
                    var src_doc; 
                    try {
                        src_doc = (new DOMParser()).parseFromString(
                            r.responseText,
                            "application/xhtml+xml");
                        Alph.site.populate_interlinear(
                            words,
                            src_doc,
                            function() {
                                Alph.$("#alpheios-loading-interlinear",
                                    toggle_elem.ownerDocument).remove();
                            });
                    }
                    catch(a_e)
                    {
                        Alph.$("#alpheios-loading-interlinear",
                                    toggle_elem.ownerDocument).remove();
                        Alph.util.log("Unable to parse translation: " + a_e);
                    }
                    
                }
                else 
                {
                    Alph.util.log("Loading translation...");
                }
            }
            r.open("GET", trans_url);
            r.send(null);                                
        } else {
            Alph.site.hide_interlinear(words);

        }
    },

    /**
     * Resize the source text display, adding line breaks where needed
     * @param {Document} a_doc the contentDocument for the source text
     */
    resize_interlinear: function(a_doc)
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
    toggle_alignment: function(a_event,a_elem,a_type,a_on)
    {
        // toggle the selector class for the source text
        if (a_on)
        {
            Alph.$(a_elem).addClass('alpheios-highlight-source');    
        }
        else
        {
            Alph.$(a_elem).removeClass('alpheios-highlight-source');
        }
        
        
        // toggle the selection of the parallel aligned text
        try {
            var panel_obj = Alph.main.panels['alph-trans-panel'];
            panel_obj.toggle_parallel_alignment(a_elem,a_type,a_on);
        }
        catch(a_e)
        {
            Alph.util.log("Error toggling alignment: " + a_e);
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
    populate_interlinear: function(a_words,a_source,a_end_callback)
    {    
        /*
         * This code is a little convuluted.  We want to issue
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
        
                var start = (new Date()).getTime();
                Alph.util.log("Starting interlinear " + start);
                // add the aligned text to each source word
                a_words.forEach(
                    function(parent)
                    {
                   
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
                Alph.util.log("Total time to insert interlinear: " + (end-start));
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
    toggle_interlinear: function(a_words,a_src_doc,a_on)
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
    hide_interlinear: function(a_words)
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
    }
    
    
};