/**
 * @fileoverview Functionality for the interactive query window
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
 * 
 * Morpheus is from Perseus Digital Library http://www.perseus.tufts.edu
 * and is licensed under the Mozilla Public License 1.1. 
 * You should have received a copy of the MPL 1.1
 * along with this program. If not, see http://www.mozilla.org/MPL/MPL-1.1.html.
 * 
 * The Smyth Grammar and LSJ Meanings come from the Perseus Digital Library
 * They are licensed under Creative Commons NonCommercial ShareAlike 3.0
 * License http://creativecommons.org/licenses/by-nc-sa/3.0/us
 */

/**
 * @singleton
 */
Alph_Inter =
{

    main_str: null,
    
    /**
     * load data into the interactive querying window
     */
     load_query_window: function()
     {
        this.query_template = {};
        
        var params = window.arguments[0];

        var template_src = 
            "chrome://"
                + params.lang_tool.getchromepkg()
                + "/content/query/template.js";
        Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
          .getService(Components.interfaces.mozIJSSubScriptLoader)
          .loadSubScript(template_src,this.query_template);
        this.main_str = params.main_str;
        this.load_query_head(params);
        
        if (params.type == 'full_query')
        {
            this.add_pofs_query(params);
            this.add_defs_query(params);
        }
        else if (params.type == 'infl_query')
        {
            var query_doc = $("#alph-query-frame").get(0).contentDocument;
            this.add_pofs_query(params);
            this.on_defs_correct(
                params.aligned_defs.join(' '),params.source_node,$(".alph-query-element",query_doc));
            $('.alph-query-defs',query_doc).css('display','block');
        }
     },

     load_query_head: function(a_params)
     {
        var query_doc = 
            $("#alph-query-frame").get(0).contentDocument;

        var lang_css_url =  
            "chrome://"
            + a_params.lang_tool.getchromepkg()
            + "/content/query/template.css";

        $("head",query_doc).append(
            '<link type="text/css" rel="stylesheet" href="chrome://alpheios/skin/alpheios.css"/>' +
            '<link type="text/css" rel="stylesheet" href="chrome://alpheios/skin/alph-query.css"/>' +
            '<link type="text/css" rel="stylesheet" href="' + lang_css_url + '"/>'            
        );
        
        var src_context = $(".alph-word",a_params.source_node).attr('context');
        var query_html = 
            '<div class="alph-query-context">' + src_context + '</div>' +
            '<div class="alph-query-element">' + 
            '  <div class="alph-query-pofs">\n' +
            '    <div class="alph-query-header">' +
                this.main_str.getFormattedString("alph-query-pofs",[src_context]) +
            '    </div>\n' +
            '  </div>\n' +
            '  <div class="alph-query-defs" style="display:none;">' +
            '    <div class="alph-query-header">' +
               this.main_str.getFormattedString("alph-query-defs",[src_context]) +
            '    </div>\n' +
            '  </div>\n' +
            '<div class="alph-query-infl" style="display:none;">' +
            '    <div class="alph-query-header">' +
               this.main_str.getFormattedString("alph-query-infl",[src_context]) +
            '    </div>\n' +
            '    <div class="alph-query-hint">' + 
               this.main_str.getFormattedString("alph-query-infl-hint",[src_context]) +
            '    </div>\n' +
            '    <div class="answer"/>' +
            '  </div>\n' +
            '</div>\n';
        $("#alph-panel-body-template",query_doc).after(query_html);
        $("#alph-panel-body-template",query_doc).css('display','none');
        //TODO the tools aren't working here yet, but not sure if we're
        // keeping them on this display 
        var tools = $("#alph-word-tools",a_params.source_node).clone(true);
        $(".alph-query-context",query_doc).prepend(tools);
     },
     
     add_pofs_query: function(a_params)
     {
        var query_doc = 
            $("#alph-query-frame").get(0).contentDocument;

        var pofs_list = a_params.lang_tool.getpofs();
        
        var valid_pofs = $('.alph-pofs',a_params.source_node).attr('context');
   
        var select_pofs =
            "<select class='alph-select-pofs'>" + 
            '<option value="">---</option>';
            
        pofs_list.forEach(
            function(a)
            {
                select_pofs = select_pofs 
                    + "<option value='"
                    + a
                    + "'>"
                    + a
                    + "</option>";
            }
        );
        select_pofs = select_pofs + '</select>';
        $('.alph-query-pofs',query_doc).append(select_pofs);
        $(".alph-select-pofs",query_doc).change(
            function(e)
            {
                Alph_Inter.checkPofsSelect(this,a_params.source_node);
                return true;
            }
        );
    },
    
    add_defs_query: function(a_params)
    {
         var query_doc = 
            $("#alph-query-frame").get(0).contentDocument;
            
        var select_defs = 
            '<div class="loading">' +
            this.main_str.getString('alph-loading-misc') +
            '</div>\n' +
            '<select class="alph-defs-select">\n' +
            '<option value="">---</option>\n' + 
            '</select>\n';

        $('.alph-query-defs',query_doc).append(select_defs);       
        $(".alph-defs-select",query_doc).change(
            function(e)
            {
                Alph_Inter.checkDefsSelect(this,a_params.source_node);
                return true;
            }
        );
    },
    
    /**
     * checks whether the definition selection is currect
     * @param {HTMLSelect} a_select the containing Select element
     * @param {Element} a_src_node 
     */ 
    checkDefsSelect: function(a_select,a_src_node)
    {
        var selected_value = a_select.options[a_select.selectedIndex].value;
        var selected_text = a_select.options[a_select.selectedIndex].text;
        var query_parent = $(a_select).parents('.alph-query-element').get(0); 
        if (selected_value == 'correct')
        {            
            this.on_defs_correct(selected_text,a_src_node,query_parent);
            this.load_query_infl(a_src_node);
         }
         else
         {
            alert(this.main_str.getString("alph-query-incorrect"));
            // remove the incorrect answer from the list of options
            $(a_select.options[a_select.selectedIndex]).remove();
            // TODO - need to check and handle scenario when only correct answer is left
         }
    },
    
    /**
     * function called once the user has correctly identified the definition
     */
    on_defs_correct: function(a_answer,a_src_node,a_query_parent)
    { 
        $('.alph-query-defs select',a_query_parent).css('display','none');
        $('.alph-query-defs .alph-query-header',a_query_parent)
            .text(this.main_str.getString("alph-query-defs-correct"));
        $('.alph-query-defs',a_query_parent)
                .append('<div class="answer">' + a_answer + '</div>');
                
        var dict_link = $("#alph-word-tools .alph-dict-link",a_src_node).clone(true);
        var short_def_label = this.main_str.getString("alph-short-definition");
        $(".alph-query-defs",a_query_parent).append('<div class="alph-query-dict"/>');
        $(".alph-query-dict",a_query_parent).append(
                dict_link,
                '<div class="alpheios-label">' + short_def_label + '</div>',
                $(".alph-hdwd",a_src_node).clone(true),
                $(".alph-mean",a_src_node).clone(true));
    },
    
    /**
      * checks whether the part of speech selection is correct
      * @param {HTMLSelect} a_select the containing Select element
      */
     checkPofsSelect: function(a_select,a_src_node)
     {
        var selected_value = a_select.options[a_select.selectedIndex].value;
        var query_parent = $(a_select).parents('.alph-query-element').get(0);
        // TODO - for now, only looking at the first word in the popup -
        // need to add support for multiple words (and multiple entries per word??)
        var answer = $('.alph-pofs',a_src_node).attr('context');
        
        if (selected_value == answer)
        {
            $(a_select).css('display','none');
            
            $('.alph-query-pofs .alph-query-header',query_parent)
                .text(this.main_str.getString("alph-query-pofs-correct"));

            $('.alph-query-pofs',query_parent)
                    .append('<div class="answer">' + selected_value + '</div>');
            // if the definitions part is already displayed,  move on to the inflections
            if ( $(".alph-query-defs .answer",query_parent).length == 1)
            {
                this.load_query_infl(a_src_node);
            }
            else
            {
                $('.alph-query-defs',query_parent).css('display','block');
                // execute the call to load the query definitions in a thread
                // because it can take a little while .. postpone the call
                // by a few milliseconds so the loading message has time to
                // display
                setTimeout(Alph_Inter.load_query_context_defs,50);
            }
        }
        else
        {
            alert(this.main_str.getString("alph-query-incorrect"));
            // remove the incorrect answer from the list of options
            $(a_select.options[a_select.selectedIndex]).remove();
            // TODO - need to check and handle scenario when only correct answer is left
        }
        return false;
     },

     /**
      * Load the contextual definitions (from the alignment) for the selected word
      * This should be called in a separate thread, as it may take a little while to 
      * process the aligned sentence.
      */
     load_query_context_defs: function()
     {
        var a_params = window.arguments[0];
        var a_pofs = $('.alph-pofs',a_params.source_node).attr('context');
        // Load the aligned translation translation document 
        // if it hasn't already been loaded for this document
        // can't use jQuery for ajax request because the document
        // might be in the chrome
        if ($("#alpheios-context-defs",a_params.source_node.ownerDocument).length == 0)
        {
            // add container for the alignment data to the source document
            $("body",a_params.source_node.ownerDocument)
                    .append('<div id="alpheios-context-defs" style="display:none;"/>');
            var align_doc = 
                window.opener.
                Alph.site.load_alignment(a_params.source_node.ownerDocument,
                function(a_align_doc)
                {
                    $(".alpheios-aligned-word",a_align_doc).each
                    (   
                        function()
                        {
                            // clone the aligned word elements,
                            // and move their ids to a new attribute
                            // to avoid clashing with any ids in the source
                            // document
                            var new_elem = $(this).clone();
                            var old_id = $(new_elem).attr('id');
                            $(new_elem).attr('alph-align-id',old_id);
                            $(new_elem).attr('id','');
                            $("#alpheios-context-defs",a_params.source_node.ownerDocument)    
                            .append(new_elem);
                        }
                    );
                    Alph_Inter.display_context_defs(a_params,a_pofs);
                },
                function(a_error)
                {
                    
                    Alph_Inter.display_context_defs(a_params,a_pofs);
                }
            );
        }
        else
        {
            Alph_Inter.display_context_defs(a_params,a_pofs)
        }
        
    },                        

    display_context_defs: function(a_params,a_pofs)
    {
        var query_doc = $("#alph-query-frame").get(0).contentDocument;
        var src_doc = a_params.source_node.ownerDocument;
        var defs = [];
        // if we can't find any contextual definitions, just 
        // hide the query and display the short definition
        if ($("#alpheios-context-defs .alpheios-aligned-word",src_doc).length > 0)
        {
            var correct = [];
        
            a_params.source_align.forEach(
                function(a_id)
                {
                    correct.push( 
                        $("#alpheios-context-defs .alpheios-aligned-word[alph-align-id=" +
                        a_id + "]",src_doc).text()
                    );                      
                }
            );
        
            defs.push('<option value="correct">' + correct.join(' ') + '</option>');
            
            try 
            {
                var src_word = 
                    $(a_params.target.getRangeParent()).parents('.alpheios-aligned-word')
                    .get(0);
                var s_num = src_word.id.match(/^(s(\d+)_)/)[1];
                
                var incorrect = [];
                // get the rest of the words from selected sentence and their 
                // alignments to use as incorrect choices
                $(".alpheios-aligned-word[id ^= "+ s_num + "]",src_doc).each(
                    function()
                    {
                        if ((this.id != src_word.id) && $(this).attr("nrefs"))
                        {
                            var choice = [];
                            $(this).attr("nrefs").split(/\s|,/).forEach(
                                function(a_id)
                                {
                                    choice.push(
                                      $("#alpheios-context-defs " + 
                                        ".alpheios-aligned-word[alph-align-id=" +a_id + "]",src_doc)
                                        .text());
                                }
                            );
                            incorrect.push('<option value="incorrect">' + choice.join(' ') + '</option>'); 
                        }
                    }
                );
                incorrect.sort(Alph_Inter.sort_random);
                var max = 4;
                if (incorrect.length < max)
                {
                    max = incorrect.length;
                }
                defs = defs.concat(incorrect.slice(0,max)).sort(Alph_Inter.sort_random);
                
            }
            catch(a_e)
            {
                //alert("Can't find aligned defs:" + a_e);
            }
        }            
        
        if (defs.length > 0)
        {
            defs.forEach(
                function(a_opt)
                {
                    $(".alph-defs-select",query_doc).append(a_opt);
                }
            );
        }
        else
        {
            // if we can't come up with a list of choices for the definition
            // show the correct answer (if we have it, or an error if not)
            var answer = '';
            if (defs.length == 1 && defs[0].indexOf('value="correct"') > 0)
            {
                answer = defs[0].match(/>(.*?)</)[1];
            }
            else
            {
                answer = this.main_str.getString("alph-query-defs-not-found");
            }
            this.on_defs_correct(answer,a_params,$(".alph-query-element",query_doc));
        }
        $(".alph-query-defs .loading",query_doc).remove();
        
    },
    
    /**
     * Loads the inflection query elements
     * @param {Element} the DOM node for the selected word
     */
    load_query_infl: function(a_src_node)
    {

        var parent_doc = $("#alph-query-frame").get(0).contentDocument;
        $('.alph-query-infl',parent_doc).css('display','block');
        var pofs = $('.alph-pofs',a_src_node).attr('context');
        var decls = [];
        $('.alph-decl',a_src_node).each(
            function()
            {
                decls.push($(this).attr('context'));      
            }
        );
        
        var infl_set = $('.alph-infl-set',a_src_node);
        
        var context_list = [];

        var base_ctx = 
        {
            // skip conjugation for now -- may add back in later
            //'alph-conj': $('.alph-conj',query_parent.previousSibling).attr('context')
            'alph-decl' : decls.join('|')
        }
        $('.alph-infl',infl_set).each(
            function()
            {
                var context = $.extend({},base_ctx);
                context['alph-num'] = $('.alph-num',this).attr('context');
                context['alph-gend'] = $('.alph-gend',this).attr('context');
                context['alph-tense'] = $('.alph-tense',this).attr('context');
                context['alph-voice'] = $('.alph-voice',this).text();
                context['alph-pers'] = $('.alph-pers',this).attr('context');
                context['alph-mood'] = $('.alph-mood',this).attr('context');
                
                // one inflection set may contain many cases
                var cases = $('.alph-case',this);
                if (cases.length > 0)
                {
                    $(cases).each(
                        function()
                        {
                            var case_ctx = 
                                $.extend({},context);
                            
                            //  context is in form <case>-<num>-<gend>-<pofs>
                            var atts = $(this).attr('context').split(/-/);
                            case_ctx['alph-case'] = atts[0];
                            case_ctx['alph-num'] = atts[1];
                            case_ctx['alph-gend'] = atts[2];
                            context_list.push(case_ctx)
                        }                            
                    );
                }    
                else
                {
                    context_list.push(context);
                }
            }
        );
        
        // TODO just use the first inflection set for now - if used with
        // treebanked text there should only be one set, but we may eventually
        // need to handle the case where more the one possible answer exists
        // for other uses
        var has_infl_query = Alph_Inter.query_template.make_infl_query(
                $(".alph-query-element",parent_doc),
                pofs,
                {  form: $('.alph-infl-set',a_src_node).attr('context'),
                   ending: $(".alph-infl-set .alph-suff",a_src_node).text() || '-', 
                   attributes: context_list[0]
                },
                function() { Alph_Inter.on_infl_correct(a_src_node) }
            );
        if (! has_infl_query)
        {
            this.on_infl_correct(a_src_node,
                this.main_str.getString("alph-query-infl-missing"));
        }
        this.resize_window();
    },
    
    /**
     * Resizes the window to fit its contents.
     * @private
     */
    resize_window: function() 
    {
        // TODO resize the window to fit the contents 
    },
    
    /**
     * Callback executed when the correct inflection details are selected
     * @param {String} a_answer the answer string to be displayed
     */
    on_infl_correct: function(a_src_node,a_message)
    {
        var parent_doc = $("#alph-query-frame").get(0).contentDocument;
        $('.alph-query-infl .alph-query-header',parent_doc)
            .text(Alph_Inter.main_str.getString("alph-query-infl-correct"));
        if (typeof a_message == 'string')
        {
            $('.alph-query-infl .alph-query-hint',parent_doc)
            .text(a_message);
        }
        else
        {
            $('.alph-query-infl .alph-query-hint',parent_doc)
            .remove();
        
        }
        // clone the entire entry to get any bound events on the child elements
        var entry = $(".alph-entry",a_src_node).clone();
        // remove the hdwd, meaning and the part of speech,
        // keeping any attributes on the part of speech
        $(".alph-hdwd",entry).remove();
        $(".alpheios-label",entry).remove();
        $(".alph-mean",entry).remove();
        var attr = $(".alph-morph .alph-pofs .alph-attr",entry);
        $(".alph-morph .alph-pofs",entry).html(attr);
        $(".alph-query-infl .answer",parent_doc).append(entry);
        window.arguments[0].lang_tool.contextHandler(parent_doc);
    },
    
    /**
     * random array sort function
     */
    sort_random: function(a,b)
    {
        return (Math.round(Math.random())-0.5);
    }
}