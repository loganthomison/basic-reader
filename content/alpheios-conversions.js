/**
 * @fileoverview conversion utility functions are encaspulated in the Alph.convert object
 * namespace. 
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
 
// Make sure the Alph namespace is defined
if (typeof Alph == "undefined") {
    Alph = {};
}

/**
 * @singleton
 */
Alph.convert = {
  
    /**
     * An XSLT Processor for unicode to betacode conversion
     * @private
     * @type XSLTProcessor
     */
    u2bConverter: null,

    /**
     * An XSLT Processor for unicode normalization
     * @private
     * @type XSLTProcessor
     */
    uNormalizer: null,

    /**
     * @type nsIScriptableUnicodeConverter
     */
    unicode_conv: 
        Components.classes['@mozilla.org/intl/scriptableunicodeconverter']
        .getService(Components.interfaces.nsIScriptableUnicodeConverter),
        
    /**
     * latin ascii transliteration 
     * @param {String} a_str the string to convert
     * @return the converted string
     * @type {String}
     */
    latin_to_ascii: function(a_str)
    {
        // upper case A
        a_str = a_str.replace(/[\u00c0-\u00c5\u0100\u0102\u0104]/g, 'A');
        
        // lower case a
        a_str = a_str.replace(/[\u00e0-\u00e5\u0101\u0103\u0105]/g, 'a');
        
        // upper case AE
        a_str = a_str.replace(/\u00c6/g,'AE');
        
        // lowercase ae
        a_str = a_str.replace(/\u00e6/g,'AE');
        
        // upper case E
        a_str = a_str.replace(/[\u00c8-\u00cb\u0112\u0114\u0116\u0118\u011a]/g, 'E');
        
        // lower case e
        a_str = a_str.replace(/[\u00e8-\u00eb\u0113\u0115\u0117\u0119\u011b]/g, 'e');
        
        // upper case I
        a_str = a_str.replace(/[\u00cc-\u00cf\u0128\u012a\u012c\u012e\u0130]/g, 'I');
        
        // lower case i
        a_str = a_str.replace(/[\u00ec-\u00ef\u0129\u012b\u012d\u012f\u0131]/g, 'i');
        
        // upper case O
        a_str = a_str.replace(/[\u00d2-\u00d6\u014c\u014e\u0150]/g, 'O');
        
        // lower case o
        a_str = a_str.replace(/[\u00f2-\u00f6\u014d\u014f\u0151]/g, 'o');
        
        // upper case OE
        a_str = a_str.replace(/\u0152/g,'OE');
        
        // lower case oe
        a_str = a_str.replace(/\u0153/g,'oe');
        
        // upper case U
        a_str = a_str.replace(
            /[\u00d9-\u00dc\u0168\u016a\u016c\u016e\u0170\u0172]/g, 
            'U');
        
        // lower case u
        a_str = a_str.replace(
            /[\u00f9-\u00fc\u0169\u016b\u016d\u016f\u0171\u0173]/g, 
            'u');
            
        // for now, just remove anyting else that's not ASCII  
        // TODO - implement full transliteration
        this.unicode_conv.charset = 'US-ASCII';
        a_str = this.unicode_conv.ConvertFromUnicode(a_str);
        
        // just delete the '?' in the resulting conversion
        a_str.replace(/\?/,'');
        
        return a_str;
    },

    /**
     * greek ascii transliteration (unicode to betacode)
     * @param {String} a_str the string to convert
     * @return the converted string
     * @type {String}
     */
    greek_to_ascii: function(a_str)
    {
        /* initialize the XSLT converter if we haven't done so already */
        if (this.u2bConverter == null)
        {
            var xmlDoc = document.implementation.createDocument("", "", null);
            xmlDoc.async = false;
            xmlDoc.load("chrome://alpheios/skin/alpheios-uni2betacode.xsl");
            this.u2bConverter = new XSLTProcessor();
            this.u2bConverter.importStylesheet(xmlDoc);
        }
        var betaText = '';
        try
        {
            this.u2bConverter.setParameter(null, "input", a_str);
            var dummy = (new DOMParser()).parseFromString("<root/>","text/xml");
            betaText = this.u2bConverter.transformToDocument(dummy).documentElement.textContent;
        }
        catch (e)
        {
            Alph.util.log(e);
        }
        return betaText;
    },

    /**
     * greek normalization (precomposed/decomposed Unicode)
     * @param {String} a_str the string to normalize
     * @param {Boolean} a_precomposed whether to output precomposed Unicode
     *   (default = true)
     * @param {String} a_strip characters/attributes to remove
     *   (specified as betacode characters - e.g. "/\\=" to remove accents)
     *   (default = no stripping)
     * @param {Boolean} a_partial whether this is partial word
     *   (if true, ending sigma is treated as medial not final)
     *   (default = false)
     * @return the normalized string
     * @type {String}
     */
    normalize_greek: function(a_str, a_precomposed, a_strip, a_partial)
    {
        /* initialize the XSLT converter if we haven't done so already */
        if (this.uNormalizer == null)
        {
            var xmlDoc = document.implementation.createDocument("", "", null);
            xmlDoc.async = false;
            xmlDoc.load("chrome://alpheios/skin/alpheios-normalize-greek.xsl");
            this.uNormalizer = new XSLTProcessor();
            this.uNormalizer.importStylesheet(xmlDoc);
        }

        // set defaults for missing params
        if (typeof a_precomposed == "undefined")
            a_precomposed = true;
        if (typeof a_strip == "undefined")
            a_strip = "";
        if (typeof a_partial == "undefined")
            a_partial = false;

        var normText = '';
        try
        {
            this.uNormalizer.setParameter(null, "input", a_str);
            this.uNormalizer.setParameter(null, "precomposed", (a_precomposed ? 1 : 0));
            this.uNormalizer.setParameter(null, "strip", a_strip);
            this.uNormalizer.setParameter(null, "partial", (a_partial ? 1 : 0));
            var dummy = (new DOMParser()).parseFromString("<root/>","text/xml");
            normText = this.uNormalizer.transformToDocument(dummy).documentElement.textContent;
        }
        catch (e)
        {
            Alph.util.log(e);
        }
        return normText;
    }
};
