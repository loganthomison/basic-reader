/**
 * @fileoverview Handler for the Alpheios Inflection Table window
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
 * @class Inflection Window functionality
 */
Alph.Infl = {
    
    /**
     * An XSLT Processor for the xml verb conjugation data
     * @private
     * @type XSLTProcessor
     */
    xsltProcessor: null,
    
    /**
     * logger for the window
     * @type Log4Moz.Logger
     * @static
     */
    s_logger: Alph.BrowserUtils.getLogger('Alpheios.Infl'), 

    /**
     * Transforms xml text adhering to the alpheios verb conj schema to html
     * TODO transform stylesheet may need to be language specific
     * @private
     * @param {Node} a_target
     * @returns an HTML Node containing the transformed text
     * @type Node
     */
    transform: function(a_target)
    {
        this.xsltProcessor = a_target.xslt_processor;
        
        var xmlRef;
        if (a_target.xml_url)
        {
            var p = new XMLHttpRequest();
            p.open("GET",a_target.xml_url,false);
            p.send(null);
            xmlRef = p.responseXML;
        }
        else
        {
            xmlRef = a_target.xml_obj;    
        }
        
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
            this.s_logger.debug("Transformation time: " + (end-start));

        }
        catch (e)
        {
            this.s_logger.error(e);
        }
        return inflHTML;
    },

    
    /**
     * onLoad handler for the window
     */
    onLoad: function() {
        var link_target = window.arguments[0];

        // if a callback function was passed in in the window
        // arguments, execute it
        if (link_target && typeof link_target.callback == 'function') {
            link_target.callback();
        }
        
        var infl_browser = $("#alph-infl-browser");
        
        // if we don't have a requested part of speech, show the index
        if (typeof link_target.showpofs == 'undefined' || 
            (link_target.xml_url && link_target.xml_url.match(/alph-infl-index.xml/)))
        {
            var doc = $(infl_browser).get(0).contentDocument;
            var infl_html = Alph.Infl.transform(link_target);
            var infl_node = 
                doc.importNode(infl_html.getElementById("alph-infl-index"),true);
            this.initIndex(infl_node);
            $("body",doc).append(infl_node);   
            // add a click handler to each index link to bring up the 
            // corresponding inflection table
            $("a.alph-infl-index-link",doc).click(
                function(e)
                {
                    $(this).addClass("loading");
                    var params = Alph.Infl.parseIndexLink(($(this).attr("href")));
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

                    if ((link_target.xml_url || link_target.xml_obj) && link_target.xslt_processor)
                    {
                        var infl_html = Alph.Infl.transform(link_target);
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
                    Alph.Infl.showCols(tbl,link_target,pofs_set);
                    Alph.Infl.resizeWindow(this.contentDocument);

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
            url = Alph.BrowserUtils.getContentUrl(lang_tool.getLanguage())
                + '/inflections/alph-infl-' + base_pofs + '.html';
        }
        $(infl_browser).attr("src",url);        
    },
    
    /**
     * Initialize the mouseover highlighting for the table
     * which also sets the realIndex for each cell
     * @private
     * @param {HTMLElement} a_tbl the Table element
     */
    initTable: function(a_tbl) {
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
        
        //if the main #alph-infl-table element is a table and it contains data,
        // then initialize it 
        if ($(a_tbl).eq(0).is('table') && ! $(a_tbl).eq(0).hasClass('nomatch') )
        {
            this.initTable(a_tbl);    
        }
        // otherwise, it's probably a div containing one or more tables, so initialize
        // each child table
        else
        {
            $('table', a_tbl).each(
                function()
                {
                    Alph.Infl.initTable(this);
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
                Alph.Infl.resort(
                    e,
                    this,
                    a_link_target.source_node,
                    topdoc,
                    a_link_target.lang_tool); 
            }
        );
        
        var str_props = document.getElementById("alph-infl-strings");
    
        // add the version string and disclaimer
        $("body",topdoc).prepend('<div id="alph-version-info"></div>');
        var version_string = 
            a_link_target.lang_tool.getStringOrDefault('alph-version-link',[]);
        if (version_string)
        {
            $("#alph-version-info",topdoc)
                .append('<a href="#" class="alph-version-link">'+ version_string+'</a>')
                .click(
                    function()
                    {
                        Alph.Util.openAlpheiosLink(window.opener,'release-notes');
                        return false;
                    });
        }
        // only add a disclaimer in the javascript if one wasn't already
        // present in the data, but only if we have any data to display
        if ($("#alph-infl-disclaimer",topdoc).length == 0 &&
            $(".ending",a_tbl).length > 0)
        {
            try {
                var disclaimer = Alph.BrowserUtils.getString(str_props,'disclaimer')
                $("#alph-infl-table",topdoc)
                    .after('<span class="alpheios-hint">' + disclaimer + '</span>');                    
            } 
            catch(a_e)
            { // if it's not defined, then nothing to do 
            }
        }

        // populate the title of the declension table
        var title = '';
        if (typeof a_link_target.title == 'undefined')
        {
            title = Alph.BrowserUtils.getString(str_props,'alph-infl-title-'+showpofs);
        }
        else
        {   
            title = Alph.BrowserUtils.getString(str_props,a_link_target.title);
        }
        
        $("#alph-inflect-title span.title",topdoc).html(title);
        
        // add a link to the index
        $("body",topdoc).prepend(
            "<div id='alph-infl-index-link'>"
            + Alph.BrowserUtils.getString(str_props,"alph-infl-index-link") 
            + '</div>');
            
        $("#alph-infl-index-link",topdoc).click(
            function(e)
            {
                a_link_target.lang_tool.
                        handleInflections(e,$(this),null);
            }
        );
        
        // replace the table header text
        $(".header-text",topdoc).each( 
            function(e) { Alph.Infl.replaceString(this,str_props) } );
        
        this.s_logger.debug("Header strings translated.");

        // for each ending in the table, highlight it if there's a matching suffix
        // in the link source but only if we haven't been asked not to look for matches
        var all_cols = $("col",a_tbl);
        
        this.s_logger.debug("Endings Processed");
        
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
                            Alph.Infl.isEndingMatch(a_link_target.suffixes[showpofs],this,a_link_target.lang_tool) )
                       )
                    {
                            Alph.Infl.highlightEnding(this,col_parents);
                    }                       }
            
            );
            this.s_logger.debug("Endings Highlighted.");
            
            var sib_cols = Alph.Infl.findSibCols(col_parents,all_cols);
                        
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
                Alph.Infl.expandTable(a_tbl,topdoc);
            }
            else 
            {
                $("#expand-table-link",topdoc)
                    .css("display","inline")
                    .click( function(e) {
                        Alph.Infl.expandTable(a_tbl,topdoc,true);
                        return false;
                    });
            }
        } 
        else {
            Alph.Infl.expandTable(a_tbl,topdoc);            
        }
        
        this.s_logger.debug("Selected Endings Displayed.");
        // if we didn't have any suffixes, just display the whole table
        // with nothing highlighted
        
        // add the inflection links for the other parts of speech
        this.addInflLinks(a_pofs_set,showpofs,topdoc,str_props);
    
        // add the auxiliary inflection links
        this.addInflLinks(a_link_target.links,showpofs,topdoc,str_props);
        
        // TODO - dedupe all the inflection links? See congestaque
        
        // if we have any additional inflection links, show them
        if ($("select#infl-links-select option",topdoc).length > 1)
        {
            var label = Alph.BrowserUtils.getString(str_props,"alph-infl-links-label"); 
            $("#infl-links-label",topdoc).text(label);
            $("#infl-links",topdoc).css("display","block");
            
            // add the click handler to the inflections links
            $("#infl-links-select",topdoc).change(
                function(e) {
                    Alph.Infl.switchInflection(
                        e,
                        this,
                        a_link_target.source_node,
                        topdoc,
                        a_link_target.lang_tool);
                }
            );
        }
        
        // add a click handler to the footnotes
        $(".footnote",topdoc).click(function(e){return Alph.Infl.showFootnote(e,this)});
        
        // add a click handler to any language-specific functional links
        $(".alph-lang-infl-link",topdoc).click(
            function(e)
            { return Alph.Infl.doLanguageSpecificFeature(e,this,a_link_target.lang_tool)}
        );

        // add a click handler to the reference links
        $(".alph-reflink",topdoc).click(function(e){return Alph.Infl.followReflink(e,this,a_link_target.lang_tool)});
        
        // add a toggle to show the stem classes
        $(".stem-class-toggle",a_tbl).click(
            function(e)
            {
                $(this).parents(".stem-class-block").toggleClass("show-list");
            }
        );

        this.s_logger.debug("Handlers Added");
        
        var collapsed = a_link_target.lang_tool.handleInflectionDisplay(a_tbl,str_props,a_link_target);
        this.enableExpandCols(collapsed,str_props,a_tbl);
        
        this.hideEmptyCols(a_tbl,all_cols);
        
        this.s_logger.debug("Cols hidden");
    },
    
    /**
     * Handler for the "Full Table" link to show all columns in the table.
     * @param {HTMLElement} a_tbl the table
     * @param {Document} a_doc the Document containing the table
     * @param {Boolean} a_hide_empty flag to indicate whether or not to hide empty cells
     */
    expandTable: function(a_tbl,a_topdoc,a_hide_empty) {
        $("th",a_tbl).css("display","table-cell");
        $("td",a_tbl).css("display","table-cell");
        $("#expand-table-link",a_topdoc).css("display","none");
        if (a_hide_empty)
        {
            var all_cols = $("col",a_tbl);
            $("th[origColspan]",a_tbl).each(
                function()
                {
                    var origColspan = $(this).attr("origColspan");
                    this.setAttribute("colspan",origColspan);
                }
            );
            Alph.Infl.hideEmptyCols(a_tbl,all_cols);
        }
        Alph.Infl.resizeWindow(a_topdoc);
    },
    
    /**
     * Resizes the window to fit its contents.
     * @private
     * @param {Document} a_topdoc the window content document
     */
    resizeWindow: function(a_topdoc) {
        
        var max_tbl_height = 0;
        var max_tbl_width = 0;
        
        var min_tbl_height = 400;
        var min_tbl_width =600;
        $("table",a_topdoc).each(
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
            $("#page-header",a_topdoc).height() + 
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
        $(".reloading",a_topdoc).removeClass("reloading");
    },
    
        /**
     * Holds decoded unicode/entities
     * @type Object
     * @private
     */
    d_entities: { },
                    
    /**
     * Decodes unicode/html entities
     * @private
     * @param {String} a_str the string to decode
     * TODO - this should eventually move to a multi-purpose object
     * for handing encodings
     */
    decode: function(a_str) {
        
        // replace the &nbsp; before trimming the string
        a_str = a_str.replace(/\xA0/g, '***');
        
        a_str = jQuery.trim(a_str);
        // only decode each entity once
        if (this.d_entities[a_str]) {
            return this.d_entities[a_str];
        }
        a_str = a_str.replace(/_|-/g, '');
        a_str = a_str.replace(/_|-/g, '');
        a_str = a_str.replace(/&nbsp;/g, '***');
        return a_str;        
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
    switchInflection: function(a_e,a_elem,a_node,a_doc,a_lang_tool)
    {
        $(".loading",a_doc).show();
        var newpofs = $(":selected",a_elem).val();
        Alph.Infl.s_logger.debug("Switching to " + newpofs);
        a_lang_tool.
            handleInflections(a_e,a_node,{showpofs: newpofs});
    },
    
    /**
     * Click handler for showing a popup footnote
     * @param {Event} a_event the event which triggered the action
     * @param {Element} a_elem the target of the action
     * @param return false to cancel the action
     */
    showFootnote: function(a_e,a_elem)
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
     * @returns false if this is a reference link we can follow, otherwise true to
     *         allow event propogation
     */
    followReflink: function(a_e,a_elem,a_lang_tool)
    {
        // TODO this code will change once we have the real linking architecture
        // for now reflink syntax is <link_type>:<link url>
        var link_type_delim = ':';
        var href = $(a_elem).attr("href");
        // handle external urls
        if (href.match(/^http:\/\//))
        {
            Alph.BrowserUtils.openNewTab(window.opener,href);
            return false;
        }
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
            var params = Alph.Infl.parseIndexLink(link_target);
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
    replaceString: function(a_elem,a_props)
    {
        var text = jQuery.trim($(a_elem).text());
        var newtext = Alph.BrowserUtils.getString(a_props,text);
        if (newtext)
        {
            $(a_elem).text(newtext);        
        }  
    },
    
    /**
     * Checks to see if a particular ending from the table is identical to the 
     * ending of the word which is the subject of the table
     * @param {Array} a_suffixes list of possible endings for the selected word
     * @param {Element} a_elem DOM element which contains the inflection table ending
     * @parma {Alph.LanguageTool} a_lang_tool current language tool
     */
    isEndingMatch: function(a_suffixes,a_elem,a_lang_tool)
    {    
        var matches = false;
        for (var j=0; j<a_suffixes.length; j++ ) {
            var ending_text = a_lang_tool.convertString($(a_elem).text());
            ending_text = Alph.Infl.decode(ending_text);
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
    highlightEnding: function(a_elem,a_col_parents)
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
     * @returns array of sibling column indices
     * @type Array
     */
    findSibCols: function(a_cols,a_all_cols)
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
    addInflLinks: function(a_pofs_set,a_showpofs, a_doc,a_str_props)
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
                    link.innerHTML = Alph.BrowserUtils.getString(a_str_props,
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
    enableExpandCols: function(a_collapsed,a_str_props,a_tbl)
    {
        if (typeof a_collapsed == "undefined")
        {
            // just return if we don't have any collapsed cells
            return;
        }
        var expand = Alph.BrowserUtils.getString(a_str_props,"alph-infl-expand");
        var expand_tip = Alph.BrowserUtils.getString(a_str_props,"alph-infl-expand-tooltip");

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
                          .click( function(e) { Alph.Infl.expandColumn(e,this,a_tbl) });
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
    expandColumn: function(a_e,a_elem,a_tbl)
    {
        // TODO - for some reaons the display is to show to reflect the class change
        // need to figure out how to fix this so that display can reflect the fact that  
        // action is in progress
        $(a_elem).addClass("reloading");
        var str_props = document.getElementById("alph-infl-strings");
        var expand = Alph.BrowserUtils.getString(str_props,"alph-infl-expand");
        var collapse = Alph.BrowserUtils.getString(str_props,"alph-infl-collapse");
        var expand_tip = Alph.BrowserUtils.getString(str_props,"alph-infl-expand-tooltip");
        var collapse_tip = Alph.BrowserUtils.getString(str_props,"alph-infl-collapse-tooltip");

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
        
        Alph.Infl.resizeWindow(window.content.document || window.document);
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
    hideEmptyCols: function(a_tbl,a_all_cols)
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
                            Alph.Infl.s_logger.error("Invalid colspan");
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
    initIndex: function(a_node)
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
    parseIndexLink: function(a_href)
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
     * @returns false 
     */
    doLanguageSpecificFeature: function(a_event,a_elem,a_lang_tool)
    {
        a_lang_tool.handleInflectionFeature(a_event,a_elem);
    }
    
};