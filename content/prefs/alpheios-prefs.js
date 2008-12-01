/**
 * @fileoverview This file contains the Alph.prefs class which defines
 * the functionality for the Preferences dialog
 * 
 * @version $Id: alpheios-prefs.js 798 2008-06-20 20:42:04Z BridgetAlmas $
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
 * @singleton
 */
Alph.prefs = {
    
    /**
     * Initializes the panel preferences on the window preferences pane
     * - copies the main panel preferences grid to the language-specific
     *   panel prefs tabs, if any
     * - adds a click handler to the override defaults checkbox to
     *   toggle the disabled status of the language-specific panel prefs
     */
    init_panel_prefs: function()
    {

        var lang_list = Alph.Languages.get_lang_list();
        
        var prefs = Alph.$("#alpheios-prefs-windows preferences").get(0);
        
        for (var i=0; i<lang_list.length; i++)
        {
            var lang = lang_list[i];
            
            var box = Alph.$("#panel-prefs-box-" + lang).get(0);
            
            // if we don't have a place to put the grid for this language, just 
            // continue to the next language
            if (typeof box == "undefined")
            { 
                continue;
            }
            
            var use_defs_cbx = Alph.$("#panel-override-"+lang).get(0);
            // if we don't have a control for overriding the panel
            // prefs for this language just continue to the next language
            if (typeof use_defs_cbx == "undefined")
            {
                continue;
            }
            
            // clone the default panel preferences grid
            // repurpose the cloned copy for this language
            var grid = Alph.$("grid#alpheios-panel-prefs-default").clone();
            Alph.$(grid).get(0).setAttribute("id","alpheios-panel-prefs-"+lang);
            
            // iterate through the checkboxes on the grid, updating
            // attributes to reference this language and adding a preference
            // to the prefpane for each item
            Alph.$("checkbox",grid).each(
                function()
                {
                    
                    var id = this.getAttribute("id");
                    if (id != null)
                    {
                        this.setAttribute("id",id + "-" + lang);
                    }
                    
                    var pref_id = this.getAttribute("preference");
                    var new_pref_id = pref_id + "-" + lang;
                    
                    this.setAttribute("preference",new_pref_id);
                    
   
                    // add a preference to the pane for this checkbox
                    var def_pref = Alph.$("preference#"+pref_id);
                    
                    var new_pref_name = 
                        def_pref.attr("name").
                        replace(
                            /(extensions.alpheios)/,
                            "$1."+lang);
                            
                    var new_pref = document.createElementNS(
                            "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", 
                            "preference");
                            
                    new_pref.setAttribute("id",new_pref_id);
                    new_pref.setAttribute("type","int");
                    new_pref.setAttribute("name",new_pref_name); 
                    prefs.appendChild(new_pref);
                    
                    // if we're using the defaults, show whatever
                    // we last had set for the language preferences
                    // but disable the checkboxes
                    if (use_defs_cbx.checked)
                    {
                        this.setAttribute("disabled",true);
                    }

                    
                }
            );
    
            // add a handler to the override checkbox
            Alph.$(use_defs_cbx).click(
                function()
                {
                    Alph.prefs.toggle_panel_pref_cbx(this);
                }
            );

            // add the new grid to the box
            box.appendChild(Alph.$(grid).get(0));
            
        }
    },
    
    /**
     * respond to a change to a panel preference checkbox -- since
     * the values of these preferences are not simple booleans, need
     * to return the correct Alph.Panel static variable for the state
     * @param {XULElement} a_cbx the XUL Checkbox element for the panel preference
     * @return Alph.Panel.STATUS_SHOW if the checkbox is checked otherwise
     *         Alph.Panel.STATUS_HIDE
     * @type int
     */
    update_panel_pref: function(a_cbx)
    {
        if (a_cbx.checked)
        {
            return Alph.Panel.STATUS_SHOW;
        }
        else 
        {
            return Alph.Panel.STATUS_HIDE;
        }

                  
    },
    
    /**
     * Toggle the disabled state of the language-specific panel
     * preferences checkboxes
     * @param {XULElement} a_cbx the XUL Checkbux element for using panel defaults 
     */
    toggle_panel_pref_cbx: function(a_cbx)
    {
        // if the use defaults checkbox is checked, then  
        // the per-language panel preference checkboxes should be disabled
        var disabled = a_cbx.checked;
        // Pickup the language from the checkbox id
        try
        {
            var lang = a_cbx.id.match(/-(\w+)$/)[1];
            var grid = Alph.$("#alpheios-panel-prefs-"+lang);
            // iterate through the panel preference checkboxes for this
            // language, updating the disabled status
            Alph.$("checkbox",grid).each(
                function()
                {
                    this.setAttribute("disabled",disabled);
                }
            );
        }
        catch(e)
        {
            // no match 
        }
    },
    
    restore_panel_defaults: function(a_lang)
    {
            var grid_id = "#alpheios-panel-prefs";
            if (typeof a_lang == "undefined")
            {
                grid_id = grid_id + "-default";
            }
            else
            {
                grid_id = grid_id + "-" + a_lang;
            }
            var grid = Alph.$(grid_id);
            // iterate through the panel preference checkboxes for this
            // language, refreshing the defaults
            Alph.$("checkbox",grid).each(
                function()
                {
                    var pref_id = this.getAttribute("preference");
                    var pref = document.getElementById(pref_id);
                    if (pref.defaultValue == null)
                    {
                        // get the global default if none was specified
                        // in the language defaults
                        var match_string = new RegExp('\.' + a_lang);
                        var g_pref_id = pref_id.replace(match_string,"");
                        pref.value = 
                            document.getElementById(g_pref_id)
                            .defaultValue;
                    }
                    else
                    {
                        pref.value = pref.defaultValue;
                    }
                }
            );

    }
};
