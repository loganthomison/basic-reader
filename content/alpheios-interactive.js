/**
 * @fileoverview This file contains the Alph.interact class with 
 * interactive interface functionality
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

/**
 * @singleton
 */
Alph.interactive = {


    /**
     * Check to see if the query window is currently visible
     */
    query_visible: function(a_bro)
    {
        var query_win =
            Alph.main.get_state_obj(a_bro).get_var("windows")['alph-query-window'];
        return (query_win != null && ! query_win.closed);
    },
    
    /**
     * Check to see if interactive features are enabled
     * @return true if the current level is Alph.main.levels.LEARNER, otherwise false
     * @type boolean
     */
    enabled: function(a_bro)
    {
        return Alph.main.get_mode() == Alph.main.levels.LEARNER;

    },
    
    /**
      * Opens a new window with the query display 
      * @param {Document} a_topdoc the contentDocument which contains the popup
      */
     openQueryDisplay: function(a_topdoc,a_target)
     {
        if (! this.enabled())
        {
            // don't do anything if the interactive features aren't enabled
            return;
        }
        
        var lang_tool = Alph.main.getLanguageTool();
        var str = Alph.$("#alpheios-strings").get(0)
        
        var source_align = Alph.$(a_target.getRangeParent()).parents().attr('nrefs');
        if (source_align)
        {
            source_align = source_align.split(/\s|,/);
        }
        var params =
        {
            lang_tool: lang_tool,
            main_str: str,
            source_node: Alph.$(".alph-word",a_topdoc).get(0),
            source_align: source_align || [],
            transform: Alph.xlate.transform,

        }
        // if the translation panel is open, offer interactive identification
        // of definitions, unless the dependency tree display was the source of the
        // selection
        if (Alph.main.panels['alph-trans-panel'].is_visible_inline()
            && Alph.$("#dependency-tree",a_topdoc).length == 0 )
        {
            var selected_word = Alph.$(".alph-word",a_topdoc).attr("context");
            var src_lang = lang_tool.source_language; 
            Alph.$("#alph-window",a_topdoc).addClass("alpheios-inline-query");
            Alph.$("#alph-window #alph-text",a_topdoc).append(
                '<div id="alph-inline-query-instruct">' +
                '<span class="alph-inline-query-word ' + src_lang + '">' 
                + selected_word + ': </span>' +
                str.getString("alph-inline-query-instruct") +
                '</div>' +
                '<div id="alph-inline-query-correct">'+
                '<span class="alph-inline-query-heading">' +
                str.getString("alph-inline-query-correct") +
                '</span>' +
                '</div>' +
                '<div id="alph-inline-query-incorrect">'+
                '<span class="alph-inline-query-heading">' +
                str.getString("alph-inline-query-incorrect") +
                '</span>' +
                '</div>'
            );

            params.type = 'infl_query';
            params.aligned_ids = [];
            params.aligned_defs = [];
            Alph.main.panels['alph-trans-panel'].enable_interactive_query(params);
            
        }
        else
        {
            // hide the popup
            Alph.$("#alph-window",a_topdoc).css("display","none");
            params.type = 'full_query';
                
            var sentence = 
                Alph.$.map(
                    Alph.$('.alpheios-aligned-word',a_topdoc),
                    function(a) { return Alph.$(a).text() })
                .join(' ');
            Alph.util.log("Sentence: " + sentence);
    
            params.sentence = sentence;
            
            Alph.util.log("Sentence: " + params.sentence);
    
            params.target= new Alph.SourceSelection();
            params.target.setWord(sentence);
            params.target.setWordStart(0);
            params.target.setWordEnd(sentence.length -1);
            params.target.setContext(sentence);
            params.target.setContextPos(0);
            lang_tool.handleConversion(params.target);
    
            Alph.util.log("Target: " + params.target.getWord());
            this.openQueryWindow(params);
        }
     },
     
     
     /**
      * open the query window
      */
     openQueryWindow: function(a_params)
     {
        var features =
            {
                chrome: "yes",
                dialog: "no",
                resizable: "yes",
                width: "1024",
                height: "800",
                scrollbars: "yes"
            };
        var query_win = 
              Alph.xlate.openSecondaryWindow(
              "alph-query-window",
              "chrome://alpheios/content/query/alpheios-query.xul",
              features,  
              a_params
            );
     },
     
     /**
      * Response to a click on an aligned word
      */
     checkAlignedSelect: function(a_event)
     {
        // event handler so 'this' is the element that was clicked on or selected
        var selection = this;
        
        // make each word in the alignment only selectable once
        Alph.$(selection).unbind('click',Alph.interactive.checkAlignedSelect);
        
        var params = a_event.data;
        
        var selected_id = Alph.$(selection).attr("id");
        
        var matched = false;
        params.source_align.forEach(
            function(a_id)
            {
                if (selected_id == a_id)
                {
                    params.aligned_ids.push(selected_id);
                    params.aligned_defs.push(Alph.$(selection).text());
                    matched = true;
                }
            }
        );
     
        if (! matched)
        {
            //alert("Try again");
        }
        else if (params.aligned_ids.length < params.source_align.length)
        {
            //alert("Correct, but more selections are needed");
        }
        
        if (params.aligned_ids.length == params.source_align.length)
        {
            Alph.$("#alph-window",params.source_node.ownerDocument).css("display","none");
            Alph.interactive.openQueryWindow(params);
        }
        else
        {
            if (matched)
            {
                Alph.$("#alph-inline-query-correct",params.source_node.ownerDocument)
                    .append('<span>' + Alph.$(selection).text() + '</span>')
                    .addClass("alph-align-answer");
            }
            else
            {
                Alph.$("#alph-inline-query-incorrect",params.source_node.ownerDocument)
                    .append('<span>' + Alph.$(selection).text() + '</span>')
                    .addClass("alph-align-answer");
            }
        }
     },
     /**
      * Responds to a click on the link to identify the inflection. Opens the inflection
      * table window in query mode.
      * @param {Event} a_event the click event
      * @param {Element} the element which was clicked
      * @param {Alph.LanguageTool} the LanguageTool being used to provide the answers
      */
     handleInflClick: function(a_event,a_link,a_lang_tool)
     {
        
        var query_parent = Alph.$(a_link).parent('.alph-query-element').get(0); 
        var pofs_set = Alph.$('.alph-pofs',query_parent.previousSibling);
        var infl_set = Alph.$('.alph-infl-set',query_parent.previousSibling);
        var text_node = Alph.$(a_link).parents('#alph-text');
        
        var context_list = [];

        var base_ctx = 
        {
            // skip declension and conjugation for now -- may add back in later
            //'alph-decl': Alph.$('.alph-decl',query_parent.previousSibling).attr('context'),
            //'alph-conj': Alph.$('.alph-conj',query_parent.previousSibling).attr('context')
        }
        Alph.$('.alph-infl',infl_set).each(
            function()
            {
                var context = Alph.$.extend({},base_ctx);
                context['alph-num'] = Alph.$('.alph-num',this).attr('context');
                context['alph-gend'] = Alph.$('.alph-gend',this).attr('context');
                context['alph-tense'] = Alph.$('.alph-tense',this).attr('context');
                context['alph-voice'] = Alph.$('.alph-voice',this).attr('context');
                context['alph-pers'] = Alph.$('.alph-pers',this).attr('context');
         
                // one inflection set may contain many cases
                var cases = Alph.$('.alph-case',this);
                if (cases.length > 0)
                {
                    Alph.$(cases).each(
                        function()
                        {
                            var case_ctx = 
                                Alph.$.extend({},context);
                            
                            //  context is in form <case>-<num>-<gend>-<pofs>
                            var atts = Alph.$(this).attr('context').split(/-/);
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
        
        var infl_params = 
        {
            query_mode: true,
            showpofs:   pofs_set.attr('context'),
            infl_set_contexts: context_list,   
            query_parent: query_parent.previousSibling
        };
        //a_lang_tool.handleInflections(a_event,text_node,infl_params);
     },
     
    /**
     * Check whehter a selected inflection is correct
     * @param {Element} a_ending the HTML element containing the inflected form or ending
     * @param {Object} a_params the params object that was passed to the inflection table
     *                          window (which contains all the context for the window)
     * @return true if the selection was correct, otherwise false
     * @type boolean
     */
     checkInflection: function(a_ending,a_params)
     {
        // iterate through valid contexts for the source term,
        // and if the context of the selected inflection  matches one
        // then it is a correct answer
        var correct = false;

        // get rid of any trailing - on the context
        var a_context = Alph.$(a_ending).attr('context').replace(/-$/,'');
        
        var selected_atts = a_context.split(/-/);
        var num_atts = selected_atts.length;
        
        for (var j=0; j<a_params.infl_set_contexts.length; j++) 
        {
            var a_ctx = a_params.infl_set_contexts[j];
            
            var matched_atts = 0;
            for (var i=0; i<num_atts; i++)
            {
                var att = selected_atts[i].split(/:/);
                var att_name = 'alph-' + att[0];
                if (typeof a_ctx[att_name] != 'undefined' &&
                    a_ctx[att_name] == att[1])
                {
                    matched_atts++;
                }
                
            }   
            if (matched_atts == num_atts)
            {
                correct = true;
                break;
            }
            
        }
        if (correct)
        {
            alert(Alph.$("#alpheios-strings").get(0).getString("alph-query-correct"));
            Alph.$('.alph-decl',
                a_params.query_parent).css('display','inline');
            Alph.$('.alph-conj',
                a_params.query_parent).css('display','inline');
            Alph.$('.alph-infl-set',
                a_params.query_parent).css('display','block');
            Alph.$('.alph-pofs .alph-attr',a_params.query_parent)
                    .css('display','inline');
            Alph.$('.alph-entry *',a_params.query_parent).show();
            Alph.$('.alph-query-infl',a_params.query_parent.nextSibling).css('display','none');
            
            return true;
        }
        else
        {
            alert(Alph.$("#alpheios-strings").get(0).getString("alph-query-incorrect"));
            Alph.$(a_ending).addClass('incorrect');
            return false;
        }    
     }
}