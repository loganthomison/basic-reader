/**
 * @fileoverview Defines the language containers for the alpheios extension.
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
 * 
 * The Alph.Languages object holds
 * the instantiated instances of the {@link Alph.LanguageTool}
 * objects for each supported language.
 * It is populated by {@link Alph.main#set_languages}
 */
Alph.Languages = 
{
    d_langList: [],
    
    getLangTool: function(a_lang)
    {
        return this[a_lang];
    },
    
    hasLang: function(a_lang)
    {        
        if (typeof this[a_lang] == "undefined")
        {
            return false;
        }
        else
        {
            return true;
        }
    },
    
    getLangList: function()
    {
        return this.d_langList;
    },
    
    addLangTool: function(a_lang,a_lang_tool)
    {
        if (typeof this[a_lang] == "undefined")
        {
            this[a_lang] = a_lang_tool;
            this.d_langList.push(a_lang);
        }
    },
    
    /**
     * Get the key in to the Languages object for the supplied language_code
     * @param {String} a_code the language code
     * @return the key in to the Languages object for this code, or '' if none found 
     */
    mapLanguage: function(a_code)
    {
        var lang_key = '';
        for (var i=0; i<this.d_langList.length;i++)
        {
            var lang_tool = this.getLangTool(this.d_langList[i]);
            if (a_code == this.d_langList[i] ||
                lang_tool.supportsLanguage(a_code)
            )
            {
                lang_key = this.d_langList[i];
                break;
            }
        }
        return lang_key;
    }
};