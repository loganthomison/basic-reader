/**
 * @fileoverview This file contains the Alph.Tree derivation of the Alph.Panel class.
 * Representation of the Treeology panel.
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
 * @class The Alph.Tree class is the representation of the Treeology
 * panel.
 * @constructor
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 * @see Alph.Panel
 */
Alph.Tree = function(a_panel)
{
    Alph.Panel.call(this,a_panel);
};

/**
 * @ignore
 */
Alph.Tree.prototype = new Alph.Panel();


/**
 * Tree panel specific implementation of
 * {@link Alph.Panel#get_detach_chrome}
 * @return the chrome url as a string
 * @type String
 */
Alph.Tree.prototype.get_detach_chrome = function()
{
    return 'chrome://alpheios/content/alpheios-tree-window.xul';
};

/**
 * Tree panel specific implementation of
 * {@link Alph.Panel#show}
 * @return the new panel status
 * @type int
 */
Alph.Tree.prototype.show = function()
{
    var panel_obj = this;
    var bro = Alph.main.getCurrentBrowser();
    var treeDoc = Alph.$("browser",this.panel_elem).get(0).contentDocument;

    // clear out the prior tree
    Alph.$("#dependency-tree", treeDoc).empty();

    var svgDefault =
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<g><g><text class="error">' +
        '<ERROR>' +
        '</text></g></g>' +
        '</svg>';

    var treebankUrl =
        Alph.$("#alpheios-treebank-diagram-url",bro.contentDocument).attr("content");

    var tbref;
    var sentence;
    var word;
    if (! treebankUrl)
    {
        panel_obj.parse_tree((new DOMParser()).parseFromString(
            svgDefault.replace(
                /<ERROR>/,
                Alph.$("#alpheios-strings").get(0).getString("alph-error-tree-notree")
            ), "text/xml"
        ));
    }
    else if (! Alph.xlate.popupVisible() && ! Alph.interactive.query_visible())
    {
        // Just add the default message to the display
        panel_obj.parse_tree((new DOMParser()).parseFromString(
            svgDefault.replace(
                /<ERROR>/,
                Alph.$("#alpheios-strings").get(0).getString("alph-info-tree-select")
            ), "text/xml"
        ));
    }
    else
    {
        try
        {
            var last_elem = Alph.main.get_state_obj(bro).get_var("lastElem");
            tbref = Alph.$(last_elem).attr("tbref");
            // if the selected element doesn't have a tbref attribute,
            // look for the first parent element that does
            if (! tbref)
            {
                tbref = Alph.$(last_elem).parents('[tbref]').attr("tbref");
            }
            var parts = tbref.split(/-/);
            sentence = parts[0];
            word = parts[1];
        }
        catch(a_e)
        {
            Alph.util.log("Error identifying sentence and id: " + a_e);
        }

        //var sentence  = Alph.$(".alph-proto-sentence",bro.contentDocument);
        //var sentence  = Alph.$(".l",bro.contentDocument);
        if (! sentence )
        {
            // Just add the default message to the display
            panel_obj.parse_tree((new DOMParser()).parseFromString(
                svgDefault.replace(
                    /<ERROR>/,
                    Alph.$("#alpheios-strings").get(0).getString("alph-error-tree-notree")
                ), "text/xml"
            ));
        }
        else
        {
            treebankUrl = treebankUrl.replace(/SENTENCE/, sentence);
            treebankUrl = treebankUrl.replace(/WORD/, word);
            Alph.$.ajax(
                {
                    type: "GET",
                    url: treebankUrl,
                    timeout: Alph.util.getPref("url.treebank.timeout") || 5000,
                    dataType: 'xml',
                    error: function(req,textStatus,errorThrown)
                    {
                        var data = (new DOMParser()).parseFromString(
                            svgDefault.replace(
                            /<ERROR>/,
                            Alph.$("#alpheios-strings")
                                .get(0).getString("alph-error-tree-notree")
                            ), "text/xml"
                        );
                        Alph.util.log("Error retrieving treebank diagram: "
                            + textStatus ||errorThrown);
                        panel_obj.parse_tree(data);
                    },
                    success: function(data, textStatus)
                    {
                        panel_obj.parse_tree(data, tbref);
                    }
                }
            );
        }
    }
    return Alph.Panel.STATUS_SHOW;

};

/**
 * Parse and display SVG-encoded tree
 * @param a_svgXML SVG representation of the tree
 * @param {String} a_id id of focus word in the tree
 */
Alph.Tree.prototype.parse_tree = function(a_svgXML, a_id)
{
    var marginLeft = 10;
    var marginTop = 0;
    var fontSize = 20;
    var treeDoc = Alph.$("browser",this.panel_elem).get(0).contentDocument;
    try
    {
        Alph.$("#dependency-tree", treeDoc).
            append(a_svgXML.firstChild.childNodes);
        var svgXML = Alph.$("#dependency-tree", treeDoc).get(0);
        var returned =
                this.position_tree(
                    Alph.$(svgXML).children("g:first").children("g:first"),
                    fontSize);
//      Alph.util.log("SVG: " + XMLSerializer().serializeToString(svgXML));
        this.position_text(treeDoc, returned[0][0], returned[0][1], fontSize);
        Alph.$(svgXML).children("g:first").children("g:first").
             attr("transform",
                  "translate(" + marginLeft + "," + marginTop + ")");
//      Alph.util.log("SVG: " + XMLSerializer().serializeToString(svgXML));
        this.highlight_word(treeDoc, a_id);
//      Alph.util.log("SVG: " + XMLSerializer().serializeToString(svgXML));

        // jQuery doesn't seem to support retrieving svg nodes by class
        // or attribute, so just get by tag name and retrieve the attribute
        // directly using the javascript getAttribute function to filter for
        // the nodes we want

        // for each text element
        var panel = this;
        Alph.$("text",treeDoc).each(
        function()
        {
            var thisNode = Alph.$(this);

            // if this is a text word
            if (thisNode.attr('class') == 'text-word')
            {
                // turn on highlighting for the word
                var tbrefid = thisNode.attr('tbref');
                thisNode.bind(
                    'mouseenter',
                    function()
                    {
                        panel.highlight_word(this.ownerDocument, tbrefid)
                    }
                );
            }
            // if this is a label
            else if (thisNode.attr('class') == 'node-label')
            {
                // highlight the word while hovering
                var id = thisNode.parent().attr('id');
                thisNode.hover(
                    function()
                    {
                        panel.highlight_word(this.ownerDocument, id)
                    },
                    function()
                    {
                        panel.highlight_word(this.ownerDocument, null)
                    }
                );
            }
        });
        // for each group
        Alph.$("g",treeDoc).each(
        function()
        {
            var thisNode = Alph.$(this);

            // if this is container of text words
            if (thisNode.attr('class') == 'text')
            {
                // turn off highlighting when we leave
                thisNode.bind(
                    'mouseleave',
                    function()
                    {
                        panel.highlight_word(this.ownerDocument, null)
                    }
                );
            }
        });
    }
    catch(e)
    {
        Alph.util.log(e);
    }

    // make sure to update the detached window document too...
    // update the panel document whether or not the window is detached
    // because otherwise the screen doesn't seem to redraw right
    if (this.panel_window != null)
    {
        var window_doc =
            this.panel_window.Alph.$("#" + this.panel_id + " browser").get(0).contentDocument;
        var panel_tree = Alph.$("#dependency-tree", treeDoc);
        Alph.$("#dependency-tree", window_doc).empty();
        Alph.$("#dependency-tree", window_doc).append(Alph.$(panel_tree).children().clone(true));
        Alph.$("#dependency-tree", window_doc).attr("width",Alph.$(panel_tree).attr("width"));
        Alph.$("#dependency-tree", window_doc).attr("height",Alph.$(panel_tree).attr("height"));
        this.panel_window.focus();
    }
};


/**
 * Recursively position elements of (sub-)tree
 * @param a_container SVG group containing tree
 * @param {int} a_fontSize size of font in pixels
 * @return size of tree, center line of root element, and width of root node
 * @type Array
 */
Alph.Tree.prototype.position_tree = function(a_container, a_fontSize)
{
    // get various pieces of tree
    var panel = this;
    var rectNode = a_container.children("rect");
    var textNode = a_container.children("text:first");
    var arcLabelNodes = a_container.children("text");
    var arcLineNodes = a_container.children("line");
    var childNodes = a_container.children("g");

    // calculate size of tree
    var textHeight = (5 * a_fontSize) / 4;
    var childSeparation = a_fontSize;
    var textWidth = textNode.get(0).getComputedTextLength() + a_fontSize;
    var childStart = Array();
    var childCenter = Array();
    var childReturn = Array();
    var size = Array(0, 0);
    childNodes.each(
    function()
    {
        // get size, center, and root width of child
        var thisReturn = panel.position_tree(Alph.$(this), a_fontSize);
        var thisSize = thisReturn[0];
        childReturn.push(thisReturn);

        // adjust center for offset, save start of child
        childCenter.push(size[0] + thisReturn[1]);
        childStart.push(size[0]);

        // adjust total width and max height
        size[0] += thisSize[0] + childSeparation;
        if (thisSize[1] > size[1])
            size[1] = thisSize[1];
    });
    // remove separation at right end
    if (size[0] > 0)
        size[0] -= childSeparation;

    // tighten up spacing of subtrees with root only
    var adjust = 0;
    var treeEdge = 0;
    size[0] = 0;
    for (var i = 0; i < childReturn.length; ++i)
    {
        // adjust positions
        childStart[i] -= adjust;
        childCenter[i] -= adjust;

        // if this subtree has root node only
        // it's a candidate to tighten up
        if (childNodes.eq(i).children("g").size() == 0)
        {
            // can we move closer to preceding subtree?
            if ((i > 0) && (childNodes.eq(i-1).children("g").size() > 0))
            {
                // difference between right edge of preceding subtree and
                // right edge of preceding root
                var newAdjust =
                    (childStart[i-1] + childReturn[i-1][0][0]) -
                    (childCenter[i-1] + childReturn[i-1][2] / 2);
                if (newAdjust > 0)
                {
                    childStart[i] -= newAdjust;
                    childCenter[i] -= newAdjust;
                    adjust += newAdjust;
                }
            }
            // can we move closer to following subtree?
            if ((i+1 < childReturn.length) &&
                (childNodes.eq(i+1).children("g").size() > 0))
            {
                // difference between left edge of following root and
                // left edge of following subtree
                var newAdjust = (childCenter[i+1] - childReturn[i+1][2] / 2) -
                                childStart[i+1];
                if (newAdjust > 0)
                    adjust += newAdjust;

                // if following tree would overlap preceding
                // make sure we don't
                if (childStart[i+1] - adjust < treeEdge)
                    adjust -= treeEdge - (childStart[i+1] - adjust);
            }
        }

        // update total width
        var edge = childStart[i] + childReturn[i][0][0] + childSeparation;
        if (edge > size[0])
            size[0] = edge;
        if ((childNodes.eq(i).children("g").size() > 0) && (edge > treeEdge))
            treeEdge = edge;
    }

    // position subtrees, arcs, and arc labels
    // center pt is midway between midpoints of first and last child
    // xExcess is amount needed to center if this label is wider than children
    var xCenter = 0;
    if (childCenter.length > 0)
        xCenter = (childCenter[0] + childCenter[childCenter.length - 1]) / 2;
    var xExcess = ((textWidth > size[0]) ? (textWidth - size[0]) : 0) / 2;
    xCenter += xExcess;
    var y1 = textHeight;
    var y2 = y1 + a_fontSize * 3;
    size[0] += 2 * xExcess;
    size[1] += y2;
    for (var i = 0; i < childNodes.size(); ++i)
    {
        childNodes.get(i).
            setAttribute(
                "transform",
                "translate(" + (xExcess + childStart[i]) + "," + y2 + ")");
        var arc = arcLineNodes.get(i);
        var x2 = xExcess + childCenter[i];
        arc.setAttribute("x1", xCenter);
        arc.setAttribute("y1", y1);
        arc.setAttribute("x2", x2);
        arc.setAttribute("y2", y2);
        var label = arcLabelNodes.get(i + 1);
        var width = (label.getComputedTextLength() + a_fontSize) / 2;
        var xl = (2 * x2 + xCenter)/3 + ((x2 <= xCenter) ? -width : width);
        if (xl + width > size[0])
            size[0] = xl + width;
        label.setAttribute("x", xl);
        label.setAttribute("y", (y1 + 2 * y2) / 3);
    }

    // position text and rectangle
    textNode.attr("x", xCenter);
    textNode.attr("y", a_fontSize);
    rectNode.attr("x", xCenter - textWidth / 2);
    rectNode.attr("y", 0);
    rectNode.attr("width", textWidth);
    rectNode.attr("height", textHeight);

    return Array(size, xCenter, textWidth);
};

/**
 * Position text words in tree
 *
 * The text words are placed underneath the tree itself, wrapping
 * at the width of the tree (except if the tree is narrow, wrapping
 * at 300 pixels).
 *
 * The height and width including the text are set as the values for
 * the parent svg element.
 *
 * @param a_doc the document
 * @param {int} a_width width of tree
 * @param {int} a_height height of tree
 * @param {int} a_fontSize size of font in pixels
 */
Alph.Tree.prototype.position_text =
function(a_doc, a_width, a_height, a_fontSize)
{
    // if no words, just set width and height
    var words = Alph.$("svg", a_doc).children("g").next().children("text");
    var rects = Alph.$("svg", a_doc).children("g").next().children("rect");
    if (words.size() == 0)
    {
        Alph.$("svg", a_doc).attr("width", a_width);
        Alph.$("svg", a_doc).attr("height", a_height);
        return;
    }

    // 300 = minimum width allowed for text to avoid excessive wrapping
    var width = (a_width > 300) ? a_width : 300;
    var textHeight = (5 * a_fontSize) / 4;
    var x = 0;
    var y = a_height + textHeight;

    // for each word
    for (var i = 0; i < words.size(); ++i)
    {
        var word = words.get(i);
        var rect = rects.get(i);

        // if word goes past end of line
        var wlen = word.getComputedTextLength();
        if (x + wlen > width)
        {
            // if not first word in line, wrap
            if (x > 0)
            {
                x = 0;
                y += textHeight;
            }
            // if first word, widen line
            else
            {
                width = x + wlen;
            }
        }

        // position word and bounding rectangle
        word.setAttribute("x", x);
        word.setAttribute("y", y);
        rect.setAttribute("x", x);
        rect.setAttribute("y", (y - a_fontSize));
        rect.setAttribute("width", wlen);
        rect.setAttribute("height", textHeight);

        // advance in line
        x += wlen;
    }

    // set width and height
    Alph.$("svg", a_doc).attr("width", width);
    Alph.$("svg", a_doc).attr("height", y + (textHeight - a_fontSize));
};

/**
 * Highlight a word in the tree
 *
 *  The word and its surrounding lines and nodes
 *  are left with normal coloring.  The remainder
 *  of the tree is grayed out.
 *
 *  If no id or a bad id is specified, the entire tree is
 *  ungrayed.
 *
 * @param a_doc the document
 * @param {String} a_id id of word in tree
 */
//
//  Note: jquery seems not to work well with selectors requiring
//  testing of attribute values.  Hence, the expressions below
//  are sometimes a bit contorted.  The assumption is made
//  that the text element of class "node-label" immediately precedes the
//  text element of class "arc-label", and that the top-level group of class
//  "tree" immediately precedes the group of class "text".
//
Alph.Tree.prototype.highlight_word = function(a_doc, a_id)
{
    // find node of interest
    var focusNode = Alph.$("#" + a_id, a_doc);

    // if no id or bad id
    if (focusNode.size() == 0)
    {
        // display everything normally
        Alph.$("text", a_doc).attr("showme", "normal");
        Alph.$("line", a_doc).attr("showme", "normal");
        Alph.$("rect", a_doc).attr("showme", "normal");
        return;
    }

    // gray everything out in tree (but not text words)
    Alph.$("text", a_doc).attr("showme", "grayed");
    Alph.$("svg", a_doc).children("g").next().children("text").attr("showme", "normal")
    Alph.$("line", a_doc).attr("showme", "grayed");
    Alph.$("rect", a_doc).attr("showme", "grayed");

    // display this node and things connected to it with focus:
    //   text node itself and label on line to dependent words
    //   rectangle around node
    //   lines to dependent words
    focusNode.children("text").attr("showme", "focus-child");
    focusNode.children("text:first").attr("showme", "focus");
    focusNode.children("rect").attr("showme", "focus");
    focusNode.children("line").attr("showme", "focus-child");
    //   descendant words at all levels
    //   line to descendant words
    var descendants = focusNode.find("g");
    descendants.children("rect").attr("showme", "focus-descendant");
    descendants.children("line").attr("showme", "focus-descendant");
    descendants.children("text").each(
    function()
    {
        if (this.getAttribute("class") == "node-label")
            this.setAttribute("showme", "focus-descendant");
    });
    //   dependent words (immediate children)
    //   line to dependent words
    //   (do this after descendants since these are subset of descendants)
    var children = focusNode.children("g");
    children.children("rect").attr("showme", "focus-child");
    children.children("line").attr("showme", "focus-child");
    children.children("text").each(
    function()
    {
        if (this.getAttribute("class") == "node-label")
            this.setAttribute("showme", "focus-child");
    });
    //   label on parent word
    //   line and label from parent word
    if (focusNode.parent().attr("class") == "tree-node")
    {
        focusNode.parent().children("text:first").attr("showme", "focus-parent");
        focusNode.parent().children("rect").attr("showme", "focus-parent");
        focusNode.parent().children().each(
        function()
        {
            if (this.getAttribute("idref") == a_id)
                this.setAttribute("showme", "focus-parent");
        });
    }

    // set highlights on text words below tree
    var panel = this;
    panel.highlight_text_word(a_doc, a_id, "focus");
    panel.highlight_text_word(a_doc,
                             focusNode.parent().attr("id"),
                             "focus-parent");
    descendants.each(
    function()
    {
        panel.highlight_text_word(a_doc, Alph.$(this).attr("id"), "focus-descendant");
    });
    children.each(
    function()
    {
        panel.highlight_text_word(a_doc, Alph.$(this).attr("id"), "focus-child");
    });
};

/**
 * Highlight a text word below the tree
 * @param a_doc the document
 * @param {String} a_id id of word (tbref attribute on text word)
 * @param {String} a_focus value to set showme attribute to
 */
Alph.Tree.prototype.highlight_text_word = function(a_doc, a_id, a_focus)
{
    Alph.$("rect", a_doc).each(
    function()
    {
        if (Alph.$(this).attr('tbref') == a_id)
        {
            Alph.$(this).attr("showme", a_focus);
        }
    });
};
