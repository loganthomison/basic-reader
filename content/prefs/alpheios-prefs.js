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

    init: function()
    {
        this._PREFS = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService)
                      .getBranch("extensions.alpheios."),
        this._PREFS.QueryInterface(Components.interfaces.nsIPrefBranch2);
    },
 
    /**
     * Initializes the panel preferences on the window preferences pane
     * - copies the main panel preferences grid to the language-specific
     *   panel prefs tabs, if any
     * - adds a click handler to the override defaults checkbox to
     *   toggle the disabled status of the language-specific panel prefs
     */
    init_panel_prefs: function()
    {
        
        var prefs = Alph.$("#alpheios-prefs-windows preferences").get(0);
        
        Alph.$("[id^=panel-prefs-box-]").each(
        
            function() {
                
                var box = this;
                var lang = this.id.match(/panel-prefs-box-(.+)$/)[1];
                
                var use_defs_cbx = Alph.$("#panel-override-"+lang).get(0);
                // if we don't have a control for overriding the panel
                // prefs for this language just continue to the next language
                if (typeof use_defs_cbx != "undefined")
                {                
                
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
            }
        );
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
    
    /**
     * Restore the default panel settings for a language
     * @param {String} a_lang the language
     */
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
        
    },
    
    /**
     * Initialize the dictionary preferences screen
     * populates the language-specific tabs in the Dictionary
     * preferences pane with the default dictionary preference 
     * elements for the language. 
     */
    init_dict_prefs: function()
    {
        var strings = document.getElementById("alpheios-prefs-strings");

        var prefs = Alph.$("#alpheios-prefs-dictionaries preferences").get(0);
        
        var BY_ID = '.id_url';
        var BROWSE = '.browse_url';
        var LEMMA = '.lemma_param';
        var LEMMA_ID = '.lemma_id_param';
        var MULTI = '.multiple_lemmas';
        var MULTI_ID = '.multiple_lemma_ids';

        // iterate through the languages which have containers for the
        // dictionary preferences defined
        Alph.$("[id^=dicts-prefs-language-details-]").each(
        
            function() {
                
                var dict_parent = this;
                var lang = this.id.match(/dicts-prefs-language-details-(.+)$/)[1];
                if (lang != null && typeof lang != "undefined")
                {
                    var lang_strings = document.getElementById("alpheios-prefs-strings-"+lang);
                    
                    // add preference for default full and short dictionary for this language
                    prefs.appendChild(
                        Alph.util.makePref(
                            'pref-' + lang + '-dict-default',
                            'extensions.alpheios.' + lang + '.dictionaries.full.default',
                             'string')
                    );
                    
                    // add radio group to set default dictionary for this language
                    var rgroup = Alph.util.makeXUL(
                        'radiogroup',
                        'alph-dict-select-'+lang,
                        ['preference'],['pref-' + lang + '-dict-default']
                    );  
                    rgroup.appendChild(
                        Alph.util.makeXUL(
                            'caption',
                            '',
                            ['label'],
                            [strings.getString('dict.default')]
                        )
                    );
                    rgroup.appendChild(
                        Alph.util.makeXUL(                
                            'radio',
                            'alph-dict-select-none-' + lang,
                            ['label','value'],
                            [strings.getString('dict.none'),'']
                        )
                    );
                    dict_parent.appendChild(rgroup);                                                            
                    
                    var dictionary_list = 
                        Alph.prefs._PREFS.getCharPref(lang + '.dictionaries.full'); 
                    
                    // iterate through the supported dictionaries for this language
                    // adding the preferences and radio elements for this dictionary
                    dictionary_list.split(/,/).forEach(
                        function(a_dict)
                        {
                            var dict_name = 
                                lang_strings.getString('dict.' + a_dict);
                            
                            rgroup.appendChild(
                                Alph.util.makeXUL(                
                                    'radio',
                                    'alph-dict-select-' + lang + '-' + a_dict,
                                    ['label','value'],
                                    [dict_name,a_dict]
                                )
                            );
                                                    
                            // if the dictionary uses the default method, add a groupbox
                            // with textboxes to set the url and lemma parameter for this
                            // dictionary
                            var dict_method;
                            try 
                            { 
                                dict_method = Alph.prefs._PREFS.getCharPref(
                                    lang + '.methods.dictionary.full.'+a_dict);
                            }
                            catch(e) {}
                            if (dict_method == null || 
                                dict_method == "methods.dictionary.full.default")
                            {
                                var ctl_id = lang+'-dict-'+a_dict+'-url';
                                var pref_id = 'pref-' + ctl_id;
                                
                                var pref_base = 'extensions.alpheios.' 
                                                + lang
                                                + '.dictionary.full.' 
                                                + a_dict;
                                var pref_base_s = pref_base + '.search';
                                // add the preferences for url and lemma
                                prefs.appendChild(
                                    Alph.util.makePref(
                                        pref_id,
                                        pref_base_s + '.lemma_url',
                                        'string')
                                );
                                prefs.appendChild(
                                    Alph.util.makePref(
                                        pref_id + BY_ID,
                                        pref_base_s + BY_ID,
                                        'string')
                                );
                                prefs.appendChild(
                                    Alph.util.makePref(
                                        pref_id + LEMMA,
                                        pref_base_s + LEMMA,
                                        'string')
                                );
                               prefs.appendChild(
                                    Alph.util.makePref(
                                        pref_id + LEMMA_ID,
                                        pref_base_s + LEMMA_ID,
                                        'string')
                                );

                                prefs.appendChild(
                                    Alph.util.makePref(
                                        pref_id + MULTI,
                                        pref_base_s + MULTI,
                                        'bool')
                                );
                        
                                prefs.appendChild(
                                    Alph.util.makePref(
                                        pref_id + MULTI_ID,
                                        pref_base_s + MULTI_ID,
                                        'bool')
                                );
                        
                                prefs.appendChild(
                                    Alph.util.makePref(
                                        pref_id + BROWSE,
                                        pref_base + '.browse.url',
                                        'string')
                                );

                                var groupbox = Alph.util.makeXUL(
                                    'groupbox','alph-dict-settings-'+a_dict,[],[]);
                                groupbox.appendChild(
                                    Alph.util.makeXUL(
                                        'caption',
                                        '',
                                        ['label'],[dict_name]
                                    )
                                );
                                var hbox =
                                    Alph.util.makeXUL('hbox','',[],[]);
                                hbox.appendChild(
                                    Alph.util.makeXUL(
                                        'label',
                                        '',
                                        ['control','value'],
                                        [ctl_id,strings.getString('dict.url.search')]
                                    )
                                );
                                hbox.appendChild(
                                    Alph.util.makeXUL(
                                        'textbox',
                                        ctl_id,
                                        ['preference'],
                                        [pref_id]
                                    )
                                );
                                 var hbox_lemma =
                                    Alph.util.makeXUL('hbox','',[],[]);
                                hbox_lemma.appendChild(
                                    Alph.util.makeXUL(
                                        'label',
                                        '',
                                        ['control','value'],
                                        [ctl_id+LEMMA,
                                         strings.getString('dict.url' + LEMMA)]
                                    )
                                );
                                hbox_lemma.appendChild(
                                    Alph.util.makeXUL(
                                        'textbox',
                                        ctl_id + LEMMA,
                                        ['preference'],
                                        [pref_id+LEMMA]
                                    )
                                );
                                hbox_lemma.appendChild(
                                    Alph.util.makeXUL(
                                        'checkbox',
                                        ctl_id + MULTI,
                                        ['preference'],
                                        [pref_id+MULTI]
                                    )
                                );
                                hbox_lemma.appendChild(
                                    Alph.util.makeXUL(
                                        'label',
                                        '',
                                        ['control','value'],
                                        [ctl_id + MULTI,
                                         strings.getString('dict.url' + MULTI)]
                                    )
                                );
                                
                                // add the lemma id url prefs
                                var hbox_id =
                                    Alph.util.makeXUL('hbox','',[],[]);
                                hbox_id.appendChild(
                                    Alph.util.makeXUL(
                                        'label',
                                        '',
                                        ['control','value'],
                                        [ctl_id+BY_ID,
                                        strings.getString('dict.url'+BY_ID)]
                                    )
                                );
                                hbox_id.appendChild(
                                    Alph.util.makeXUL(
                                        'textbox',
                                        ctl_id+BY_ID,
                                        ['preference'],
                                        [pref_id+BY_ID]
                                    )
                                );
                                 var hbox_lemma_id =
                                    Alph.util.makeXUL('hbox','',[],[]);
                                hbox_lemma_id.appendChild(
                                    Alph.util.makeXUL(
                                        'label',
                                        '',
                                        ['control','value'],
                                        [ctl_id+LEMMA_ID,
                                         strings.getString('dict.url' + LEMMA_ID)]
                                    )
                                );
                                hbox_lemma_id.appendChild(
                                    Alph.util.makeXUL(
                                        'textbox',
                                        ctl_id + LEMMA_ID,
                                        ['preference'],
                                        [pref_id+LEMMA_ID]
                                    )
                                );
                                hbox_lemma_id.appendChild(
                                    Alph.util.makeXUL(
                                        'checkbox',
                                        ctl_id + MULTI_ID,
                                        ['preference'],
                                        [pref_id+MULTI_ID]
                                    )
                                );
                                hbox_lemma_id.appendChild(
                                    Alph.util.makeXUL(
                                        'label',
                                        '',
                                        ['control','value'],
                                        [ctl_id + MULTI_ID,
                                         strings.getString('dict.url' + MULTI_ID)]
                                    )
                                );
                                
                                var hbox_browse =
                                    Alph.util.makeXUL('hbox','',[],[]);
                                hbox_browse.appendChild(
                                    Alph.util.makeXUL(
                                        'label',
                                        '',
                                        ['control','value'],
                                        [ctl_id + BROWSE,strings.getString('dict.url' + BROWSE)]
                                    )
                                );
                                hbox_browse.appendChild(
                                    Alph.util.makeXUL(
                                        'textbox',
                                        ctl_id + BROWSE,
                                        ['preference'],
                                        [pref_id + BROWSE]
                                    )
                                );
                                groupbox.appendChild(hbox);
                                groupbox.appendChild(hbox_lemma);
                                groupbox.appendChild(hbox_id);
                                groupbox.appendChild(hbox_lemma_id);
                                groupbox.appendChild(hbox_browse);
                                dict_parent.appendChild(groupbox);                                
                            }        
                        }
                    ); // end iteration through dictionary list
                }      
            }
        );  // end iteration through languages
    }
};

Alph.prefs.init();