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
Alph.Quiz =
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
        Alph.MozUtils.load_javascript(template_src,this.query_template);
        this.main_str = params.main_str;
        var query_doc = $("#alph-query-frame").get(0).contentDocument;
        // add the version string 
        $("body",query_doc).prepend('<div id="alph-version-info"></div>');
        var version_string = 
            params.lang_tool.get_string_or_default('alph-version-link',[]);
        if (version_string)
        {
            $("#alph-version-info",query_doc)
                .append('<a href="#" class="alph-version-link alpheios-link">'+ version_string+'</a>')
                .click(
                    function()
                    {
                        Alph.util.open_alpheios_link(window.opener,'release-notes');
                        return false;
                    });
        }

        this.load_query_head(params);
        
        this.add_pofs_query(params);
        this.add_defs_query(params);

        // only present the translation query if the word has an aligned translation
        if (params.type == 'full_query' && params.source_align.length > 0)
        {
            // need to initiate the load of the contextual definitions
            // in a separate thread, after the on load handler has had a 
            // chance to complete. there ought to be a more reliable way
            // of doing this, but I haven't been able to find it.
            setTimeout("Alph.Quiz.load_query_context_defs()",500);
        }
        else
        {
            query_doc = $("#alph-query-frame").get(0).contentDocument;
            this.load_done();
            var translation = params.source_align.length > 0 ? params.aligned_defs.join(' ')
                                                             : params.lang_tool.get_string_or_default('alph-align-nomatch',[]);
            this.on_defs_correct(
                translation,
                params.source_node,$(".alph-query-element",query_doc));
            
        }
     },

     /**
      * displays the elements on the page
      * (to be called once the contextual definitions have finished loading
      * because the elements aren't usuable until that's done.)
      */
     load_done: function()
     {
        var doc = $("#alph-query-frame").get(0).contentDocument;
        $(".alph-query-element .loading",doc).remove();
        $(".alph-select-pofs",doc).css("display","block");
        $(".alph-defs-select,",doc).css("display","block");
        window.focus();
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
        var pofs = $('.alph-pofs',a_params.source_node).attr('context');

        var query_html = 
            '<div class="alph-query-instruct">' +
            '  <button class="alph-query-close alpheios-button">'+
                    Alph.MozUtils.get_string(this.main_str,"alph-query-close") +
            '  </button>' +
             '  <div class="alph-query-context">' +
                    Alph.MozUtils.get_string(this.main_str,"alph-query-header",[src_context]) +
            '  </div>' +
            '</div>\n' +
            '<div class="alph-query-element">' +
            '  <div class="loading">' +
            Alph.MozUtils.get_string(this.main_str,'alph-loading-misc') +
            '  </div>'+
                        '  <div class="alph-query-pofs" />\n' +
            '  <div class="alph-query-defs" />\n' +
            '  <div class="alph-query-infl" style="display:none;">' +
            '    <fieldset class="alph-infl-select">' + 
            '      <legend class="alph-query-header">' +
               Alph.MozUtils.get_string(this.main_str,"alph-query-infl") +
            '      </legend>' + 
            '      <div class="alph-query-hint alpheios-hint"/>' +
            '    </fieldset>' +
            '  </div>\n' +
            '</div>';
        $("#alph-panel-body-template",query_doc).after(query_html);
        $(".alph-query-close",query_doc).click(
            function()
            {
                window.close();
            }
        );
        $("#alph-panel-body-template",query_doc).css('display','none');
        //TODO the tools aren't working here yet, but not sure if we're
        // keeping them on this display 
        
     },
     
     add_pofs_query: function(a_params)
     {
        var query_doc = 
            $("#alph-query-frame").get(0).contentDocument;

        var pofs_list = a_params.lang_tool.getpofs();
        
        var valid_pofs = $('.alph-pofs',a_params.source_node).attr('context');
   
        var select_pofs =
             '<fieldset class="alph-select-pofs" style="display: none;">' + 
             '  <legend class="alph-query-header">' +
                Alph.MozUtils.get_string(this.main_str,"alph-query-pofs") +
            '  </legend>';
            
        pofs_list.forEach(
            function(a)
            {
                select_pofs = select_pofs 
                    + "<label>" 
                    + '<input type="radio" name="alph-select-pofs" value="' + a + '" />' 
                    + a.replace(/_/,' ')
                    + "</label><br/>";
            }
        );
        select_pofs = select_pofs + '</fieldset>';
        $('.alph-query-pofs',query_doc).append(select_pofs);
        $("input[name=alph-select-pofs]",query_doc).click(
            function(e)
            {
                Alph.Quiz.checkPofsSelect(this,a_params.source_node);
                return true;
            }
        );
    },
    
    add_defs_query: function(a_params)
    {
         var query_doc = 
            $("#alph-query-frame").get(0).contentDocument;
            
        var select_defs = 
            '<fieldset class="alph-defs-select" style="display: none;">' + 
             '  <legend class="alph-query-header">' +
                Alph.MozUtils.get_string(this.main_str,"alph-query-defs") +
            '  </legend>' +
            '</fieldset>\n';
        $('.alph-query-defs',query_doc).append(select_defs);
        
    },
    
    /**
     * checks whether the definition selection is currect
     * @param {HTMLSelect} a_select the containing Select element
     * @param {Element} a_src_node 
     */ 
    checkDefsSelect: function(a_elem,a_src_node)
    {
        var selected_value = a_elem.value;
        var selected_text = $(a_elem).parent("label").text();
        var query_parent = $(a_elem).parents('.alph-query-element').get(0); 
        if (selected_value == 'correct')
        {            
            this.on_defs_correct(selected_text,a_src_node,query_parent);
            // if the pofs is already answered,  move on to the inflections
            if ( $(".alph-select-pofs .answer",query_parent).length > 0)
            {
                this.load_query_infl(a_src_node);
            }
         }
         else
         {
            $(a_elem).parent("label").addClass("incorrect");
            $(a_elem).css("display","none");
            //alert(Alph.MozUtils.get_string(this.main_str,"alph-query-incorrect"));
            // TODO - need to check and handle scenario when only correct answer is left
         }
    },
    
    /**
     * function called once the user has correctly identified the definition
     */
    on_defs_correct: function(a_answer,a_src_node,a_query_parent)
    { 
        var legend = 
            '<legend class="alph-query-header">' + 
            Alph.MozUtils.get_string(this.main_str,"alph-query-defs-correct") +
            '</legend>';
        $(".alph-defs-select",a_query_parent)
                .html(legend)
                .append('<label class="answer">' + a_answer + '</label>');                
        $("#alph-word-tools .alph-dict-link",$(a_query_parent).get(0).ownerDocument)
            .css("visibility","visible");
        var short_def_label = Alph.MozUtils.get_string(this.main_str,"alph-short-definition");
        $(".alph-query-defs",a_query_parent).append('<div class="alph-query-dict"/>');
        $(".alph-query-dict",a_query_parent).append(
            '<div class="alpheios-label">' + short_def_label + '</div>');
         // it's possible to have multiple meanings for a single form
        $(".alph-entry",a_src_node).each(
            function()
            {
                $(".alph-query-dict",a_query_parent).append(
                    $(".alph-hdwd",this).clone(true),
                    $(".alph-mean",this).clone(true),
                    $(".alph-dict-source",this).clone(true));
            }
        );
    },
    
    /**
      * checks whether the part of speech selection is correct
      * @param {HTMLSelect} a_select the containing Select element
      */
     checkPofsSelect: function(a_elem,a_src_node)
     {
        // TODO - for now, only looking at the first word in the popup -
        // need to add support for multiple words (and multiple entries per word??)
        var answer = $('.alph-pofs',a_src_node).attr('context');
        var selected_value = a_elem.value;
        if (selected_value == answer)
        {
            var legend = 
                '<legend class="alph-query-header">' + 
                Alph.MozUtils.get_string(this.main_str,"alph-query-pofs-correct") +
                '</legend>';
            $(a_elem).parents("fieldset")
                .html(legend)
                .append('<label class="answer">' + selected_value + '</label>');
            // if the definitions part is already answered,  move on to the inflections
            if ( $(".alph-defs-select .answer",a_elem.ownerDocument).length > 0)
            {
                this.load_query_infl(a_src_node);
            }
        }
        else
        {
            $(a_elem).parent("label").addClass("incorrect");
            $(a_elem).css("display","none");
            //alert(Alph.MozUtils.get_string(this.main_str,"alph-query-incorrect"));
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
                    Alph.Quiz.display_context_defs(a_params,a_pofs);
                },
                function(a_error)
                {
                    
                    Alph.Quiz.display_context_defs(a_params,a_pofs);
                }
            );
        }
        else
        {
            Alph.Quiz.display_context_defs(a_params,a_pofs)
        }
        Alph.Quiz.load_done();
        
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
        
            defs.push(
                '<label><input type="radio" name="alph-defs-select" value="correct"/>' + 
                correct.join(' ') + '</label>');
            
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
                            incorrect.push(
                                '<label><input type="radio" name="alph-defs-select" value="incorrect"/>' + 
                                choice.join(' ') + '</label>'); 
                        }
                    }
                );
                incorrect.sort(Alph.Quiz.sort_random);
                var max = 4;
                if (incorrect.length < max)
                {
                    max = incorrect.length;
                }
                defs = defs.concat(incorrect.slice(0,max)).sort(Alph.Quiz.sort_random);
                
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
                    $(".alph-defs-select",query_doc).append(a_opt + '<br/>');
                }
            );
            $("input[name=alph-defs-select]",query_doc).click(
            function(e)
            {
                Alph.Quiz.checkDefsSelect(this,a_params.source_node);
                return true;
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
                answer = Alph.MozUtils.get_string(this.main_str,"alph-query-defs-not-found");
            }
            this.on_defs_correct(answer,a_params.source_node,$(".alph-query-element",query_doc));
        }
    },
    
    /**
     * Loads the inflection query elements
     * @param {Element} the DOM node for the selected word
     */
    load_query_infl: function(a_src_node)
    {

        var infl_set = $('.alph-infl-set',a_src_node);
        // don't even both to display the form element of the query
        // if we don't have an inflection set
        if (infl_set.length == 0)
        {
            this.on_infl_correct(a_src_node);
            return;
        }
        var parent_doc = $("#alph-query-frame").get(0).contentDocument;
        $('.alph-query-infl',parent_doc).css('display','block').children('.alph-infl-select').addClass("loading");
        var form = $(".alph-word",a_src_node).attr('context');
        var pofs = $('.alph-pofs',a_src_node).attr('context');
        var decls = [];
        $('.alph-decl',a_src_node).each(
            function()
            {
                decls.push($(this).attr('context'));      
            }
        );
        
        
        
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
        var has_infl_query = Alph.Quiz.query_template.make_infl_query(
                $(".alph-infl-select",parent_doc),
                pofs,
                {  form: $('.alph-infl-set',a_src_node).attr('context'),
                   ending: $(".alph-infl-set .alph-suff",a_src_node).eq(0).text() || '-', 
                   attributes: context_list[0],
                   src_node: a_src_node,
                   convert_obj: Alph.convert,
                   lang_tool: window.arguments[0].lang_tool, 
                },
                function() { Alph.Quiz.on_infl_correct(a_src_node) }
            );
        $('.alph-infl-select',parent_doc).removeClass("loading");
        if (! has_infl_query)
        {
            this.on_infl_correct(a_src_node,
                Alph.MozUtils.get_string(this.main_str,"alph-query-infl-missing"));
        }
        else
        {
            try {
                var disclaimer =
                    Alph.MozUtils.get_string($("#alph-infl-strings").get(0),'disclaimer');
                $("#alph-infl-table",parent_doc)
                    .after('<span class="alpheios-hint">' + disclaimer + '</span>');                    
            } 
            catch(a_e){alert(a_e)};
            var text = Alph.MozUtils.get_string(this.main_str,"alph-query-infl-continue",[form]);
            var infl_hint = '';
                // look for a part-of-speech specific hint, and if not defined, use
                // the more general inflection hint
            try 
            {
                infl_hint = 
                    Alph.MozUtils.get_string(this.main_str,"alph-query-infl-hint-"+pofs,
                    [form]);
            }
            catch(a_e)
            {
                infl_hint = 
                    Alph.MozUtils.get_string(this.main_str,"alph-query-infl-hint",
                        [form]);
            } 
            $(".alph-infl-select .alph-query-hint",parent_doc).html(text);
            $('.alph-infl-select',parent_doc).append(
                 '<label><input type="radio" name="do-infl" value="1">' +
                    Alph.MozUtils.get_string(this.main_str,'alph-query-infl-yes') +
                 '</label><br/>\n' +
                 '<label><input type="radio" name="do-infl" value="0">' +
                    Alph.MozUtils.get_string(this.main_str,'alph-query-infl-no') +
                 '</label><br/>\n'
                );
            $('input[name=do-infl]',parent_doc).click(
                function()
                {
                    $(this).parents("fieldset").children("label").remove();
                    if (this.value == 1)
                    {
                        $(".alph-infl-select .alph-query-hint",parent_doc).html(infl_hint);
                        $(".query-table",parent_doc).css("display",'block');
                    }
                    else
                    {
                        Alph.Quiz.on_infl_correct(a_src_node);
                    }
                    Alph.Quiz.resize_window();
                }
            );
        }
        
    },
    
    /**
     * Resizes the window to fit its contents.
     * @private
     */
    resize_window: function() 
    {
        var parent_doc = $("#alph-query-frame").get(0).contentDocument;
        var height = $(".alph-query-element",parent_doc).height();
        var width = $(".alph-query-element",parent_doc).width();
        // take the bigger width of the main query element or the inflection element ..
        // the floated inflection element won't factor into the parent element's width
        var infl_width = $(".alph-infl-select",parent_doc).width();
        if (infl_width > width)
        {
            width = infl_width;
        }
        
        var min_height = 800;
        var min_width = 800;
        
        // resize the window 
        // add a little space to the top
        if (width > window.screen.availWidth) {
            width = window.screen.availWidth - 20; // don't take up the entire screen
        }
        else if (width < min_width)
        {
            width = min_width;
        }
        if (height > window.screen.availHeight) {
            height = window.screen.availHeight - 20; // don't take up the entire screen 
        }
        else if (height < min_height)
        {
            height = min_height;
        }
        window.resizeTo(width,height);
    },
    
    /**
     * Callback executed when the correct inflection details are selected
     * @param {String} a_answer the answer string to be displayed
     */
    on_infl_correct: function(a_src_node,a_message)
    {
        var parent_doc = $("#alph-query-frame").get(0).contentDocument;
        $('.alph-query-infl .alph-query-header',parent_doc)
            .text(Alph.MozUtils.get_string(Alph.Quiz.main_str,"alph-query-infl-correct"));
        $('.alph-query-infl .alph-query-hint',parent_doc).remove();
            
        // clone the entire entry to get any bound events on the child elements
        var entry = $(".alph-entry",a_src_node).clone();
        // remove the hdwd, meaning and the part of speech,
        // keeping any attributes on the part of speech
        $(".alph-hdwd",entry).remove();
        $(".alpheios-label",entry).remove();
        $(".alph-mean",entry).remove();
        $(".alph-dict-source",entry).remove();
        var attr = $(".alph-morph .alph-pofs .alph-attr",entry);
        $(".alph-morph .alph-pofs",entry).html(attr);
        $(".alph-infl-select",parent_doc).prepend(entry);                
        
        // add the grammar links handlers and redo the help tooltips
        window.arguments[0].lang_tool.contextHandler(parent_doc);
        $(".alph-form-end",entry).remove();
        $(".alph-infl-end",entry).remove();
        window.arguments[0].lang_tool.add_infl_help(entry);
        this.quiz_done();
        this.resize_window();
    },
    
    /**
     * random array sort function
     */
    sort_random: function(a,b)
    {
        return (Math.round(Math.random())-0.5);
    },
    
    /**
     * function called when the user is finished with the quiz.
     */
    quiz_done: function()
    {
        var params = window.arguments[0];
        var form = $(".alph-word",params.source_node).attr('context');
        var query_doc = $("#alph-query-frame").get(0).contentDocument;
        /**
         * add further instructions and the word tools to the window
         */

        // get the tools 
        var tools = params.lang_tool.get_tools_for_query(params.source_node);
 
        $(".alph-query-context",query_doc)
            .after('<div class="alph-query-context">' +
                Alph.MozUtils.get_string(this.main_str,'alph-query-done-hint',[form]) +
                '</div>')
            .remove();
        $(".alph-query-instruct",query_doc).append(tools).append('<br/>');
    }
}