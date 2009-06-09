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
 * {@link Alph.Panel.#init}
 */
Alph.Tree.prototype.init = function()
{
    // add the popup trigger handler to the tree browser
    var trigger = Alph.main.getLanguageTool().getpopuptrigger();
    Alph.$("browser",this.panel_elem).get(0).
        addEventListener(trigger, Alph.main.doXlateText, false);
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

    // clear out the prior tree and any error
    Alph.$("#tree-error", treeDoc).empty();
    Alph.$("#dependency-tree", treeDoc).empty();

    var svgError = "";

    var treebankUrl = Alph.site.treebank_diagram_url(bro.contentDocument);

    var tbref;
    var sentence;
    var word;
    if (! treebankUrl)
    {
        Alph.$("#tree-error",treeDoc).html(
                Alph.$("#alpheios-strings").get(0).getString("alph-error-tree-notree")
        );
        this.update_panel_window({},'alph-tree-body');
    }
    else if (! Alph.xlate.popupVisible() && ! Alph.interactive.query_visible())
    {
        // Just add the default message to the display
        Alph.$("#tree-error",treeDoc).html(
                Alph.$("#alpheios-strings").get(0).getString("alph-info-tree-select")
        );
        this.update_panel_window({},'alph-tree-body');
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
            Alph.$("#tree-error",treeDoc).html(
                    Alph.$("#alpheios-strings").get(0).getString("alph-error-tree-notree")
              );
            this.update_panel_window({},'alph-tree-body');
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
                        Alph.$("#tree-error",treeDoc).html(
                            Alph.$("#alpheios-strings")
                                .get(0).getString("alph-error-tree-notree")
                        );
                        Alph.util.log("Error retrieving treebank diagram: "
                            + textStatus ||errorThrown);
                        panel_obj.update_panel_window({},'alph-tree-body');
                    },
                    success: function(data, textStatus)
                    {
                        panel_obj.parse_tree(data, tbref);
                        panel_obj.update_panel_window({},'alph-tree-body');
                    }
                }
            );
        }
    }

    return Alph.Panel.STATUS_SHOW;

};


/**
 * Tree specific implementation of
 * {@link Alph.Panel.observe_ui_event}
 * @param {Browser} a_bro the current browser
 * @param a_event_type the event type (one of @link Alph.main.events)
 * @param a_event_data optional event data object
 */
Alph.Tree.prototype.observe_ui_event = function(a_bro,a_event_type,a_event_data)
{
    // listen for the window and the xlate trigger change events
    if (a_event_type == Alph.main.events.UPDATE_XLATE_TRIGGER)
    {
        Alph.util.log("Tree panel handling event " + a_event_type);
        var new_trigger = a_event_data.new_trigger;
        var old_trigger = a_event_data.old_trigger;
        var pw_bro = null;
        if (this.panel_window != null && ! this.panel_window.closed)
        {
            pw_bro =
                this.panel_window
                    .Alph.$("#" + this.panel_id + " browser")
                    .get(0);
        }

        if (old_trigger)
        {
            Alph.$("browser",this.panel_elem).get(0).
                removeEventListener(old_trigger, Alph.main.doXlateText,false);
            if (pw_bro)
            {
                pw_bro.removeEventListener(old_trigger, Alph.main.doXlateText,false);
            }
        }
        Alph.$("browser",this.panel_elem).get(0).
            addEventListener(new_trigger, Alph.main.doXlateText,false);
        if (pw_bro)
        {
            pw_bro.addEventListener(new_trigger, Alph.main.doXlateText,false);
        }
    }
    if (a_event_type == Alph.main.events.LOAD_TREE_WINDOW)
    {
        this.open();
        var trigger = Alph.main.getXlateTrigger();
        this.panel_window
            .Alph.$("#" + this.panel_id + " browser")
            .get(0)
            .addEventListener(trigger, Alph.main.doXlateText,false);
    }
    return;
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
        var treeSize =
                Alph.Tree.position_tree(
                    Alph.$(svgXML).children("g:first").children("g:first"),
                    fontSize)[0];
        var maxWidth = treeSize[0];
        var helpSize = Alph.Tree.position_help(treeDoc, fontSize);
        if (helpSize[0] > maxWidth)
            maxWidth = helpSize[0];
        var keySize = Alph.Tree.position_key(treeDoc, fontSize);
        if (keySize[0] > maxWidth)
            maxWidth = keySize[0];
        var textSize = Alph.Tree.position_text(treeDoc, maxWidth, fontSize);
        Alph.Tree.position_all(treeDoc,
                               treeSize,
                               textSize,
                               keySize,
                               helpSize,
                               fontSize);
//      Alph.util.log("SVG: " + XMLSerializer().serializeToString(svgXML));
        Alph.Tree.highlight_first(treeDoc, a_id);
        Alph.Tree.highlight_word(treeDoc, a_id);
//        Alph.util.log("SVG: " + XMLSerializer().serializeToString(svgXML));

        // jQuery doesn't seem to support retrieving svg nodes by class
        // or attribute, so just get by tag name and retrieve the attribute
        // directly using the javascript getAttribute function to filter for
        // the nodes we want

        // for each text element
        Alph.$("text",treeDoc).each(
        function()
        {
            var thisNode = Alph.$(this);
            var className = this.getAttribute('class');
            if (className)
                className = className.split(' ')[0];

            // if this is a text word
            if (className == 'text-word')
            {
                // turn on highlighting for the word
                var tbrefid = this.getAttribute('tbref');
                thisNode.bind(
                    'mouseenter',
                    function()
                    {
                        Alph.Tree.highlight_word(this.ownerDocument, tbrefid);
                    }
                );
            }
            // if this is a label
            else if (className == 'node-label')
            {
                // highlight the word while hovering
                var id = thisNode.parent().get(0).getAttribute('id');
                thisNode.hover(
                    function()
                    {
                        Alph.Tree.highlight_word(this.ownerDocument, id);
                    },
                    function()
                    {
                        Alph.Tree.highlight_word(this.ownerDocument, null);
                    }
                );
            }
            // if this is an arc label
            else if (className == 'arc-label')
            {
                // highlight the word while hovering
                var id = thisNode.parent().get(0).getAttribute('id');
                thisNode.bind(
                    'mouseenter',
                    function()
                    {
                        Alph.$('text', Alph.$(this)).each(
                        function()
                        {
                            this.style.visibility = "visible";
                        });
                    }
                );
                thisNode.bind(
                    'mouseleave',
                    function()
                    {
                        Alph.$('text', Alph.$(this)).each(
                        function()
                        {
                            this.style.visibility = "hidden";
                        });
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
            if (this.getAttribute('class') == 'text')
            {
                // turn off highlighting when we leave
                thisNode.bind(
                    'mouseleave',
                    function()
                    {
                        Alph.Tree.highlight_word(this.ownerDocument, null);
                    }
                );
            }
        });

    }
    catch(e)
    {
        Alph.util.log(e);
    }


};

/**
 * Update a browser in the detached panel window with the current
 * state of that browser the real (attached) panel
 * @param {Object} a_panel_state the panel state object
 * @param {String} a_browser_id the id of the browser to update
 * @param {String} a_browser_index the index of the browser to update
 */
Alph.Tree.prototype.update_panel_window = function(a_panel_state,a_browser_id,a_browser_index)
{
    // make sure to update the detached window document too...
    if (this.panel_window != null && ! this.panel_window.closed)
    {
        var treeDoc = Alph.$("browser",this.panel_elem).get(0).contentDocument;
        try
        {
            var pw_bro =
                this.panel_window
                    .Alph.$("#" + this.panel_id + " browser#"+a_browser_id)
                    .get(0);
            if (pw_bro)
            {
                var window_doc = pw_bro.contentDocument;
                var panel_tree = Alph.$("#dependency-tree", treeDoc).get(0);
                var panel_error = Alph.$("#tree-error",treeDoc).html();
                Alph.$("#tree-error",window_doc).html(panel_error);
                Alph.$("#dependency-tree", window_doc).empty();
                Alph.$("#dependency-tree", window_doc)
                    .append(Alph.$(panel_tree).children().clone(true));
                Alph.$("#dependency-tree", window_doc)
                    .get(0).setAttribute("width",panel_tree.getAttribute("width"));
                Alph.$("#dependency-tree", window_doc)
                    .get(0).setAttribute("height",panel_tree.getAttribute("height"));

                // resize the panel window according to the dimensions of the svg diagram
                try
                {
                    var w = parseInt(panel_tree.getAttribute("width"));
                    var h = parseInt(panel_tree.getAttribute("height"));
                    this.resize_panel_window(w,h);
                }
                catch(a_e)
                {
                    Alph.util.log("Error parsing window size: " + a_e);
                }

                this.panel_window.focus();
            }
         } catch(a_e)
         {
            // if the window opens but isn't fully loaded yet, we may get
            // an error trying to retrieve the browser document using the Alph.$ call
         }
    }
};

/**
 * Recursively position elements of (sub-)tree
 *
 * @param a_container SVG group containing tree
 * @param {int} a_fontSize size of font in pixels
 * @return size of tree, center line of root element, and width of root node
 * @type Array
 */
Alph.Tree.position_tree = function(a_container, a_fontSize)
{
    // get various pieces of tree
    var rectNode = a_container.children("rect");
    var textNode = a_container.children("text:first");
    var arcLabelNodes = a_container.children("text");
    var arcLineNodes = a_container.children("line");
    var childNodes = a_container.children("g");

    // calculate size of tree
    var textHeight = (5 * a_fontSize) / 4;
    var childSeparation = a_fontSize;
    var textWidth = textNode.get(0).getComputedTextLength();
    textWidth += (textWidth > 0) ? a_fontSize : 0;
    var childStart = Array();
    var childCenter = Array();
    var childReturn = Array();
    var size = Array(0, 0);
    childNodes.each(
    function()
    {
        // get size, center, and root width of child
        var thisReturn = Alph.Tree.position_tree(Alph.$(this), a_fontSize);
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
        var width = label.getComputedTextLength();
        var xl = (2 * x2 + xCenter)/3;
        if (x2 <= xCenter)
        {
            xl -= (x2 == xCenter) ? 2 : 1;
            label.setAttribute("text-anchor", "end");
        }
        else
        {
            xl += 1;
            label.setAttribute("text-anchor", "start");
            if (xl + width > size[0])
                size[0] = xl + width;
        }
        var yl = (y1 + 2 * y2) / 3;
        label.setAttribute("x", xl);
        label.setAttribute("y", yl);

        // set up help text for arc label
        var dyl = 3 * a_fontSize / 4;
        Alph.$('text', Alph.$(label)).each(
        function()
        {
            this.setAttribute("text-anchor", "start");
            this.setAttribute("x", (x2 <= xCenter) ? xl - width : xl);
            if (this.getAttribute("class") == "arc-label-help-up")
                this.setAttribute("y", yl - dyl);
            else
                this.setAttribute("y", yl + dyl);
        });
    }

    // position text and rectangle
    textNode.each(
        function()
        {
            this.setAttribute("y", a_fontSize);
            this.setAttribute("x", xCenter);
        }
    );
    rectNode.each(
        function()
        {
            this.setAttribute("x", xCenter - textWidth / 2);
            this.setAttribute("y", 0);
            this.setAttribute("width", textWidth);
            this.setAttribute("height", textHeight);
        }
    )

    return Array(size, xCenter, textWidth);
};

/**
 * Position text words:
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
 * @param {int} a_fontSize size of font in pixels
 * @return size of text
 * @type Array
 */
Alph.Tree.position_text = function(a_doc, a_width, a_fontSize)
{
    // if no words, just return empty size
    var words = Alph.$("#dependency-tree", a_doc).children("g").next().children("text");
    var rects = Alph.$("#dependency-tree", a_doc).children("g").next().children("rect");
    if (words.size() == 0)
        return Array(0, 0);

    // 300 = minimum width allowed for text to avoid excessive wrapping
    var width = (a_width > 300) ? a_width : 300;
    var textHeight = (5 * a_fontSize) / 4;
    var x = 0;
    var y = textHeight;

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

    return Array(width, y + textHeight - a_fontSize);
};

/**
 * Position help elements:
 *
 * @param a_doc the document
 * @param {int} a_fontSize size of font in pixels
 * @return size of help
 * @type Array
 */
Alph.Tree.position_help = function(a_doc, a_fontSize)
{
    var trig = Alph.main.getLanguageTool().getpopuptrigger();
    var helpGroup;

    // find help
    Alph.$("#dependency-tree", a_doc).children("g").each(
    function()
    {
        if (this.getAttribute("class").split(' ')[0] == "help")
        {
            // for each help group
            Alph.$(this).children("g").each(
            function()
            {
                // if this is the one for the current trigger, remember it
                if (this.getAttribute("class") == ("help-" + trig))
                    helpGroup = Alph.$(this);
                // otherwise, hide it
                else
                    this.setAttribute("visibility", "hidden");
            });
        }
    });

    // find width of help text
    var texts = helpGroup.children("text");
    var width = 0;
    for (var i = 0; i < texts.size(); ++i)
    {
        var thisWidth = texts.get(i).getComputedTextLength();
        if (thisWidth > width)
            width = thisWidth;
    }

    // position entries
    var y = 0;
    var textHeight = (5 * a_fontSize) / 4;
    for (var i = 0; i < texts.size(); ++i)
    {
        // position text
        var thisText = texts.get(i);
        thisText.setAttribute("x", 0);
        thisText.setAttribute("y", y + a_fontSize);
        y += textHeight;
    }

    return Array(width + a_fontSize, y + a_fontSize);
};

/**
 * Position key elements:
 *
 * The keys and definitions are each arranged vertically.
 * The definitions are placed to the right of the keys.
 *
 * @param a_doc the document
 * @param {int} a_fontSize size of font in pixels
 * @return size of key
 * @type Array
 */
Alph.Tree.position_key = function(a_doc, a_fontSize)
{
    // find parts of key
    var keyGrp;
    var rects;
    var texts;
    var bound;
    Alph.$("#dependency-tree", a_doc).children("g").each(
    function()
    {
        var thisNode = Alph.$(this);
        if (this.getAttribute("class") == "key")
        {
            keyGrp = thisNode.children("g");
            rects = thisNode.children("g").children("rect");
            texts = thisNode.children("g").children("text");
            bound = thisNode.children("rect");
        }
    });

    // find width of keys
    var width = 0;
    for (var i = 0; i < texts.size(); ++i)
    {
        var thisWidth = texts.get(i).getComputedTextLength();
        if (thisWidth > width)
            width = thisWidth;
    }

    // position entries
    width += 2 * a_fontSize;
    var y = 0;
    var textHeight = (5 * a_fontSize) / 4;
    for (var i = 0; i < texts.size(); ++i)
    {
        // position highlighting rectangle
        var thisRect = rects.get(i);
        thisRect.setAttribute("x", 0);
        thisRect.setAttribute("y", y);
        thisRect.setAttribute("width", width);
        thisRect.setAttribute("height", textHeight);

        // position text
        var thisText = texts.get(i);
        thisText.setAttribute("x", a_fontSize);
        thisText.setAttribute("y", y + a_fontSize);
        y += textHeight;
    }
    width += 2 * a_fontSize;
    y += 2 * a_fontSize;

    // position group and set bounding box
    keyGrp.each(
        function()
        {
            this.setAttribute("transform",
                "translate(" + a_fontSize + "," + a_fontSize + ")");
        }
    );

    bound.each(
        function()
        {
            this.setAttribute("x", 0);
            this.setAttribute("y", 0);
            this.setAttribute("width", width);
            this.setAttribute("height", y);

        }
    );

    return Array(width, y);
};

/**
 * Position pieces
 *
 * @param a_doc the document
 * @param {Array} a_treeSize width and height of tree
 * @param {Array} a_textSize width and height of text
 * @param {Array} a_keySize width and height of key
 * @param {Array} a_helpSize width and height of help text
 * @param {int} a_fontSize size of font in pixels
 */
Alph.Tree.position_all =
function(a_doc, a_treeSize, a_textSize, a_keySize, a_helpSize, a_fontSize)
{
    Alph.$("#dependency-tree", a_doc).children("g").each(
    function()
    {
        var thisNode = Alph.$(this);
        var thisClass = this.getAttribute("class");
        if (thisClass)
            thisClass = thisClass.split(' ')[0];
        var thisTransform = "";
        if (thisClass == "help")
        {
            // position text at top left
            thisTransform = "translate(0)";
        }
        else if (thisClass == "text")
        {
            // position text at left, below help
            thisTransform = "translate(0," + a_helpSize[1] + ")";
        }
        else if (thisClass == "tree")
        {
            // position tree below text
            thisTransform =
                "translate(" + a_fontSize + "," +
                               (a_helpSize[1] + a_textSize[1]) + ")";
        }
        else if (thisClass == "key")
        {
            // position key below tree, slightly indented
            thisTransform =
                "translate(" + a_fontSize + "," +
                               (a_helpSize[1] +
                                a_textSize[1] +
                                a_treeSize[1]) + ")";
        }
        this.setAttribute("transform", thisTransform);
    });

    // set width and height
    var width = a_textSize[0];
    if (a_treeSize[0] > width)
        width = a_treeSize[0];
    if (a_keySize[0] > width)
        width = a_keySize[0];
    if (a_helpSize[0] > width)
        width = a_helpSize[0];
    var height = a_textSize[1] + a_treeSize[1] + a_keySize[1] + a_helpSize[1];
    Alph.$("#dependency-tree", a_doc).get(0).setAttribute("width", width);
    Alph.$("#dependency-tree", a_doc).get(0).setAttribute("height", height);
};

/**
 * Highlight a word in the tree:
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
Alph.Tree.highlight_word = function(a_doc, a_id)
{
    // find node of interest
    var focusNode = Alph.$("#" + a_id, a_doc);

    // if no id or bad id
    if (focusNode.size() == 0)
    {
        Alph.$("#dependency-tree", a_doc).children("g").each(
        function()
        {
            var thisNode = Alph.$(this);
            if (this.getAttribute("class") != "key")
            {
                // display everything normally
                thisNode.find("text").each(
                    function()
                    {
                        this.setAttribute("showme", "normal");
                    }
                );
                thisNode.find("line").each(
                    function()
                    {
                        this.setAttribute("showme", "normal");
                    }
                );
                thisNode.find("rect").each(
                    function()
                    {
                        this.setAttribute("showme", "normal");
                    }
                );
            }
        });
        return;
    }

    // gray everything out in tree
    Alph.$("#dependency-tree", a_doc).children("g").each(
    function()
    {
        var thisNode = Alph.$(this);
        var thisClass = this.getAttribute("class");
        if (thisClass == "tree")
        {
            thisNode.find("text").each(
                function()
                {
                    this.setAttribute("showme", "grayed");
                }
            );
        }
        if (thisClass != "key")
        {
            thisNode.find("line").each(
                function()
                {
                    this.setAttribute("showme", "grayed");
                }
            );

            thisNode.find("rect").each(
                function()
                {
                    this.setAttribute("showme", "grayed");
                }
            );
        }
    });

    // display this node and things connected to it with focus:
    //   text node itself and label on line to dependent words
    //   rectangle around node
    //   lines to dependent words
    focusNode.children("text").each(
        function()
        {
            this.setAttribute("showme", "focus-child");
        }
    );
    focusNode.children("text:first").each(
        function()
        {
            this.setAttribute("showme", "focus");
        }
    );
    focusNode.children("rect").each(
        function()
        {
            this.setAttribute("showme", "focus");
        }
    );
    focusNode.children("line").each(
        function()
        {
            this.setAttribute("showme", "focus-child");
        }
    );
    //   descendant words at all levels
    //   line to descendant words
    var descendants = focusNode.find("g");
    descendants.children("rect").each(
        function(){
            this.setAttribute("showme", "focus-descendant");
        }
    );
    descendants.children("line").each(
        function()
        {
            this.setAttribute("showme", "focus-descendant");
        }
    )
    descendants.children("text").each(
    function()
    {
        if (this.getAttribute("class") == "node-label")
            this.setAttribute("showme", "focus-descendant");
    });
    //   dependent words (immediate children)
    //   (do this after descendants since these are subset of descendants)
    var children = focusNode.children("g");
    children.children("rect").each(
        function()
        {
            this.setAttribute("showme", "focus-child");
        }
    );
    children.children("text").each(
    function()
    {
        if (this.getAttribute("class") == "node-label")
            this.setAttribute("showme", "focus-child");
    });
    //   label on parent word
    //   line and label from parent word
    if (focusNode.parent().get(0).getAttribute("class") == "tree-node")
    {
        focusNode.parent().children("text:first").each(
            function()
            {
                this.setAttribute("showme", "focus-parent");
            }
        );

        focusNode.parent().children("rect").each(
            function() { this.setAttribute("showme", "focus-parent"); }
        );
        focusNode.parent().children().each(
        function()
        {
            if (this.getAttribute("idref") == a_id)
                this.setAttribute("showme", "focus-parent");
        });
    }

    // set highlights on text words
    Alph.Tree.highlight_text_word(a_doc, a_id, "focus");
    Alph.Tree.highlight_text_word(a_doc,
                                  focusNode.parent().get(0).getAttribute("id"),
                                  "focus-parent");
    descendants.each(
    function()
    {
        Alph.Tree.highlight_text_word(a_doc,
                                      this.getAttribute("id"),
                                      "focus-descendant");
    });
    children.each(
    function()
    {
        Alph.Tree.highlight_text_word(a_doc,
                                      this.getAttribute("id"),
                                      "focus-child");
    });
};

/**
 * Highlight a text word below the tree
 * @param a_doc the document
 * @param {String} a_id id of word (tbref attribute on text word)
 * @param {String} a_focus value to set showme attribute to
 */
Alph.Tree.highlight_text_word = function(a_doc, a_id, a_focus)
{
    Alph.$("rect", a_doc).each(
    function()
    {
        if (this.getAttribute('tbref') == a_id)
        {
            this.setAttribute("showme", a_focus);
        }
    });
};

/**
 * Highlight initial word in the tree
 *
 * @param a_doc the document
 * @param {String} a_id id of word in tree
 */
Alph.Tree.highlight_first = function(a_doc, a_id)
{
    // find node of interest
    var focusNode = Alph.$("#" + a_id, a_doc);

    // if no id or bad id
    if (focusNode.size() == 0)
        return;

    // set attribute in tree
    focusNode.children("text:first").each(
        function() { this.setAttribute("first", "yes"); });
    focusNode.children("rect").each(
        function() { this.setAttribute("first", "yes"); });

    // set attribute in text
    Alph.$("rect", a_doc).each(
    function()
    {
        if (this.getAttribute('tbref') == a_id)
            this.setAttribute("first", "yes");
    });
};

Alph.Tree.pre_open_check = function()
{
    if (! Alph.xlate.popupVisible() && ! Alph.interactive.query_visible())
    {
        var trigger = Alph.main.getXlateTrigger(Alph.main.getCurrentBrowser());
        var hint_prop = 'alph-tree-trigger-hint-'+ trigger;
        var lang_tool = Alph.main.getLanguageTool();
        var lang = lang_tool.get_language_string();
        var hint = lang_tool.get_string_or_default(hint_prop,[lang]);
        alert(hint);
        return false;
    }
    else
    {
        Alph.main.panels['alph-tree-panel'].open()
    }
};
