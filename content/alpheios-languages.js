/**
 * @fileoverview Defines the language containers for the alpheios extension.
 *
 * @version $Id$
 * 
 * Copyright 2008 Cantus Foundation
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
    lang_list: [],
    
    get_lang_tool: function(a_lang)
    {
        return this[a_lang];
    },
    
    has_lang: function(a_lang)
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
    
    get_lang_list: function()
    {
        return this.lang_list;
    },
    
    add_lang_tool: function(a_lang,a_lang_tool)
    {
        if (typeof this[a_lang] == "undefined")
        {
            this[a_lang] = a_lang_tool;
            this.lang_list.push(a_lang);
        }
    }
};

/**
 * @singleton
 * 
 * The Alph.LanguageToolSet object holds
 * language-specific prototypes derived from the 
 * base {@link Alph.LanguageTool} class.
 * It is populated by code in the external  
 * language-specific extensions, which are dependent upon Alpheios
 */
Alph.LanguageToolSet = {};
