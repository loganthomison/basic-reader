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
    setup_page: function(a_doc)
    {
        this.enable_toolbar(a_doc);
        this.add_interlinear_toggle(a_doc);
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
        if (Alph.$("meta#alpheios-trans-url",a_doc).length == 0)
        {
            return;
        }
        
        // add a checkbox to control the interlinear translation in the source
        // text display, but make sure we only add it once
        if (Alph.$("#alpheios-enable-interlinear",a_doc).length == 0)
        {
            Alph.$("#alph-text-links",a_doc).append(
                '<div id="alpheios-enable-interlinear">' +
                '<input type="checkbox" id="alpheios-interlinear-toggle"/>' +
                '<span>' +
                document.getElementById("alpheios-strings")
                            .getString("alph-enable-interlinear") +
                '</span>' +
                '</div>'
            );
            // update the checked state of the interlinear toggle in the source text
            // document with the state of real control from the XUL
            Alph.$("#alpheios-interlinear-toggle",a_doc).attr("checked",
                Alph.$("#alpheios-trans-opt-inter-src").attr('checked') == "true" 
                    ? true : null);
                
            Alph.$("#alpheios-interlinear-toggle",a_doc).click(
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
    }
};