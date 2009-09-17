/**
 * @fileoverview This file contains the Alph.Prefs class which defines
 * the functionality for the Preferences dialog
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
Alph.BrowserUtils.importResource("resource://alpheios/alpheios-langtool-factory.jsm",Alph);
Alph.BrowserUtils.importResource("resource://alpheios/alpheios-site-permissions.jsm",Alph);

 /**
 * @class Preferences Dialog functionality
 */
Alph.Prefs = {

    d_selectedDictItem: null,
    d_selectedSiteItem:  null,
       
    /**
     * Add language-specific feature preferences
     */
    initFeaturePrefs: function()
    {
        var prefs = Alph.$("#alpheios-prefs-features preferences").get(0);
        var strings = document.getElementById("alpheios-prefs-strings");
        
        var languages = Alph.LanguageToolFactory.getLangList();        
        // iterate through the languages adding mouse preferences 
        for (var i =0; i<languages.length; i++)
        {
            var lang = languages[i];
            var lang_strings = Alph.LanguageToolFactory.getStringBundle(lang);
            prefs.appendChild(
                Alph.Util.makePref(
                    lang+'-pref-trigger',
                    'extensions.alpheios.' + lang + '.popuptrigger',
                    'string')
            );
            var radiogroup = Alph.Util.makeXUL(
                'radiogroup','',['preference'],[lang+'-pref-trigger']
            );
            Alph.$(radiogroup).append(
                Alph.Util.makeXUL('caption','',['label'],[lang_strings.get(lang+'.string')])
            ).append(
                Alph.Util.makeXUL(
                    'radio','',
                    ['label','value'],[strings.getString('trigger.mousemove'),'mousemove'])
            ).append(
                Alph.Util.makeXUL(
                    'radio','',
                    ['label','value'],[strings.getString('trigger.dblclick'),'dblclick'])
            );
            Alph.$("#alpheios-mouse-group").append(radiogroup);

        }

    },
    

    /**
     * Add language-specific service preferences
     */
    initSvcPrefs: function()
    {
        var prefs = Alph.$("#alpheios-prefs-svc-advanced preferences").get(0);
        var strings = document.getElementById("alpheios-prefs-strings");
        
        var languages = Alph.LanguageToolFactory.getLangList();        
        // iterate through the languages adding service preferences 
        for (var i =0; i<languages.length; i++)
        {
            var lang = languages[i];
            // TODO - move string url into language factory?
            var lang_strings = Alph.LanguageToolFactory.getStringBundle(lang);
            prefs.appendChild(
                Alph.Util.makePref(
                    'pref-'+lang+'-lexicon',
                    'extensions.alpheios.' + lang + '.url.lexicon',
                    'string')
            );
            prefs.appendChild(
                Alph.Util.makePref(
                    'pref-'+lang+'-lexicon-request',
                    'extensions.alpheios.' + lang + '.url.lexicon.request',
                    'string')
            );
            prefs.appendChild(
                Alph.Util.makePref(
                    'pref-'+lang+'-lexicon-timeout',
                    'extensions.alpheios.' + lang + '.url.lexicon.timeout',
                    'int')
            );
            Alph.$("#alpheios-svc-prefs-tabs").append(   
                Alph.Util.makeXUL(
                    'tab','',['label'],[lang_strings.get(lang+'.string')])
            );
            var tabpanel = Alph.Util.makeXUL(
                'tabpanel','alpheios-svc-prefs-'+lang,[],[]);
            Alph.$("#alpheios-svc-prefs-details").append(tabpanel);
            var hbox = Alph.Util.makeXUL('hbox','',['flex','align'],['1','center']);
            var vbox = Alph.Util.makeXUL('vbox','',['flex'],['1']);
            Alph.$(vbox).append(
                Alph.Util.makeXUL('label','',
                    ['value','control'],[strings.getString('url.morph'),lang+'-lexicon'])
            ).append(
                Alph.Util.makeXUL('textbox',lang+'-lexicon',['preference'],['pref-'+lang+'-lexicon'])
            ).append(
                Alph.Util.makeXUL('label','',
                    ['value','control'],[strings.getString('url.morph.request'),lang+'-lexicon-request'])

            ).append(
                Alph.Util.makeXUL('textbox',lang+'-lexicon-requext',
                    ['preference'],['pref-'+lang+'-lexicon-request'])

            ).append(
                Alph.Util.makeXUL('label','',
                    ['value','control'],[strings.getString('url.morph.timeout'),lang+'-lexicon-timeout'])

            ).append(
                Alph.Util.makeXUL('textbox',lang+'-lexicon-timeout',
                    ['preference'],['pref-'+lang+'-lexicon-timeout'])

            );
            Alph.$(hbox).append(vbox);
            Alph.$(tabpanel).append(hbox);
        }
    },
        
    /**
     * Initializes the panel preferences on the window preferences pane
     * - copies the main panel preferences grid to the language-specific
     *   panel prefs tabs, if any
     * - adds a click handler to the override defaults checkbox to
     *   toggle the disabled status of the language-specific panel prefs
     */
    initPanelPrefs: function()
    {
        
        var prefs = Alph.$("#alpheios-panel-prefs preferences").get(0);
        var strings = document.getElementById("alpheios-prefs-strings");
        
        var languages = Alph.LanguageToolFactory.getLangList();
        
        // iterate through the languages adding dictionary preferences for those which
        // have dictionaries defined
        for (var i =0; i<languages.length; i++)
        {
            var lang = languages[i];
            var lang_strings = Alph.LanguageToolFactory.getStringBundle(lang);
            
            prefs.appendChild(
                Alph.Util.makePref(
                    'pref-panel-override-'+lang,
                    'extensions.alpheios.' + lang + '.panels.use.defaults',
                    'bool')
            );
            Alph.$('#panel-prefs-tabs').append(
                Alph.Util.makeXUL(
                    'tab','',['label'],[lang_strings.get(lang+'.string')])
            );
            var tabpanel = Alph.Util.makeXUL(
                'tabpanel','panel-prefs-tabpanel-'+lang,['align'],['vertical']
            );
            Alph.$('#panel-prefs-tabpanels').append(tabpanel);
            var vbox = Alph.Util.makeXUL('vbox','',[],[]);
            var hbox = Alph.Util.makeXUL('hbox','',['align'],['center']);
            Alph.$(tabpanel).append(Alph.$(vbox).append(hbox));
            var use_defs_cbx = Alph.Util.makeXUL(
                'checkbox','panel-override-'+lang,['preference'],['pref-panel-override-'+lang]);
            var use_defaults = Alph.BrowserUtils.getPref('panels.use.defaults',lang);
            Alph.$(hbox)
                .append(use_defs_cbx)
                .append(
                    Alph.Util.makeXUL('label','',
                        ['control','value'],
                        ['panel-override-latin',strings.getString('panels.use.defaults')]))
                .append(
                    Alph.Util.makeXUL('button','',
                        ['oncommand','label'],
                        ['Alph.Prefs.restorePanelDefaults(this,"'+lang+'")',
                            strings.getString('panels.restore.defaults')]));
            var groupbox = Alph.Util.makeXUL('groupbox','panel-prefs-box-'+lang,[],[]);
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
                    this.setAttribute("disabled",use_defaults);
                }
            );
            
            // add a handler to the override checkbox
            Alph.$(use_defs_cbx).click(
                function()
                {
                    Alph.Prefs.togglePanelPrefCbx(this);
                }
            );
            // add the new grid to the box
            groupbox.appendChild(Alph.$(grid).get(0));
            Alph.$(vbox).append(groupbox);
                        
        }
    },
    
    /**
     * respond to a change to a panel preference checkbox -- since
     * the values of these preferences are not simple booleans, need
     * to return the correct Alph.Panel static variable for the state
     * @param {XULElement} a_cbx the XUL Checkbox element for the panel preference
     * @returns one of Alph.Panel.STATUS_SHOW or Alph.Panel.STATUS_HIDE
     * @type int
     */
    updatePanelPref: function(a_cbx)
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
    togglePanelPrefCbx: function(a_cbx)
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
    restorePanelDefaults: function(a_elem,a_lang)
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
            var tabpanel = Alph.$(a_elem).parents("tabpanel").get(0);
            var grid = Alph.$(grid_id);
            // iterate through the panel preference checkboxes for this
            // language, refreshing the defaults
            Alph.$("checkbox",tabpanel).each(
                function()
                {
                    var pref_id = this.getAttribute("preference");
                    var pref = document.getElementById(pref_id);
                    if (pref.defaultValue == null && typeof a_lang != "undefined")
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
    initDictPrefs: function()
    {
        var strings = document.getElementById("alpheios-prefs-strings");

        var prefs = Alph.$("#alpheios-prefs-dictionaries preferences").get(0);

        var dict_types = ['short','full'];
        
        var languages = Alph.LanguageToolFactory.getLangList();
        
        // iterate through the languages adding dictionary preferences for those which
        // have dictionaries defined
        for (var i =0; i<languages.length; i++)
        {
            var lang = languages[i];
            var lang_strings = Alph.LanguageToolFactory.getStringBundle(lang);

            var short_list = null;
            var full_list = null;
            try { short_list = Alph.BrowserUtils.getPref('dictionaries.short',lang); }
            catch(a_e){}
            try { full_list = Alph.BrowserUtils.getPref('dictionaries.full',lang); }
            catch (a_e) {}
            // don't add any language tab to the dict prefs if no dicts are defined
            if ( short_list == null && full_list == null)
            {
                continue;
            }
            Alph.$('#dicts-prefs-language-tabs').append(
                Alph.Util.makeXUL(
                    'tab','dicts-prefs-language-tabs-latin',['label'],[lang_strings.get(lang+'.string')])
            );
            var tabpanel =     
                Alph.Util.makeXUL(
                    'tabpanel','',[],[]);
            var dict_parent = Alph.Util.makeXUL(
                'vbox',
                'dict-prefs-language-details-' + lang,
                [],[]);
            Alph.$('#dicts-prefs-language-details').append(Alph.$(tabpanel).append(dict_parent));
            if (short_list)
            {
                short_list = short_list.split(/,/).sort().join(',');
            }
            if (full_list)
            {
                full_list = full_list.split(/,/).sort().join(',');
            }
            dict_types.forEach(
                function(a_type)
                {
                    var list = (a_type == 'short') ? short_list : full_list;
                    // if there are more than one dictionary of this type
                    // present controls to set the search order
                    if (list && list.indexOf(',') != -1)
                    {
                        // add preference 
                        prefs.appendChild(
                        Alph.Util.makePref(
                            'pref-' + lang + '-dict-' + a_type,
                            'extensions.alpheios.' + lang + '.dictionaries.' + a_type,
                            'string')
                        );
                        var grid = Alph.Util.makeXUL(
                            'grid',
                            'alph-dict-grid-'+lang,
                            [],[]
                        );
                        var cols = Alph.Util.makeXUL('columns',null,[],[]);
                        cols.appendChild(Alph.Util.makeXUL('column',null,['flex'],['1']));
                        cols.appendChild(Alph.Util.makeXUL('column',null,[],[]));
                        grid.appendChild(cols);
                        var rows = Alph.Util.makeXUL('rows',null,[],[]);
                        var row = Alph.Util.makeXUL('row',null,[],[])
                        var lb_ordered = Alph.Util.makeXUL('listbox',
                            'dict-order-'+lang + '-' + a_type,
                            ['seltype','preference','onsyncfrompreference'],
                            ['single','pref-' + lang + '-dict-' + a_type,
                             'Alph.Prefs.readDictList("' + lang + '","' + a_type +'");' 
                            ]);
                        var button_box = Alph.Util.makeXUL('vbox',null,[],[]);
                        button_box.appendChild(
                            Alph.Util.makeXUL(
                                'button',
                                'up_'+a_type,
                                ['label','disabled'],
                                [strings.getString('dict.buttons.moveup'),'true'])
                        );
                        button_box.appendChild(
                            Alph.Util.makeXUL(
                                'button',
                                'down_'+ a_type,
                                ['label','disabled'],
                                [strings.getString('dict.buttons.movedown'),'true'])
                        );
                        if (short_list == full_list)
                        {
                            button_box.appendChild(
                                Alph.Util.makeXUL(
                                    'button',
                                    'reset_' + a_type,
                                    ['label'],
                                    [strings.getString('dict.buttons.copy.'+a_type),'true'])
                            );
                        }
                        Alph.$(lb_ordered).select(Alph.Prefs.onDictSelect); 
                        row.appendChild(lb_ordered);
                        row.appendChild(button_box);
                        rows.appendChild(row);
                        grid.appendChild(cols);
                        grid.appendChild(rows);
                        var label = Alph.Util.makeXUL(
                            'label',
                            null,
                            ['value'],
                            [strings.getString('dict.labels.order.'+a_type)]);
                        dict_parent.appendChild(label);
                        dict_parent.appendChild(grid);
                    }
                    // if there is only one dictionary of this type
                    // just display it
                    else if (list)
                    {
                        var label_str = 
                            strings.getFormattedString(
                                'dict.labels.single.' + a_type,
                                [lang_strings.get('dict.' + list)]);
                        dict_parent.appendChild(
                            Alph.Util.makeXUL(
                                'label',
                                 '',
                                 ['value'],
                                 [label_str]
                            )
                        );
                    }
                }
            );
            Alph.$("button",dict_parent).click(Alph.Prefs.writeDictList);
            var hbox = Alph.Util.makeXUL('hbox',null,[],[]);
            var command_str = 
                    'document.documentElement.openSubDialog(' + 
                    '"' + Alph.BrowserUtils.getContentUrl() +  '/alpheios-dict-prefs-adv.xul","",' + 
                    '{lang: "' + lang + '"}' +
                    ');'
            hbox.appendChild(
                Alph.Util.makeXUL(
                    'button',
                    'advanced',
                    ['label','oncommand'],
                    [strings.getString('dict.buttons.advanced'),command_str])
            );
            dict_parent.appendChild(hbox);            
        }            
    },
    
    /**
     * Initialize the advanced dictionary preferences screen
     */
    initAdvDictPrefs: function()
    {
        var a_lang = window.arguments[0].lang;
        var strings = document.getElementById("alpheios-prefs-strings");

        var prefs = Alph.$("#alpheios-prefs-dict-advanced-dlg preferences").get(0);
        
        var URL = '.url';
        var LEMMA = '.lemma_param';
        var ID = '.id_param';
        var MULTI = '.multiple_lemmas';
        
        var full_list = null;
        try { full_list = Alph.BrowserUtils.getPref('dictionaries.full',a_lang); }
        catch (a_e) {}
        if (full_list)
        {
            var lang_strings = Alph.LanguageToolFactory.getStringBundle(a_lang);

            var dict_parent = Alph.Util.makeXUL(
                'groupbox',
                'dict-prefs-language-details-adv-' + a_lang,
                [],[]);

            Alph.$('#alpheios-dict-tabs-advanced').append(dict_parent);
            Alph.$(dict_parent).append(
                Alph.Util.makeXUL('caption','',['label'],[lang_strings.get(a_lang+'.string')])
            );
                                        
            var ctl_id = a_lang+'-dict-url';
            var pref_id = 'pref-' + ctl_id;
                        
            var pref_base = 
                    'extensions.alpheios.' + 
                    a_lang +
                    '.dictionary.full' 
            var pref_base_s = pref_base + '.search';
            // add the preferences for url and lemma
            prefs.appendChild(
                Alph.Util.makePref(
                    pref_id,
                    pref_base_s + URL,
                    'string')
            );
            prefs.appendChild(
                Alph.Util.makePref(
                    pref_id + LEMMA,
                    pref_base_s + LEMMA,
                    'string')
            );
            prefs.appendChild(
                Alph.Util.makePref(
                    pref_id + ID,
                    pref_base_s + ID,
                    'string')
            );
            prefs.appendChild(
                Alph.Util.makePref(
                    pref_id + MULTI,
                    pref_base_s + MULTI,
                    'bool')
            );
                
            var hbox =
                Alph.Util.makeXUL('hbox','',[],[]);
            hbox.appendChild(
                Alph.Util.makeXUL(
                    'label',
                    '',
                    ['control','value'],
                    [ctl_id,strings.getString('dict.url.search')]
                )
            );
            hbox.appendChild(
                Alph.Util.makeXUL(
                    'textbox',
                    ctl_id,
                    ['preference','class'],
                    [pref_id,'url']
                )
            );
             var hbox_lemma =
                Alph.Util.makeXUL('hbox','',[],[]);
            hbox_lemma.appendChild(
                Alph.Util.makeXUL(
                    'label',
                    '',
                    ['control','value'],
                    [ctl_id+LEMMA,
                     strings.getString('dict.url' + LEMMA)]
                )
            );
            hbox_lemma.appendChild(
                Alph.Util.makeXUL(
                    'textbox',
                    ctl_id + LEMMA,
                    ['preference','class'],
                    [pref_id+LEMMA,'param']
                )
            );
            var hbox_id =
                Alph.Util.makeXUL('hbox','',[],[]);
            hbox_id.appendChild(
                Alph.Util.makeXUL(
                    'label',
                    '',
                    ['control','value'],
                    [ctl_id+ID,
                     strings.getString('dict.url' + ID)]
                )
            );
            hbox_id.appendChild(
                Alph.Util.makeXUL(
                    'textbox',
                    ctl_id + ID,
                    ['preference','class'],
                    [pref_id+ID,'param']
                )
            );
            var hbox_multi =
                Alph.Util.makeXUL('hbox','',['align'],['top']);
            hbox_multi.appendChild(
                Alph.Util.makeXUL(
                    'checkbox',
                    ctl_id + MULTI,
                    ['preference','label'],
                    [pref_id+MULTI,strings.getString('dict.url' + MULTI)]
                )
            );
              
            dict_parent.appendChild(hbox);
            dict_parent.appendChild(hbox_id);
            dict_parent.appendChild(hbox_lemma);
            dict_parent.appendChild(hbox_multi);
        }
    },
    
    /**
     * handler which responds to selection of a dictionary name
     * in the dictionary order listboxes
     * 'this' is the listbox element
     * Adapted from chrome://browser/content/preferences/languages.js
     */
    onDictSelect: function()
    {
        var button_col = Alph.$(this).next().get(0);
        if (button_col)
        {
            var upButton = Alph.$("button[id^=up_]",button_col).get(0);
            var downButton = Alph.$("button[id^=down_]",button_col).get(0);
            switch (this.selectedCount) {
            case 0:
              upButton.disabled = downButton.disabled = true;
              break;
            case 1:
              upButton.disabled = this.selectedIndex == 0;
              downButton.disabled = this.selectedIndex == this.childNodes.length - 1;
              break;
            default:
              upButton.disabled = true;
              downButton.disabled = true;            
          }
        }
    },
    
    /**
     * Populates the dictionary order list from preferences
     * @param {String} a_lang the language 
     * @param {String} a_type short or full
     * Adapted from chrome://browser/content/preferences/languages.js
     */
    readDictList: function(a_lang,a_type)
    {
        var lang_strings = Alph.LanguageToolFactory.getStringBundle(a_lang);
        var dictionary_list = 
            Alph.$("#pref-" + a_lang + '-dict-' + a_type).get(0).value;
        
        var listbox = Alph.$("#dict-order-" + a_lang + '-' + a_type).get(0);
        // clear out any current contents of the dictionary order list box
        while (listbox.hasChildNodes())
            listbox.removeChild(listbox.firstChild);
        var selected_index=0;
        // iterate through the new preference value, repopulating the order listbox
        dictionary_list.split(/,/).forEach(
            function(a_dict,a_i)
            {
                var item_id = a_dict + '.' + a_type;
                listbox.appendChild(
                    Alph.Util.makeXUL(
                    'listitem',
                    item_id,
                    ['label'],[lang_strings.get('dict.' + a_dict)])
                );   
                if (item_id == Alph.Prefs.d_selectedDictItem)
                {
                    selected_index = a_i;    
                }
            }
        );
        listbox.selectedIndex = selected_index || 0;
                                                        
    },
    /**
     * Handler which responds to a click on one of the action buttons
     * for ordering a dictionary list
     * 'this' is the button element which was clicked
     * Adapted from chrome://browser/content/preferences/languages.js
     */
    writeDictList: function()
    {
        var button_id = this.id.split(/_/);
        var list = Alph.$(this).parent().prev().get(0);
        if (button_id[0] == 'up')
        {
            var selectedItem = list.selectedItems[0];
            var previousItem = selectedItem.previousSibling;
            var string = "";
            for (var i = 0; i < list.childNodes.length; ++i) 
            {
                var item = list.childNodes[i];
                string += (i == 0 ? "" : ",");
                if (item.id == previousItem.id) 
                    string += selectedItem.id.match(/^(.+)\./)[1];
                else if (item.id == selectedItem.id)
                    string += previousItem.id.match(/^(.+)\./)[1];
                else
                    string += item.id.match(/^(.+)\./)[1];
            }
            Alph.Prefs.d_selectedDictItem = selectedItem.id;

        }
        else if (button_id[0] == 'down')
        {
            var selectedItem = list.selectedItems[0];
            var nextItem = selectedItem.nextSibling;
    
            var string = "";
            for (var i = 0; i < list.childNodes.length; ++i) 
            {
                var item = list.childNodes[i];
                string += (i == 0 ? "" : ",");
                if (item.id == nextItem.id) 
                    string += selectedItem.id.match(/^(.+)\./)[1];
                else if (item.id == selectedItem.id)
                    string += nextItem.id.match(/^(.+)\./)[1];
                else
                    string += item.id.match(/^(.+)\./)[1];
            }
            Alph.Prefs.d_selectedDictItem = selectedItem.id;
        }
        else if (button_id[0] == 'reset')
        {
            var pref = list.getAttribute("preference");
            if (button_id[1] == 'short')
            {
                pref = pref.replace('short','full');
            }
            else
            {
                pref = pref.replace('full','short');
            }
            string = Alph.$("#"+pref).get(0).value;
            Alph.Prefs.d_selectedDictItem = 0;
        }
        else
        {
            return true;
        }
                
        // Update the preference and force a UI rebuild
        var preference = Alph.$("#" + list.getAttribute("preference")).get(0);
        preference.value = string;
        //Alph.Prefs.readDictList(list.id.match(/dict-order-(.*?)-/)[1],button_id[1]);
    },
   
    /**
     * Initialize the site preferences screen
     * populates the language-specific tabs in the Dictionary
     * preferences pane with the default dictionary preference 
     * elements for the language. 
     */
    initSitePrefs: function()
    {
        var strings = document.getElementById("alpheios-prefs-strings");
        var prefs = Alph.$("#alpheios-prefs-sites preferences").get(0);
        var languages = Alph.LanguageToolFactory.getLangList();
        
        // iterate through the languages adding site preferences tabs
        for (var i =0; i<languages.length; i++)
        {
            var lang = languages[i];
            var lang_strings = Alph.LanguageToolFactory.getStringBundle(lang);
            var site_list = null;
            try {site_list = Alph.BrowserUtils.getPref('sites.autoenable',lang);} catch(a_e){}
            // don't add a tab if the preference isn't set
            if (site_list == null)
            {
                continue;
            }
            prefs.appendChild(
                Alph.Util.makePref(
                    'pref-' + lang + '-autoenable-sites',
                    'extensions.alpheios.' + lang + '.sites.autoenable',
                    'string')
                );
            Alph.$("#site-prefs-language-tabs").append(
                Alph.Util.makeXUL(
                    'tab','site-prefs-language-tabs-'+lang,['label'],[lang_strings.get(lang+'.string')])
            );
            var tabpanel = Alph.Util.makeXUL('tabpanel','',[],[])
            var lang_parent = Alph.Util.makeXUL(
                'vbox','site-prefs-language-details-'+lang,[],[]
            );
            Alph.$("#site-prefs-language-details").append(Alph.$(tabpanel).append(lang_parent));
           
            var grid = Alph.Util.makeXUL(
                'grid',
                'alph-site-grid-'+lang,
                [],[]
            );
            var cols = Alph.Util.makeXUL('columns',null,[],[]);
            cols.appendChild(Alph.Util.makeXUL('column',null,['flex'],['1']));
            cols.appendChild(Alph.Util.makeXUL('column',null,[],[]));
            grid.appendChild(cols);
            var rows = Alph.Util.makeXUL('rows',null,[],[]);
            var row = Alph.Util.makeXUL('row',null,[],[])
            var lb_ordered = Alph.Util.makeXUL('listbox',
                'site-list-autoenable-'+lang,
                ['seltype','preference','onsyncfrompreference'],
                ['single','pref-' + lang + '-autoenable-sites',
                'Alph.Prefs.readSiteList("' + lang + '");' 
            ]);
            var button_box = Alph.Util.makeXUL('vbox',null,[],[]);
            button_box.appendChild(
                Alph.Util.makeXUL(
                'button',
                'disable-site',
                ['label','disabled'],
                [strings.getString('sites.buttons.disable'),'true'])
            );
            button_box.appendChild(
                Alph.Util.makeXUL(
                'button',
                'enable-site',
                ['label','disabled'],
                [strings.getString('sites.buttons.enable'),'true'])
            );
            Alph.$(lb_ordered).select(Alph.Prefs.onSiteSelect); 
            row.appendChild(lb_ordered);
            row.appendChild(button_box);
            rows.appendChild(row);
            grid.appendChild(cols);
            grid.appendChild(rows);
            var label = Alph.Util.makeXUL(
                'label',
                null,
                ['value'],
                [strings.getString('site.labels.autoenable')]);
                lang_parent.appendChild(label);
                lang_parent.appendChild(grid);
            Alph.$("button",lang_parent).click(Alph.Prefs.toggleSite);
        }
    },
    
    /**
     * Populates the site list from preferences
     * @param {String} a_lang the language 
     * Adapted from chrome://browser/content/preferences/languages.js
     */
    readSiteList: function(a_lang)
    {
        var lang_strings = Alph.LanguageToolFactory.getStringBundle(a_lang);
        var site_list = 
            Alph.$("#pref-" + a_lang + '-autoenable-sites').get(0).value;
        
        var listbox = Alph.$("#site-list-autoenable-" + a_lang).get(0);
        // clear out any current contents of the list box
        while (listbox.hasChildNodes())
            listbox.removeChild(listbox.firstChild);
        var selected_index=-1;
        
        var key = 'alpheios-auto-enable-'+a_lang;
        site_list.split(/,/).forEach(
            function(a_site,a_i)
            {
      
                var uri = Alph.BrowserUtils.getSvc('IO').newURI(a_site,"UTF-8",null);
                var perm = Alph.PermissionMgr.testPermission(uri,key);
                var status = perm == Alph.PermissionMgr.ALLOW_ACTION ? 'site-enabled' : 'site-disabled';
      
                var item_id = a_lang + '-autoenable-' + a_i;
                listbox.appendChild(
                    Alph.Util.makeXUL(
                    'listitem',
                    item_id,
                    ['label','class'],[a_site,status])
                );   
                if (item_id == Alph.Prefs.d_selectedSiteItem)
                {
                    selected_index = a_i;    
                }
            }
        );
        listbox.selectedIndex = selected_index;
    },
    
    /**
     * Handler which responds to a click on one of the action buttons
     * for enabling/disabling an autoenabled site
     * 'this' is the button element which was clicked
     * Adapted from chrome://browser/content/preferences/languages.js
     */
    toggleSite: function()
    {
        var button_id = this.id;
        var list = Alph.$(this).parent().prev().get(0);
        var selectedItem = list.selectedItems[0];
        var lang = selectedItem.id.match(/^(\w+)-/)[1];
        var key = 'alpheios-auto-enable-'+lang;
        var selectedURL = selectedItem.getAttribute('label');
        var uri = Alph.BrowserUtils.getSvc('IO').newURI(selectedURL,"UTF-8",null); 
        if (button_id == 'enable-site')
        {
            Alph.PermissionMgr.add(uri,key,Alph.PermissionMgr.ALLOW_ACTION);
        }
        else
        {
            Alph.PermissionMgr.add(uri,key,Alph.PermissionMgr.DENY_ACTION);
        }
        Alph.Prefs.d_selectedSiteItem = selectedItem.id;
        // update the site list                     
        Alph.Prefs.readSiteList(lang);
    },
   
    
    /**
     * handler which responds to selection of a site name
     * in the autoenable site listboxes
     * 'this' is the listbox element
     * Adapted from chrome://browser/content/preferences/languages.js
     */
    onSiteSelect: function()
    {
        var button_col = Alph.$(this).next().get(0);
        var lang = this.id.match(/-(\w+)$/)[1];
        var key = 'alpheios-auto-enable-'+lang;
        var selectedItem = this.selectedItem;
        if (this.selectedItem)
        {
            var selectedURL = selectedItem.getAttribute('label');
            var uri = Alph.BrowserUtils.getSvc('IO').newURI(selectedURL,"UTF-8",null);
            var perm = Alph.PermissionMgr.testPermission(uri,key);
            if (button_col)
            {
                var enableButton = Alph.$("button#enable-site",button_col).get(0);
                var disableButton = Alph.$("button#disable-site",button_col).get(0);
                switch (perm) {
                    case Alph.PermissionMgr.ALLOW_ACTION:
                      enableButton.disabled = true;
                      disableButton.disabled = false;
                      break;
                    case Alph.PermissionMgr.DENY_ACTION:
                      enableButton.disabled = false;
                      disableButton.disabled = true;
                      break;
                    default:
                      enableButton.disabled = true;
                      disableButton.disabled = true;            
                    }
            }
        }
    }
};