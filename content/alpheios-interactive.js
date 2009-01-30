/**
 * @fileoverview This file contains the Alph.interact class with 
 * interactive interface functionality
 * 
 * @version $Id: alpheios-interactive.js 1315 2009-01-12 18:16:37Z BridgetAlmas $
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
     * Check to see if interactive features are enabled
     * @return true if the current level is Alph.main.levels.LEARNER, otherwise false
     * @type boolean
     */
    enabled: function(a_bro)
    {
        return Alph.main.get_state_obj(a_bro).get_var("level") == Alph.main.levels.LEARNER;

    },
    
    /**
      * adds the query elements to the popup
      * @param {Document} a_topdoc the contentDocument which contains the popup
      */
     addQueryElements: function(a_topdoc)
     {
        if (! this.enabled())
        {
            // don't do anything if the interactive features aren't enabled
            return;
        }
        // add a class to the text node to indicate the user's Alpheios level
        Alph.$("#alph-text",a_topdoc).addClass(Alph.main.get_state_obj().get_var("level"));

        var lang_tool = Alph.main.getLanguageTool();
        var str = Alph.$("#alpheios-strings").get(0); 
        var pofs_list = lang_tool.getpofs();
        
        
        var select_pofs = "<select class='alph-query-pofs'>";
        select_pofs = 
            select_pofs + 
            '<option value="">' +
            str.getString("alph-query-pofs") +
            '</option>';
            
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
        var select_infl = 
            '<div class="alph-query-infl" style="display:none;">'+ 
            '<a href="#alph-query-infl">' +
            str.getString("alph-query-infl") +
            '</a></div>';
            
        var query = 
            '<div class="alph-query-element">' + 
            select_pofs +
            select_infl +
            '</div>';
        
        Alph.$(".alph-entry",a_topdoc).after(query);
        Alph.$(".alph-query-pofs",a_topdoc).change(
            function(e)
            {
                Alph.interactive.checkPofsSelect(this);                
            }
        );
        Alph.$(".alph-query-infl",a_topdoc).click(
            function(e)
            {
                Alph.interactive.handleInflClick(e,this,lang_tool);
            }
        );

     },
     
     /**
      * checks whether the part of speech selection is correct
      * @param {HTMLSelect} a_select the containing Select element
      */
     checkPofsSelect: function(a_select)
     {
        var selected_value = a_select.options[a_select.selectedIndex].value;
        var query_parent = Alph.$(a_select).parent('.alph-query-element').get(0); 
        var pofs_set = Alph.$('.alph-pofs',query_parent.previousSibling);
        
        for (var i=0; i<pofs_set.length; i++)
        {
            if (Alph.$(pofs_set[i]).attr('context') == selected_value)
            {
                
                alert(Alph.$("#alpheios-strings").get(0).getString("alph-query-correct"));
                // if they the get the part of speech right, show it 
 
                Alph.$('.alph-pofs',query_parent.previousSibling).css('display','inline');
                // still hide any attributes of the part of speech (to be populated through 
                // interaction with the inflection tables) 
                Alph.$('.alph-pofs .alph-attr',query_parent.previousSibling)
                    .css('display','none');
                Alph.$(a_select).hide();
                // show the inflection query element
                Alph.$('.alph-query-infl',query_parent).css('display','block');
                break;
            }
            else
            {
                alert(Alph.$("#alpheios-strings").get(0).getString("alph-query-incorrect"));
                // remove the incorrect answer from the list of options
                Alph.$(a_select.options[a_select.selectedIndex]).remove();
                // TODO - need to check and handle scenario when only correct answer is left
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
        a_lang_tool.handleInflections(a_event,text_node,infl_params);
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