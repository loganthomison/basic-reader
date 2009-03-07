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
            this.do_full_query(params);
        }
        else if (params.type == 'infl_query')
        {
            this.do_infl_query(params);
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
        
        var src_context = $(a_params.source_node).attr('context');
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
               this.main_str.getString("alph-query-infl") +
            '    </div>\n' +
            '    <div class="answer"/>' +
            '  </div>\n' +
            '</div>';
        $("#alph-panel-body-template",query_doc).after(query_html);
        $("#alph-panel-body-template",query_doc).css('display','none');
     },
     
     do_infl_query: function(a_params)
     {

        var query_doc = 
            $("#alph-query-frame").get(0).contentDocument;

        var valid_pofs = $('.alph-pofs',a_params.source_node).attr('context');
        
        $('.alph-query-pofs',query_doc)
                    .append('<div class="answer">' + valid_pofs + '</div>');
        
        $('.alph-query-defs',query_doc)
            .append('<div class="answer">' 
                + a_params.aligned_defs.join(' ')
                + '</div>').css('display','block');
        
        $('.alph-query-infl',query_doc).css('display','block');
        
        this.load_query_infl(a_params.source_node);        
     },
     
     do_full_query: function(a_params)
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
        
        this.load_query_short_defs(a_params, valid_pofs);
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
        if (selected_value == $(a_src_node).attr('context') ||
            selected_text == $('.alph-mean',a_src_node).text()
            )
        {
            $(a_select).css('display','none');
            $('.alph-query-defs',query_parent)
                .append('<div class="answer">' + selected_text + '</div>');
            
            $('.alph-query-infl',query_parent).css('display','block');
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
            $('.alph-query-pofs',query_parent)
                    .append('<div class="answer">' + selected_value + '</div>');
            $('.alph-query-defs',query_parent).css('display','block');
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
      * query short definitions
      * @param {Object} a_params the window parameters
      * @param {String} a_pofs the correct part of speech
      */
     load_query_short_defs: function(a_params,a_pofs)
     {
        var my_obj = this;
        
        var doc = $("#alph-query-frame").get(0).contentDocument;
        
        a_params.lang_tool.lexiconLookup( 
            a_params.target,
            function(a_xml)
            {
                var result_html = a_params.transform(a_xml);
                
                // handle empty results
                if ( (result_html == '')
                    || (($(".alph-entry",result_html).size() == 0)
                    && ($(".alph-unknown",result_html).size() == 0)
                    && ($(".alph-error",result_html).size() == 0)))
                    
                {
                        // TODO - handle empty query results
                }
                else
                {
                    $(".alph-query-defs .loading",doc).css('display','none');
                    a_params.lang_tool.postTransform(result_html);
                    

                    var words = $("div.alph-word",result_html).get();
                    
                    // HACK to add some test definitions to the list for now
                    // TODO figure out exactly where the definitions should come from
                    var test_defs = my_obj.query_template.TEMPLATE[a_pofs].test_defs;
                    if (typeof test_defs == "undefined")
                    {
                        test_defs = []
                    }
                    
                    test_defs.forEach(
                        function(a_def)
                        {
                            words.push(a_def);
                        }
                            
                    );
                    //END HACK
                    
                    // TODO - unique isn't working here
                    var unique_words = $.unique(words);
                    unique_words.sort( Alph_Inter.sort_random ); 
                       
                    unique_words.forEach(
                        function(a_word)
                        {
                            var pofs = $('.alph-pofs',a_word).attr('context')
                                || a_pofs;
                            if (pofs == a_pofs)
                            {
                                var context = $(a_word).attr("context") || a_word;
                                var mean = $('.alph-mean',a_word).text() || a_word;
                                if (mean != '')
                                {
                                    $(".alph-defs-select",doc).append(
                                        '<option value="' + 
                                        context +
                                        '">' + 
                                        mean +
                                        '</option>'
                                    );
                                }
                            }
                        }
                    );
                }
            },
            function(a_msg)
            {       
                $('.alph-defs-select',doc).after('<div class="error">' + a_msg + "</div>");
            }
        );
    },
    
    /**
     * Loads the inflection query elements
     * @param {Element} the DOM node for the selected word
     */
    load_query_infl: function(a_src_node)
    {

        var parent_doc = $("#alph-query-frame").get(0).contentDocument;
        var pofs = $('.alph-pofs',a_src_node).attr('context'); 
        
        var infl_set = $('.alph-infl-set',a_src_node);
        
        var context_list = [];

        var base_ctx = 
        {
            // skip declension and conjugation for now -- may add back in later
            //'alph-decl': $('.alph-decl',query_parent.previousSibling).attr('context'),
            //'alph-conj': $('.alph-conj',query_parent.previousSibling).attr('context')
        }
        $('.alph-infl',infl_set).each(
            function()
            {
                var context = $.extend({},base_ctx);
                context['alph-num'] = $('.alph-num',this).attr('context');
                context['alph-gend'] = $('.alph-gend',this).attr('context');
                context['alph-tense'] = $('.alph-tense',this).text();
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
        Alph_Inter.query_template.make_infl_query(
                $(".alph-query-element",parent_doc),
                pofs,
                {  form: $('.alph-infl-set',a_src_node).attr('context'),
                   attributes: context_list[0]
                },
                Alph_Inter.on_infl_correct
                
                
            );
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
    on_infl_correct: function(a_answer_string)
    {
        var parent_doc = $("#alph-query-frame").get(0).contentDocument;
        $(".alph-query-infl .answer",parent_doc)
            .text(a_answer_string);
     
    },
    
    /**
     * random array sort function
     */
    sort_random: function(a,b)
    {
        return (Math.round(Math.random())-0.5);
    }
}