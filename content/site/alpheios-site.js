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
        // add the pedagogical text stylesheet
        var ped_text_css = "chrome://alpheios/skin/alpheios-site-text.css";
        // only add the stylesheet if it's not already there
        if (Alph.$("link[href='"+ ped_text_css + "']",a_doc).length == 0)
        {
            var css = document.createElementNS(
                "http://www.w3.org/1999/xhtml","link");
            css.setAttribute("rel", "stylesheet");
            css.setAttribute("type", "text/css");
            css.setAttribute("href", ped_text_css);
            css.setAttribute("id", "alpheios-site-text-css");
            Alph.$("head",a_doc).append(css);
        }
        
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
            {alpheios_panel_id: 'alph-tree-panel'},
            this.toggle_panel_handler
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
            { alpheios_cmd_id: 'alpheios-level-cmd' },
            this.do_command_handler
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
     * handler method for click on a toolbar item which 
     * controls an Alpheios panel
     * @param {Event} a_event the click event - the panel id should
     *                        be defined in a custom event property named alpheios_panel_id
     */
    toggle_panel_handler: function(a_event)
    {
        // 'this' is the toolbar element
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
        if (Alph.$("#alph-trans-url",a_doc).length == 0)
        {
            return;
        }
        
        // add a checkbox to control the interlinear translation in the source
        // text display, but make sure we only add it once
        if (Alph.$(".alpheios-interlinear-toggle",a_doc).length == 0)
        {
            Alph.$(".alpheios-enable-interlinear",a_doc).append(
                '<input type="checkbox" class="alpheios-interlinear-toggle"/>' +
                '<span>' +
                document.getElementById("alpheios-strings")
                            .getString("alph-enable-interlinear") +
                '</span>'
            );
            // update the checked state of the interlinear toggle in the source text
            // document with the state of real control from the XUL
            Alph.$(".alpheios-interlinear-toggle",a_doc).attr("checked",
                Alph.$("#alpheios-trans-opt-inter-src").attr('checked') == "true" 
                    ? true : null);
                
            Alph.$(".alpheios-interlinear-toggle",a_doc).click(
                function(e)
                {
                    // keep the state of the XUL control and the document
                    // control in sync
                    var checked = Alph.$(this).attr('checked');
                    Alph.$("#alpheios-trans-opt-inter-src").attr('checked',checked);
                    Alph.Translation.toggle_interlinear('src',e);
                }
            );
        }
    },
    
    add_interlinear_text: function(a_target,a_source)
    {
        // only do this once per document
        {
            if (Alph.$(".alpheios-aligned-trans",a_target).length > 0)
            {
                return;
            }
        }
        
        // wrap a div around each target word so that the aligned text can
        // be floated under it
        Alph.$(".alpheios-aligned-word",a_target)
            .wrap("<div class='alpheios-word-wrap'></div>");
            
        Alph.$(".alpheios-word-wrap",a_target).parent().addClass("alpheios-word-block");
            
        // add the aligned text to each source word
        var next_offset = 0;
        Alph.$(".alpheios-aligned-word",a_target).each(
            function()
            {
                var parent = Alph.$(this).parent(".alpheios-word-wrap");
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
                var offset_top = Alph.$(this).height();
                var target_width = Alph.$(this).width();
                    
                if (Alph.$(this).attr("nrefs"))
                {
                    
                    var my_ids = Alph.$(this).attr("nrefs").split(/\s|,/);
                    for (var i=0; i<my_ids.length; i++) {
                       if (my_ids[i]) { 
                           var elem = Alph.$(".alpheios-aligned-word[id='" 
                            + my_ids[i] + "']",a_source);
                           if (elem.length == 0) {
                                continue;
                           }
                           var id_copy = Alph.$(Alph.$(elem)[0]).clone().appendTo(parent);
                           Alph.$(id_copy).attr("id", "il-" + my_ids[i]);
                           Alph.$(id_copy).addClass("alpheios-aligned-trans");
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
        );
        
        // resize the source display to account for the new elements
        this.resize_interlinear(a_target);

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
     * @param {Event} the event which triggered the action
     * @param {Element} the target element
     * @param {String} type of target text 
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
     * Enable the interlinear alignment
     * @param {Document} a_target the target document for the interlinear translation
     * @param {Document} a_source the source of the interlinear translation
     *                   
     */
    enable_interlinear: function(a_target,a_source)
    {    
        if ( (Alph.$(".alpheios-aligned-word",a_target).length == 0 ||
              Alph.$(".alpheios-aligned-word",a_source).length == 0)  && 
             (Alph.$("p.alph-proto-sentence",a_target).length == 0 ||
             Alph.$("p.alph-proto-sentence",a_source).length == 0 )
            )
        {
            // If we don't have interlinear markup in both the source
            // and parallel text, just disable the interlinear option and return
            // TODO we shouldn't assume that if interlinear is available one way
            // it is also available the other way 
            Alph.util.log("Disable interlinear");
            Alph.$("#alph-trans-inter-trans-status").attr("disabled",true);
            Alph.$("#alph-trans-inter-trans-status").attr("hidden",true);
        }
        else
        {
            Alph.$("#alph-trans-inter-trans-status").attr("disabled",false);
            Alph.$("#alph-trans-inter-trans-status").attr("hidden",false);
        }
    }
};