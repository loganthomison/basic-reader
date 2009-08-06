/**
 * @fileoverview Factory class to hold and instantiate LanguageTool objects 
 * for the installed Alpheios language extensions
 *  
 * @version $Id: alpheios-languages.js 1623 2009-06-19 20:21:53Z BridgetAlmas $
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
 * This module exports a single symbol, LanguageToolFactory
 * This object should be imported into the namespace of the importing class
 */
var EXPORTED_SYMBOLS = ["LanguageToolFactory"];

Components.utils.import('resource://alpheios/alpheios-moz-utils.jsm');
Components.utils.import('resource://alpheios/ext/StringBundle.jsm');

/**
 * @singleton
 * 
 * The LanguageToolFactory object holds
 * the list of supported Alpheios languages and the corresponding Language Tool object class 
 * for each
 */
LanguageToolFactory = 
{
    /**
     * @private list of available languages
     */
    lang_list: [],
    
    /**
     * get the list of available languages
     * @return the list 
     * @type Array
     */
    get_lang_list: function()
    {
        return this.lang_list;
    },
    
    
    /**
     * add a supported language to the container
     * @param {String} a_lang the language name key
     * @param {String} a_class the name of the class to instantiate for this language
     *                  if not supplied, the base LanguageTool class will be used
     */
    add_lang: function(a_lang,a_class)
    {
        if (typeof this[a_lang] == "undefined")
        {
            this.lang_list.push(a_lang);
            if (typeof a_class == "undefined")
            {
                a_class = null;
            }
            this[a_lang] = a_class;
        }   
    },
    
    /**
     * create an instance of the language tool object for
     * the requested language
     * @param {String} a_lang the language key
     * @param {Object} a_scope the object to which the language tool is scoped
     * @return the Language Tool object
     */
    create_instance: function(a_lang,a_scope)
    { 
        if (this[a_lang] == null)
        {
            return new a_scope['LanguageTool'](a_lang);
        }
        else
        {
           return new a_scope[this[a_lang]](a_lang);
        }
    },
    
    /**
     * get the StringBundle for a language
     * @param {String} a_lang the language key
     * @return {StringBundle} a StringBundle object
     */
    get_stringbundle: function(a_lang)
    {
        var chromepkg = MozUtils.getPref("chromepkg",a_lang);
        return new StringBundle("chrome://" + chromepkg + "/locale/alpheios-"+a_lang+'.properties');
    }
};
