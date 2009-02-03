Alph_Inter =
{

    main_str: null,
    
    /**
     * load data into the interactive querying window
     */
     load_query_window: function()
     {
        var params = window.arguments[0];
      
        this.main_str = params.main_str;
        
        if (params.type == 'full_query')
        {
            this.load_full_query(params);
        }
     },
     
     
     load_full_query: function(a_params)
     {
        var query_doc = 
            $("#alph-query-frame").get(0).contentDocument;
        
        $("head",query_doc).append(
            '<link type="text/css" rel="stylesheet" href="chrome://alpheios/skin/alpheios.css"/>' +
            '<link type="text/css" rel="stylesheet" href="chrome://alpheios/skin/alph-query.css"/>'
        );

        var pofs_list = a_params.lang_tool.getpofs();
        
        
        var select_pofs =
            "<div class='alph-query-pofs'>" + 
            "<div class='alph-query-header'>" +
            this.main_str.getString("alph-query-pofs") +
            "</div>" +
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
        select_pofs = select_pofs + '</select></div>';
        var select_defs = 
            '<div class="alph-query-defs" style="display:none;">' +
            "<div class='alph-query-header'>" +
            this.main_str.getString('alph-query-defs') +
            '</div><div class="loading">' +
            this.main_str.getString('alph-loading-misc') +
            '</div>' +
            '<select class="alph-defs-select">' +
            '<option value="">---</option>' +
            '</select>' +
            '</div>';
            
        var select_infl = 
            '<div class="alph-query-infl" style="display:none;">'+ 
            '<a href="#alph-query-infl">' +
            this.main_str.getString("alph-query-infl") +
            '</a></div>';
            
        var src_context = $(a_params.source_node).attr('context');
        var query = 
            '<div class="alph-query-context">' + src_context + '</div>' +
            '<div class="alph-query-element">' + 
            select_pofs +
            select_defs 
            '</div>';

        $("#alph-panel-body-template",query_doc).after(query);
        $("#alph-panel-body-template",query_doc).css('display','none');
        $(".alph-select-pofs",query_doc).change(
            function(e)
            {
                Alph_Inter.checkPofsSelect(this,a_params.source_node);                
            }
        );
       
        $(".alph-defs-select",query_doc).change(
            function(e)
            {
                Alph_Inter.checkDefsSelect(this,a_params.source_node);                
            }
        );

        var valid_pofs = $('.alph-pofs',a_params.source_node).attr('context');
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
     },

     /**
      * query short definitions
      */
     load_query_short_defs: function(a_params,a_pofs)
     {
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
                    // TODO - unique isn't working here
                    var unique_words = $.unique($("div.alph-word",result_html).get());
                    unique_words.forEach(
                        function(a_word)
                        {
                            var pofs = $('.alph-pofs',a_word).attr('context');
                            if (pofs == a_pofs)
                            {
                                var context = $(a_word).attr("context");
                                var mean = $('.alph-mean',a_word).text();
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
    }
};