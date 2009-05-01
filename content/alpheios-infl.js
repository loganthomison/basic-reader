/**
 * @fileoverview Handler for the Alpheios Inflection Table window
 * @version $Id $
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

// initialize the Alph namespace
if (typeof Alph == "undefined") {
    Alph = {};
}

/**
 * @singleton
 */
Alph.infl = {
         /**
     * An XSLT Processor for the xml verb conjugation data
     * @private
     * @type XSLTProcessor
     */
    xsltProcessor: null,

    /**
     * Transforms xml text adhering to the alpheios verb conj schema to html
     * TODO transform stylesheet may need to be language specific
     * @private
     * @param {Node} a_target
     * @return an HTML Node containing the transformed text
     * @type Node
     */
    transform: function(a_target)
    {
        this.xsltProcessor = new XSLTProcessor();
        var p = new XMLHttpRequest();      
        p.open("GET", a_target.xslt_url, false);
        p.send(null);
        var xslRef = p.responseXML;
        this.xsltProcessor.importStylesheet(xslRef)
        
        p.open("GET",a_target.xml_url,false);
        p.send(null);
        var xmlRef = p.responseXML;
        
        var inflHTML = '';
        try
        {
            // add the xslt parameters
            for (var param in a_target.xslt_params)
            {
                this.xsltProcessor.setParameter("",param,a_target.xslt_params[param]);
            }
            var start = (new Date()).getTime();
            inflHTML = this.xsltProcessor.transformToDocument(xmlRef);
            var end = (new Date()).getTime();
            window.opener.Alph.util.log("Transformation time: " + (end-start));

        }
        catch (e)
        {
            window.opener.Alph.util.log(e);
        }
        return inflHTML;
    },

    
    /**
     * onLoad handler for the window
     */
    onLoad: function() {
        var link_target = window.arguments[0];

        var infl_browser = $("#alph-infl-browser");
        
        // if we don't have a requested part of speech, show the index
        if (typeof link_target.showpofs == 'undefined' && link_target.xml_url)
        {
            var doc = $(infl_browser).get(0).contentDocument;
            var infl_html = Alph.infl.transform(link_target);
            var infl_node = 
                doc.importNode(infl_html.getElementById("alph-infl-index"),true);
            this.init_index(infl_node);
            $("body",doc).append(infl_node);   
            // add a click handler to each index link to bring up the 
            // corresponding inflection table
            $("a.alph-infl-index-link",doc).click(
                function(e)
                {
                    $(this).addClass("loading");
                    var params = Alph.infl.parse_index_link(($(this).attr("href")));
                    link_target.lang_tool.
                        handleInflections(e,$(this),params);
                }
            );
            $(".loading",doc).hide();
            return;
        }

        var pofs_from;
        if (typeof link_target.suffixes != 'undefined')
        {
            pofs_from = 'suffixes';
        }
        else
        {
            pofs_from = 'entries';
        }
        var pofs_set = [];
        for (var pofs in link_target[pofs_from])
        {
            if (link_target[pofs_from][pofs].length > 0 || pofs == link_target.showpofs)
            {
                pofs_set.push(pofs);
                
            }
        }
        
        
        document.getElementById("alph-infl-browser")
            .addEventListener(
                "DOMContentLoaded",
                function() 
                {

                    if (link_target.xml_url && link_target.xslt_url)
                    {
                        var infl_html = Alph.infl.transform(link_target);
                        var infl_node = 
                            this.contentDocument.importNode(infl_html.getElementById("alph-infl-table"),true);
                        var title_notes = infl_html.getElementById("table-notes");

                        if (title_notes)
                        {
                        
                            title_notes = 
                                this.contentDocument.importNode(title_notes,true);
                            $("#alph-inflect-title",this.contentDocument).append($(title_notes).contents());
                        }
                        $("body",this.contentDocument).append(infl_node)
                        
                    }
                    $(".loading",this.contentDocument).hide();
                    var tbl = $('#alph-infl-table',this.contentDocument);
                    Alph.infl.showCols(tbl,link_target,pofs_set);
                    Alph.infl.resize_window(this.contentDocument);

                    // scroll to the current element
                    var focus_elem = 
                        $(".highlight-ending:not(.matched)",this.contentDocument).get(0) ||
                        $(".highlight-ending",this.contentDocument).get(0) ||
                        $("td.selected",this.contentDocument).get(0);
                    if (focus_elem)
                    {
                        try
                        {
                            focus_elem.scrollIntoView();
                        }
                        catch(a_e){}
                    };
                },
                true
                );
                
        
        
        var base_pofs = (link_target.showpofs.split(/_/))[0];

        // first check the window parameters for the url to the base
        // html document
        var url = link_target.html_url;
        
        // if not supplied in the link parameters, use the default file
        // named per part of speech
        if (typeof url == "undefined")
        {
            url =
                'chrome://' +
                link_target.lang_tool.getchromepkg() + 
                '/content/inflections/alph-infl-' + base_pofs + '.html';
        }
        $(infl_browser).attr("src",url);        
    },
    
    /**
     * Initialize the mouseover highlighting for the table
     * which also sets the realIndex for each cell
     * @private
     * @param {HTMLElement} a_tbl the Table element
     */
    init_table: function(a_tbl) {
        $(a_tbl).tableHover({colClass: "highlight-hover",
                           rowClass: "highlight-hover",
                           headCols: true,
                           allowHead: false});
    },

    /**
     * Called by the onload event listener for the window contents.
     * Displays the columns whose case endings match the source word.
     * @param {HTMLElement} a_tbl the table element 
     * @param {Object} a_link_target the source object as supplied in the 
     *                 window arguments. Contains the source word, it's endings and the
     *                 requested case.
     * @param {Array} a_pofs_set the list of pofs relevant to the source object 
     */
    showCols: function(a_tbl,a_link_target, a_pofs_set) {
        
        var topdoc = window.content.document || window.document;
        
        
        var showpofs = a_link_target.showpofs;
        
        //if the main #alph-infl-table element is a table, then initialize it 
        if ($(a_tbl).eq(0).is('table'))
        {
            this.init_table(a_tbl);    
        }
        // otherwise, it's probably a div containing one or more tables, so initialize
        // each child table
        else
        {
            $('table', a_tbl).each(
                function()
                {
                    Alph.infl.init_table(this);
                }
            );
        }
                

        // show the links to the other possible orders
        if (a_link_target.order)
        {
            $("#sortorder",topdoc).val(a_link_target.order);
            $("#reorder",topdoc).css("display","block");
        }
        
        // add handler for the reorder links
        $("#sortorder",topdoc).change( 
            function(e) { 
                Alph.infl.resort(
                    e,
                    this,
                    a_link_target.source_node,
                    topdoc,
                    a_link_target.lang_tool); 
            }
        );
        
        var str_props = document.getElementById("alph-infl-strings");
    
        // populate the title of the declension table
        var title = '';
        try
        {
            if (typeof a_link_target.title == 'undefined')
            {
                title = str_props.getString('alph-infl-title-'+showpofs);
            }
            else
            {   
                title = str_props.getString(a_link_target.title);
            }
        
        }
        catch(a_e)
        {
            window.opener.Alph.util.log("No title string defined for " + showpofs);
        }
        $("#alph-inflect-title span.title",topdoc).html(title);
        
        // add a link to the index
        $("body",topdoc).prepend(
            "<div id='alph-infl-index-link'>"
            + str_props.getString("alph-infl-index-link") 
            + '</div>');
            
        $("#alph-infl-index-link",topdoc).click(
            function(e)
            {
                a_link_target.lang_tool.
                        handleInflections(e,$(this),null);
            }
        );
        
        var start = (new Date()).getTime();
        
        // replace the table header text
        $(".header-text",topdoc).each( 
            function(e) { Alph.infl.replace_string(this,str_props) } );
        
        var end = (new Date()).getTime();
        window.opener.Alph.util.log("Translation time: " + (end-start));

        // for each ending in the table, highlight it if there's a matching suffix
        // in the link source but only if we haven't been asked not to look for matches
        start = end;
        
        
        var all_cols = $("col",a_tbl);
        
        end = (new Date()).getTime();
        window.opener.Alph.util.log("Endings Processed: " + (end-start));
        start=end;
        
        if (  ! a_link_target.suppress_match) {
            var col_parents = [];
            
            $("span.ending",a_tbl).each(
                function()
                {
                    if (  
                        (a_link_target.xslt_params && 
                            ($(this).hasClass("selected") || $(this).hasClass("matched"))) || 
                        (typeof a_link_target.xslt_params == "undefined" &&
                             a_link_target.suffixes[showpofs] != null &&
                             a_link_target.suffixes[showpofs].length > 0 && 
                            Alph.infl.is_ending_match(a_link_target.suffixes[showpofs],this,a_link_target.lang_tool) )
                       )
                    {
                            Alph.infl.highlight_ending(this,col_parents);
                    }                       }
            
            );
            end = (new Date()).getTime();
            window.opener.Alph.util.log("Endings Highlighted: " + (end-start));
            start=end;
            
            var sib_cols = Alph.infl.find_sib_cols(col_parents,all_cols);
                        
            // unhide all the cells in the colgroups to which the matched
            // endings belonged
            for (var i=0; i<sib_cols.length; i++) {
                $("td[realIndex='" + sib_cols[i] + "']",a_tbl).css("display","table-cell");
                $("th[realIndex='" + sib_cols[i] + "']",a_tbl).css("display","table-cell");
            }

            // if we couldn't find any of the suffixes in the table
            // or we should expand anyway, expand the whole thing
            if (sib_cols.length == 0 || a_link_target.always_expand)
            {
                Alph.infl.expand_table(a_tbl,topdoc);
            }
            else 
            {
                $("#expand-table-link",topdoc)
                    .css("display","inline")
                    .click( function(e) {
                        Alph.infl.expand_table(a_tbl,topdoc,true);
                        return false;
                    });
            }
        } 
        else {
            Alph.infl.expand_table(a_tbl,topdoc);            
        }
        end = (new Date()).getTime();
        window.opener.Alph.util.log("Selected Endings Displayed: " + (end-start));
        start=end;
        // if we didn't have any suffixes, just display the whole table
        // with nothing highlighted
        
        // add the inflection links for the other parts of speech
        this.add_infl_links(a_pofs_set,showpofs,topdoc,str_props);
    
        // add the auxiliary inflection links
        this.add_infl_links(a_link_target.links,showpofs,topdoc,str_props);
        
        // TODO - dedupe all the inflection links? See congestaque
        
        // if we have any additional inflection links, show them
        if ($("select#infl-links-select option",topdoc).length > 1)
        {
            var label = str_props.getString("alph-infl-links-label"); 
            $("#infl-links-label",topdoc).text(label);
            $("#infl-links",topdoc).css("display","block");
            
            // add the click handler to the inflections links
            $("#infl-links-select",topdoc).change(
                function(e) {
                    Alph.infl.switch_inflection(
                        e,
                        this,
                        a_link_target.source_node,
                        topdoc,
                        a_link_target.lang_tool);
                }
            );
        }
        
        // add a click handler to the footnotes
        $(".footnote",topdoc).click(function(e){return Alph.infl.show_footnote(e,this)});
        
        // add a click handler to any language-specific functional links
        $(".alph-lang-infl-link",topdoc).click(
            function(e)
            { return Alph.infl.do_language_specific_feature(e,this,a_link_target.lang_tool)}
        );

        // add a click handler to the reference links
        $(".alph-reflink",topdoc).click(function(e){return Alph.infl.follow_reflink(e,this,a_link_target.lang_tool)});
        
        // add a toggle to show the stem classes
        $(".stem-class-toggle",a_tbl).click(
            function(e)
            {
                $(this).parents(".stem-class-block").toggleClass("show-list");
            }
        );

        end = (new Date()).getTime();
        window.opener.Alph.util.log("Handlers Added: " + (end-start));
        start=end;
        
        var collapsed = a_link_target.lang_tool.handleInflectionDisplay(a_tbl,str_props,a_link_target);
        this.enable_expand_cols(collapsed,str_props,a_tbl);
        
        var start = (new Date()).getTime();
        
        this.hide_empty_cols(a_tbl,all_cols);
        
        var end = (new Date()).getTime();
        window.opener.Alph.util.log("Hiding time: " + (end-start));
    },
    
    /**
     * Handler for the "Full Table" link to show all columns in the table.
     * @param {HTMLElement} a_tbl the table
     * @param {Document} the Document containing the table
     */
    expand_table: function(tbl,topdoc,a_hide_empty) {
        $("th",tbl).css("display","table-cell");
        $("td",tbl).css("display","table-cell");
        $("#expand-table-link",topdoc).css("display","none");
        if (a_hide_empty)
        {
            var all_cols = $("col",tbl);
            $("th[origColspan]",tbl).each(
                function()
                {
                    var origColspan = $(this).attr("origColspan");
                    this.setAttribute("colspan",origColspan);
                }
            );
            Alph.infl.hide_empty_cols(tbl,all_cols);
        }
        Alph.infl.resize_window(topdoc);
    },
    
    /**
     * Resizes the window to fit its contents.
     * @private
     * @param {Document} the window content document
     */
    resize_window: function(topdoc) {
        
        var max_tbl_height = 0;
        var max_tbl_width = 0;
        
        var min_tbl_height = 400;
        var min_tbl_width =600;
        $("table",topdoc).each(
            function()
            {
                var height = $(this).height();
                if (height > max_tbl_height)
                {
                    max_tbl_height = height;
                }
                var width = $(this).width();
                if (width > max_tbl_width)
                {
                    max_tbl_width = width;
                }
            }
        );
        // resize the window 
        // add a little space to the top
        var y = 
            max_tbl_height +
            $("#page-header",topdoc).height() + 
            75;
                    
        // add a little room to the right  
        var x = max_tbl_width + 75;
                    
        if (x > window.screen.availWidth) {
            x = window.screen.availWidth - 20; // don't take up the entire screen
        }
        else if (x < min_tbl_width)
        {
            x = min_tbl_width;
        }
        if (y > window.screen.availHeight) {
            y = window.screen.availHeight - 20; // don't take up the entire screen 
        }
        else if (y < min_tbl_height)
        {
            y = min_tbl_height;
        }
        // TODO - need to reset screenX and screenY to original 
        // requested location
        window.resizeTo(x,y);
        $(".reloading",topdoc).removeClass("reloading");
    },
    
        /**
     * Holds decoded unicode/entities
     * @type Object
     * @private
     */
    entities: { },
                    
    /**
     * Decodes unicode/html entities
     * @private
     * @param {String} str the string to decode
     * TODO - this should eventually move to a multi-purpose object
     * for handing encodings
     */
    decode: function(str) {
        
        // replace the &nbsp; before trimming the string
        str = str.replace(/\xA0/g, '***');
        
        str = jQuery.trim(str);
        // only decode each entity once
        if (this.entities[str]) {
            return this.entities[str];
        }
        str = str.replace(/_|-/g, '');
        str = str.replace(/_|-/g, '');
        str = str.replace(/&nbsp;/g, '***');
        return str;        
    },

        
    /**
     * Shift key handler for the window -- hands the event off to the
     * parent window. Only effective while the mouseover popup is visible.
     * @param {Event} a_e the the keydown event 
     * @return true to allow event propogation
     */
    onKeyDown: function(a_e) {
        if (a_e.keyCode == 16) {
            if (window.opener.Alph.xlate.popupVisible()) {
                var popup = $("#alph-text", window.opener.content.document).clone();
                // in this case we DO want to retrieve the current LanguageTool
                // from the opening window, because if we're in a different tab, 
                // the current language may be different than the one which opened
                // the inflection window.  And if Alpheios isn't enabled on the 
                // current tab, the shift key shouldn't do anything
                window.opener.Alph.main.getLanguageTool().handleInflections(a_e,popup);
            }
        }
        // return true to allow event propogation if needed
        return true;
    },
    
    /**
     * Click handler for changing the table sort order
     * @param {Event} a_e the event which triggered the action
     * @param {Element} a_elem the target of the action
     * @param {Node} a_node the node which contains the morphology for the selected word (from the source text)
     * @param {Document} a_doc the contentDocument which contains the inflection table
     * @param {Alph.LanguageTool} a_lang_tool the LanguageTool object which produced the inflection table
     */
    resort: function(a_e,a_elem,a_node,a_doc,a_lang_tool) 
    {
        $(".loading",a_doc).show();
        var showorder = $(":selected", a_elem).val();
        a_lang_tool
            .handleInflections(a_e,a_node,{showpofs: 'verb', order: showorder}
            );
    },
    
    /**
     * Click handler for switching the inflection type
     * @param {Event} a_e the event which triggered the action
     * @param {Element} a_elem the target of the action
     * @param {Node} the a_node node which contains the morphology for the selected word (from the source text)
     * @param {Document} a_doc the contentDocument which contains the inflection table
     * @param {Alph.LanguageTool} a_lang_tool the LanguageTool object which produced
     *                                        the inflection table
     */
    switch_inflection: function(a_e,a_elem,a_node,a_doc,a_lang_tool)
    {
        $(".loading",a_doc).show();
        var newpofs = $(":selected",a_elem).val();
        window.opener.Alph.util.log("Switching to " + newpofs);
        a_lang_tool.
            handleInflections(a_e,a_node,{showpofs: newpofs});
    },
    
    /**
     * Click handler for showing a popup footnote
     * @param {Event} a_event the event which triggered the action
     * @param {Element} a_elem the target of the action
     * @param return false to cancel the action
     */
    show_footnote: function(a_e,a_elem)
    {
        var text = $(a_elem).next(".footnote-text");
        if (text.length > 0)
        {
            // if the foot note is already visible, we don't have
            // to do anything 
            if (!$(text).hasClass("footnote-visible"))
            {
                // if this is the first time we're showing the footnote, 
                // add the close link
                if ($(".alph-close-button",text).length == 0)
                {
                    $(text).prepend('<div class="alph-close-button">&#160;</div><br/>');
                    $(".alph-close-button",text).bind("click",
                        function()
                        {
                            $(this).parent('.footnote-text').removeClass('footnote-visible');
                        }
                    );
                }
                $(text).addClass("footnote-visible");    
            }
            return false;
        }   
    },
    
    /**
     * Click handler for reference links
     * @param {Event} a_event the event which triggered the action
     * @param {Element} a_elem the target of the action
     * @param {Alph.LanguageTool} a_lang_tool the LanguageTool object which produced 
     *                                        the inflection table
     * @return false if this is a reference link we can follow, otherwise true to
     *         allow event propogation
     */
    follow_reflink: function(a_e,a_elem,a_lang_tool)
    {
        // TODO this code will change once we have the real linking architecture
        // for now reflink syntax is <link_type>:<link url>
        var link_type_delim = ':';
        var href = $(a_elem).attr("href");
        // we can't just split on : because it might be used in later components of the
        // url
        var delim_pos = href.indexOf(':')
        var link_type = href.substring(0,delim_pos);
        var link_target = href.substring(delim_pos+1)
        // grammar links
        if (link_type == 'grammar')
        {
            var grammar_ref = link_target.split(/:/);
            // syntax is grammar_name:target_loc
            // but right now we only support one grammar per language
            // TODO support multiple grammars
            a_lang_tool.openGrammar(null,null,grammar_ref[1]);
            return false;
        }
        // other inflection tables
        // for now, index link syntax is
        // #<pofs>[|<addt'l param_name:addt'lparam_value>+]
        else if (link_type == 'inflect')
        {
            var href = link_target;
            var params = Alph.infl.parse_index_link(link_target);
            a_lang_tool.
                handleInflections(a_e,$(this),params);
            return false;
        }
        else
        {
            return true;
        }
    },
    
    /**
     * Populate a text string in table from the localizable properties
     * @param {Element} the element whose text should be translated
     * @param {Properties} the properties object containing the display strings  
     */
    replace_string: function(a_elem,a_props)
    {
        var $text = jQuery.trim($(a_elem).text());
        try 
        {
            var $newtext = a_props.getString($text);
            if ($newtext)
            {
                $(a_elem).text($newtext);        
            }
        } 
        catch(e)
        {
            window.opener.Alph.util.log("Couldn't find string for " + $text);   
        }  
    },
    
    /**
     * Checks to see if a particular ending from the table is identical to the 
     * ending of the word which is the subject of the table
     * @param {Array} a_suffixes list of possible endings for the selected word
     * @param {Element} a_elem DOM element which contains the inflection table ending
     * @parma {Alph.LanguageTool} a_lang_tool current language tool
     */
    is_ending_match: function(a_suffixes,a_elem,a_lang_tool)
    {    
        var matches = false;
        for (var j=0; j<a_suffixes.length; j++ ) {
            var ending_text = a_lang_tool.convertString($(a_elem).text());
            ending_text = Alph.infl.decode(ending_text);
            if (ending_text == $.trim($(a_suffixes[j]).text()))
            { 
                matches = true;
                break;
            }
        }
        return matches;
    },
      
    /**
     * Highlights a matched ending and adds the parent table element to the 
     * the supplied list of parent cells
     * @param {Element} a_elem the DOM element which contains the ending
     * @param {Array} a_col_parents Array which holds indices of the parent cells 
     */
    highlight_ending: function(a_elem,a_col_parents)
    {
        
        $(a_elem).addClass("highlight-ending");
        var td_parent = $(a_elem).parent("td");
        $(td_parent).addClass("highlight-ending");
    
        // get the realIndex (column index) for each cell containing
        // a matched ending, so that we can make all cells in this column
        // visible
        a_col_parents.push($(td_parent).get(0).realIndex);
    },
    
    /**
     * Finds sibling columns 
     * @param {Array} a_cols a list of column indices
     * @param {Array} a_all_cols a list of all the Column cells in the table 
     * @return array of sibling column indices
     * @type Array
     */
    find_sib_cols: function(a_cols,a_all_cols)
    {
        var sib_cols = [];
        
        // iterate through the col elements with the same realIndex as those
        // of the matched cells, identifying the realIndexes of the 
        // sibling columns (i.e. columns in the same colgroup), so that we can 
        // display all columns in the column group.
        // ideally we wouldn't need to do this, and could just set visibility
        // at the colgroup level, but Firefox's handling of the visibility css
        // style on tables is very buggy
        for (var i=0; i<a_cols.length; i++) {
            var col_index = a_cols[i];
            var col_realIndex = $(a_all_cols[col_index]).attr("realIndex"); 
            if (sib_cols.indexOf(col_realIndex) == -1) {
                sib_cols.push(col_realIndex);
            }
            $(a_all_cols[col_index]).siblings().each(function(){
                var sib_index = $(this).attr("realIndex");
                if (sib_cols.indexOf(sib_index) == -1) {
                    sib_cols.push(sib_index);
                }
            });
        }
        return sib_cols;            
    },

    /**
     * Adds inflection links for the other possible inflections
     * to the inflection table display
     * (if there are any) 
     * @param {Array} a_pofs_set the array of possible inflection types
     * @param {String} a_showpofs the current part of speech
     * @param {Document} a_doc the contentDocument containing the table
     * @param {Properties} a_str_props string properties for the display
     */
    add_infl_links: function(a_pofs_set,a_showpofs, a_doc,a_str_props)
    {
        if (typeof a_pofs_set == "undefined" || a_pofs_set.length == 0) 
        {
            return;
        }
        for (var i=0; i<a_pofs_set.length; i++)
        {
            // if a part of speech is broken down further,
            // format will be <primary pofs>_<secondary info>
            // e.g. verb_suppine, etc.
            var parts = a_pofs_set[i].split(/_/);
            var linktype;
            var linkname;
            if (parts.length >1)
            { 
                linktype = parts[0];
                linkname = parts[0] + '(' + parts[1] + ')';
            }
            else {
                linktype = a_pofs_set[i];
                linkname = a_pofs_set[i];
            }

            var link =
               a_doc.createElementNS("http://www.w3.org/1999/xhtml",
                                    "option");
                link.setAttribute("value",a_pofs_set[i]);
                try 
                {
                    link.innerHTML = a_str_props.getFormattedString(
                        "alph-infl-link-"+linktype, [linkname]);
                }
                catch(e)
                {
                    link.innerHTML = linkname;
                }
            if (a_pofs_set[i] == a_showpofs)
            {
                link.setAttribute("selected",true);
            }

            $("#infl-links-select",a_doc).append(link);
        }
    },
    
    /**
     * Adds toggle and click handler to columns which are collapsed
     * @param {Array} a_collapsed array of the indexes of the collapsed columns
     * @param {Properties} a_str_props string properties for the display
     * @param {Element} the inflection table element 
     */
    enable_expand_cols: function(a_collapsed,a_str_props,a_tbl)
    {
        if (typeof a_collapsed == "undefined")
        {
            // just return if we don't have any collapsed cells
            return;
        }
        var expand = a_str_props.getString("alph-infl-expand");
        var expand_tip = a_str_props.getString("alph-infl-expand-tooltip");

        // iterate through the table header cells of the row
        // which should contain the expand control, adding a toggle
        // to expand the column group if any of the columns under 
        // in the table header group have their indexes flagged 
        // as containing collapsed endings
       $("tr.expand-ctl th", a_tbl).each(
           function()
           {
                var colspan = $(this).attr("colspan") || 1;
                var startIndex = this.realIndex;
                var endIndex = startIndex + colspan - 1;
                
                var collapsed_children = 
                    $.grep(a_collapsed, 
                        function(a, i)
                        {
                            return (a >= startIndex && a <= endIndex);
                        });
                if (collapsed_children.length > 0)
                {
                    $(this).append("<div class='endings-toggle'>" + expand + "</div>")
                          .click( function(e) { Alph.infl.expand_column(e,this,a_tbl) });
                }
            }
       
       );        
    },

    /**
     * Click handler for the column expansion widgets
     * @param {Event} a_e the event which triggered the action
     * @param {Element} a_elem the target of the action
     * @param {Element} the inflection table element
     */
    expand_column: function(a_e,a_elem,a_tbl)
    {
        // TODO - for some reaons the display is to show to reflect the class change
        // need to figure out how to fix this so that display can reflect the fact that  
        // action is in progress
        $(a_elem).addClass("reloading");
        var str_props = document.getElementById("alph-infl-strings");
        var expand = str_props.getString("alph-infl-expand");
        var collapse = str_props.getString("alph-infl-collapse");
        var expand_tip = str_props.getString("alph-infl-expand-tooltip");
        var collapse_tip = str_props.getString("alph-infl-collapse-tooltip");

        var toggle_elem = $(".endings-toggle",a_elem);
        var toggle = $(toggle_elem).html();
        
        var expanding = false;
        if (toggle.indexOf(expand) != -1)
        {
            expanding = true;
            $(toggle_elem).html(collapse);
            $(toggle_elem).attr("title",collapse_tip);
        }
        else 
        {
            $(toggle_elem).html(expand);
            $(toggle_elem).attr("title",expand_tip);
        }
        //var parent = $(a_elem).parent("th");
        var index = $(a_elem).get(0).realIndex;
        var cell_span = $(a_elem).attr("colspan");
        if (cell_span == null || cell_span == '') 
        {
            cell_span = 1;
        }
        for (var i=0; i<cell_span; i++) {
            // iterate through the endings which are in this column
            // and which also may be collapsed
            // toggling the expanded state for each ending
            // and also updating the selection state of the stem class
            // for that ending
            var selected_stems = [];
            $("td[realIndex="+ (index+i) +"] span.ending.ending-collapsed",a_tbl).each(
                function()
                {
                    $(this).toggleClass("ending-expanded");
                    var ending_index = $(this).attr("ending-index");
                    $(this)
                        .nextAll("[ending-index='" + ending_index +"']")
                        .toggleClass("ending-expanded");
                    var stem_classes = $(this).attr('stem-class');
                    if (stem_classes != null && stem_classes != '')
                    {
                        stem_classes.split(/\s/).forEach(
                            function(a){ selected_stems.push(a) }
                        );
                    }
                }
            );
        }
        $.unique(selected_stems).forEach(
            function(a_id,a_i)
            {
                // make sure the stem class selections
                // reflect the displayed endings
                if (expanding) 
                {
                    $("#" + a_id,a_tbl).addClass("selected");
                 }
                 else
                 {
                    $("#" + a_id,a_tbl).removeClass("selected");
                 }
            }
        );
        
        Alph.infl.resize_window(window.content.document || window.document);
        return false;
    },
    
    /**
     * hides the th and td cells for columns in which all of the endings
     * are empty; also modifies the colspan of the th elements to reduce
     * them by the number of td cells which have been hidden 
     * (use css display: none to hide the cells to completely hide them 
     * from the table - using visibility:hidden or visibility:collapse doesn't
     * work fully
     * @param {Node} a_tbl the inflection table node
     * @param a_all_colls jQuery wrapped set of the col elements
     * 
     */
    hide_empty_cols: function(a_tbl,a_all_cols)
    {
        var data_rows = $("tr.data-row",a_tbl).length;
        var empty_cols = [];
        // iterate through the columns, hiding any which are completely empty
        $(a_all_cols).each (
          function() {
            var index = $(this).attr("realIndex");
            var num_empty = $("td[realIndex='" + index + "'] span.emptycell",a_tbl).length;
            if (num_empty == data_rows) 
            {
                empty_cols.push(index);    
            }
  
          }
        );

        var reduce_cols = {headerrow1: {},
                           headerrow2: {}};
        empty_cols.forEach( 
            function(a_o, a_i)
            {
                $("td[realIndex='" + a_o + "']",a_tbl).css("display","none");
                    
                $("tr[id^=headerrow] th",a_tbl).each(
                    function()
                    {
                        var realIndex = this.realIndex;
                        var colspan;
                        var id = $(this).parent("tr").attr("id");
                        try 
                        {
                            colspan = parseInt($(this).attr("colspan"));
                        }
                        catch(e)
                        {
                            window.opener.Alph.util.log("Invalid colspan");
                        }
                        
                        if (typeof realIndex != "undefined" && 
                            (realIndex == a_o
                              || (a_o > realIndex && a_o < (realIndex + colspan))))
                        {
                            if (typeof reduce_cols[id][realIndex] == "undefined")
                            {
                                reduce_cols[id][realIndex] = 1;
                            }
                            else
                            {
                                reduce_cols[id][realIndex] = reduce_cols[id][realIndex] + 1;    
                            }
                            
                        }
                    }
                );
            }
        );
        for (var id in reduce_cols)
        {
            if (id.substring("headerrow") == -1)
            {
                continue;
            }
            for (var colindex in reduce_cols[id])
            {
                if (typeof reduce_cols[id][colindex] == "number")
                {
                    var col_header = 
                        $("tr#" + id + " th[realIndex='" + colindex + "']",a_tbl)
                        .get(0);
                    var col_span = parseInt(col_header.getAttribute("colspan"));
                    if (reduce_cols[id][colindex] == col_span)
                    {
                        $(col_header).css("display","none");
                    }
                    else
                    {
                        col_header.setAttribute("colspan",col_span - reduce_cols[id][colindex]);
                        col_header.setAttribute("origColspan",col_span);
                    }
                }
            }
        } 
    },
    
    /**
     * Initialize the index menu
     * @param {Node} a_node the parent node of the index 
     */
    init_index: function(a_node)
    {
        $('.tochead',a_node).click(function() {
            $(this).toggleClass("openmenu")
            $(this).children().toggle();
            return false;
        }).children().hide();
    },
    
    /**
     * Parse an index link
     * @param {String} a_href the unparsed url
     */
    parse_index_link: function(a_href)
    {
        // TODO syntax will change with linking architecture
        // for now, index link syntax is
        // #<pofs>[|<addt'l param_name:addt'lparam_value>+]
        var target = a_href.slice(1).split(/\|/);
        var params = {};
        params.showpofs = target[0];
        for (var i=1; i<target.length; i++)
        {
            var param = target[i].split(/:/);
            params[param[0]]= param[1];
        }
        return params;    
    },
    
    /** 
     * Handle a language-specific feature
     * @param {Event} a_event the click event
     * @param {Element} a_elem the target of the action
     * @param {Alph.LanguageTool} a_lang_tool the LanguageTool object which produced 
     *                                        the inflection table
     * @return false 
     */
    do_language_specific_feature: function(a_event,a_elem,a_lang_tool)
    {
        a_lang_tool.handle_inflection_feature(a_event,a_elem);
    }
    
};